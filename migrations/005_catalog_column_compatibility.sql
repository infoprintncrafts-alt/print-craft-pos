-- Compatibility columns for catalog pages created before the current UI schema.
ALTER TABLE IF EXISTS categories ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS notes text;
