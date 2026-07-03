-- Create RPC function to check email availability in auth.users
CREATE OR REPLACE FUNCTION public.is_email_available(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF email_to_check IS NULL OR TRIM(email_to_check) = '' THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(TRIM(email_to_check))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- Grant permissions to public RPC
GRANT EXECUTE ON FUNCTION public.is_email_available(TEXT) TO anon, authenticated;
