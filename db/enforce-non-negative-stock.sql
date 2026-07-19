-- Repair existing negative stock values, then enforce non-negative stock constraints.
-- Run with the intended search_path, e.g. DATABASE_SCHEMA=mybshop in production
-- or public locally.

UPDATE products
SET
  total_current_stock = GREATEST(total_current_stock, 0),
  total_stock_in = GREATEST(total_stock_in, 0),
  total_stock_out = GREATEST(total_stock_out, 0),
  total_number_of_times_received = GREATEST(total_number_of_times_received, 0),
  default_min_stock = GREATEST(default_min_stock, 0),
  updated_at = CURRENT_TIMESTAMP
WHERE total_current_stock < 0
   OR total_stock_in < 0
   OR total_stock_out < 0
   OR total_number_of_times_received < 0
   OR default_min_stock < 0;

UPDATE stock_in
SET quantity = GREATEST(quantity, 0)
WHERE quantity < 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_total_current_stock_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_total_current_stock_non_negative CHECK (total_current_stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_total_stock_in_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_total_stock_in_non_negative CHECK (total_stock_in >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_total_stock_out_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_total_stock_out_non_negative CHECK (total_stock_out >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_total_number_of_times_received_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_total_number_of_times_received_non_negative CHECK (total_number_of_times_received >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_default_min_stock_check'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_default_min_stock_check CHECK (default_min_stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_in_quantity_non_negative'
      AND conrelid = 'stock_in'::regclass
  ) THEN
    ALTER TABLE stock_in
      ADD CONSTRAINT stock_in_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END $$;
