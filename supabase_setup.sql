  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    ui_mode TEXT NOT NULL DEFAULT 'standard' CHECK (ui_mode IN ('standard', 'easy')),
    monthly_budget NUMERIC NOT NULL DEFAULT 30000,
    report_timezone TEXT NOT NULL DEFAULT 'UTC',
    reports_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Create case-insensitive unique index on username
  CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (LOWER(username));

  -- 2. Create groups table
  CREATE TABLE IF NOT EXISTS public.groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 3. Create group_members table
  CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
  );

  -- 4. Create transactions table
  CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    vendor TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    source TEXT NOT NULL DEFAULT 'Cash' CHECK (source IN ('UPI', 'CC', 'Cash', 'Bank')),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL
  );

  -- 5. Create subscriptions table
  CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    cost NUMERIC NOT NULL,
    next_billing_date DATE NOT NULL,
    trial_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 6. Create report_threads table
  CREATE TABLE IF NOT EXISTS public.report_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    thread_message_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month_start)
  );

  -- 7. Create report_runs table
  CREATE TABLE IF NOT EXISTS public.report_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    message_id TEXT NOT NULL,
    thread_message_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, report_type, period_start, period_end)
  );

  -- Helper function: check group membership
  CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
  RETURNS BOOLEAN AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid()
    );
  $$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

  -- Helper function: check if username is available
  CREATE OR REPLACE FUNCTION public.is_username_available(username_to_check TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    IF username_to_check IS NULL OR TRIM(username_to_check) = '' THEN
      RETURN FALSE;
    END IF;
    
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(username_to_check)
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  -- Grant execution permissions
  GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;

  -- Helper function: check if email is available
  CREATE OR REPLACE FUNCTION public.is_email_available(email_to_check TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    IF email_to_check IS NULL OR TRIM(email_to_check) = '' THEN
      RETURN FALSE;
    END IF;
    
    RETURN NOT EXISTS (
      SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(email_to_check)
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

  -- Grant execution permissions
  GRANT EXECUTE ON FUNCTION public.is_email_available(TEXT) TO anon, authenticated;

  -- Auto-create profile on signup
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, display_name, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      NEW.raw_user_meta_data->>'username'
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  -- Drop trigger if it already exists before creating it
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- Updated_at trigger
  CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = public;

  -- Drop profiles trigger if it exists
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Drop report_threads trigger if it exists
  DROP TRIGGER IF EXISTS update_report_threads_updated_at ON public.report_threads;
  CREATE TRIGGER update_report_threads_updated_at
    BEFORE UPDATE ON public.report_threads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Enable RLS on all tables
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.report_threads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies to avoid conflicts
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

  DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

  DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
  DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;

  DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
  DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
  DROP POLICY IF EXISTS "Owners can delete groups" ON public.groups;

  DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
  DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
  DROP POLICY IF EXISTS "Users can update own balance" ON public.group_members;
  DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

  DROP POLICY IF EXISTS "Users can view own report threads" ON public.report_threads;
  DROP POLICY IF EXISTS "Users can view own report runs" ON public.report_runs;

  -- Profiles policies
  CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

  -- Transactions policies
  CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid() OR public.is_group_member(group_id));
  CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (user_id = auth.uid());

  -- Subscriptions policies
  CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (user_id = auth.uid());

  -- Groups policies
  CREATE POLICY "Members can view groups" ON public.groups FOR SELECT USING (public.is_group_member(id));
  CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (created_by = auth.uid());
  CREATE POLICY "Owners can delete groups" ON public.groups FOR DELETE USING (created_by = auth.uid());

  -- Group members policies
  CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT USING (public.is_group_member(group_id));
  CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Users can update own balance" ON public.group_members FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (user_id = auth.uid());

  -- Report threads policies
  CREATE POLICY "Users can view own report threads" ON public.report_threads FOR SELECT USING (auth.uid() = user_id);

  -- Report runs policies
  CREATE POLICY "Users can view own report runs" ON public.report_runs FOR SELECT USING (auth.uid() = user_id);

  -- Retroactively insert profiles for any existing users in auth.users
  INSERT INTO public.profiles (id, display_name)
  SELECT id, COALESCE(raw_user_meta_data->>'display_name', email)
  FROM auth.users
  ON CONFLICT (id) DO NOTHING;
