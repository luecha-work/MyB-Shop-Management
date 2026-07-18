WITH max_code AS (
  SELECT COALESCE(MAX(product_code::int) FILTER (WHERE product_code ~ '^[0-9]+$'), 0) AS value
  FROM products
),
missing_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) AS offset_value
  FROM products
  WHERE product_code IS NULL OR BTRIM(product_code) = ''
)
UPDATE products AS p
SET product_code = (max_code.value + missing_products.offset_value)::text,
    updated_at = CURRENT_TIMESTAMP
FROM missing_products, max_code
WHERE p.id = missing_products.id;
