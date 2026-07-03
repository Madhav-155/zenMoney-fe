-- Reporting preferences on profile
ALTER TABLE public.profiles
  ADD COLUMN report_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN reports_enabled BOOLEAN NOT NULL DEFAULT true;

-- Track per-month email thread root
CREATE TABLE public.report_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  thread_message_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_start)
);

-- Track sent reports to prevent duplicates
CREATE TABLE public.report_runs (
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

-- Updated_at trigger for report_threads
CREATE TRIGGER update_report_threads_updated_at
  BEFORE UPDATE ON public.report_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.report_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

-- Policies (read-only for owners in client; service role bypasses RLS)
CREATE POLICY "Users can view own report threads"
  ON public.report_threads FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own report runs"
  ON public.report_runs FOR SELECT USING (auth.uid() = user_id);
