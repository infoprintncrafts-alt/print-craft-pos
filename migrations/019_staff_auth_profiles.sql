-- Run once in Supabase SQL Editor. The app links each staff account on its
-- first login when the Authentication email matches the staff email.
ALTER TABLE public.staff
ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.staff AS staff_record
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE lower(staff_record.email) = lower(auth_user.email)
  AND staff_record.auth_user_id IS NULL;
