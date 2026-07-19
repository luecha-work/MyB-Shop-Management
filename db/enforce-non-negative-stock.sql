-- Repair existing negative stock values, then enforce non-negative stock constraints.
-- Run with the intended search_path, e.g. DATABASE_SCHEMA=mybshop in production
-- or public locally.

UPDATE products
SET
  current_stock = GREATEST(current_stock, 0),
  stock_in = GREATEST(stock_in, 0),
  stock_out = GREATEST(stock_out, 0),
  number_of_times_received = GREATEST(number_of_times_received, 0),
  updated_at = CURRENT_TIMESTAMP
WHERE current_stock < 0
   OR stock_in < 0
   OR stock_out < 0
   OR number_of_times_received < 0;

UPDATE stock_in
SET quantity = GREATEST(quantity, 0)
WHERE quantity < 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_current_stock_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_current_stock_non_negative CHECK (current_stock >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_stock_in_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_stock_in_non_negative CHECK (stock_in >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_stock_out_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_stock_out_non_negative CHECK (stock_out >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_number_of_times_received_non_negative'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_number_of_times_received_non_negative CHECK (number_of_times_received >= 0);
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
