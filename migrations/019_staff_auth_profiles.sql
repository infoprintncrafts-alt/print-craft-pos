-- Link POS staff profiles to Supabase Auth users. Create each login under
-- Supabase Dashboard > Authentication > Users; the trigger links it by email.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.link_staff_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.staff
  SET auth_user_id = NEW.id,
      updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND auth_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_staff_auth_user_after_signup ON auth.users;
CREATE TRIGGER link_staff_auth_user_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_staff_auth_user();

UPDATE staff s SET auth_user_id = u.id
FROM auth.users u
WHERE lower(s.email) = lower(u.email) AND s.auth_user_id IS NULL;
