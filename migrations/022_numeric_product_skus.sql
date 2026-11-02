-- Convert product SKUs to unique numeric codes and assign future codes in the
-- database so concurrent product creation cannot generate the same SKU.

BEGIN;

LOCK TABLE public.products IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE IF NOT EXISTS public.products_sku_seq
  AS bigint
  START WITH 100001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Keep existing numeric SKUs where possible. Replace missing, non-numeric,
-- overlong, or duplicate values with numbers above the current numeric range.
SELECT setval(
  'public.products_sku_seq',
  GREATEST(COALESCE(MAX(sku::bigint), 100000), 100000),
  true
)
FROM public.products
WHERE sku ~ '^[0-9]{1,18}$';

WITH duplicate_skus AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at, id) AS position
  FROM public.products
  WHERE sku ~ '^[0-9]{1,18}$'
)
UPDATE public.products AS product
SET sku = nextval('public.products_sku_seq')::text
FROM duplicate_skus
WHERE duplicate_skus.id = product.id
  AND duplicate_skus.position > 1;

UPDATE public.products
SET sku = nextval('public.products_sku_seq')::text
WHERE sku IS NULL OR sku !~ '^[0-9]{1,18}$';

UPDATE public.products
SET product_code = sku
WHERE product_code IS DISTINCT FROM sku;

ALTER TABLE public.products
  ALTER COLUMN sku SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
  ON public.products (sku);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sku_numeric_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_sku_numeric_check
  CHECK (sku ~ '^[0-9]+$');

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_code_numeric_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_product_code_numeric_check
  CHECK (product_code IS NULL OR product_code ~ '^[0-9]+$');

CREATE OR REPLACE FUNCTION public.assign_numeric_product_sku()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.sku := nextval('public.products_sku_seq')::text;
    NEW.product_code := NEW.sku;
    RETURN NEW;
  END IF;

  IF NEW.sku IS DISTINCT FROM OLD.sku
     OR NEW.product_code IS DISTINCT FROM OLD.product_code THEN
    RAISE EXCEPTION 'SKU / Product Code is generated automatically and cannot be changed';
  END IF;

  NEW.product_code := NEW.sku;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS products_assign_numeric_sku ON public.products;
CREATE TRIGGER products_assign_numeric_sku
  BEFORE INSERT OR UPDATE OF sku, product_code
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_numeric_product_sku();

COMMIT;
