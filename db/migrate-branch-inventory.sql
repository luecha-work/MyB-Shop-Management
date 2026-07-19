-- Migration: Create branch_inventory table and move existing stock data
-- Run with: psql "$DATABASE_URL" -f db/migrate-branch-inventory.sql
-- IMPORTANT: Backup the database before running this script.

BEGIN;

-- 1. Create the branch_inventory table (idempotent)
CREATE TABLE IF NOT EXISTS public.branch_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    current_stock int4 DEFAULT 0 NOT NULL,
    stock_in int4 DEFAULT 0 NOT NULL,
    stock_out int4 DEFAULT 0 NOT NULL,
    number_of_times_received int4 DEFAULT 0 NOT NULL,
    min_stock int4 DEFAULT 0 NOT NULL,
    status varchar(50) DEFAULT 'Out of Stock' NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT branch_inventory_pkey PRIMARY KEY (id),
    CONSTRAINT branch_inventory_product_branch_unique UNIQUE (product_id, branch_id),
    CONSTRAINT branch_inventory_current_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT branch_inventory_stock_in_non_negative CHECK (stock_in >= 0),
    CONSTRAINT branch_inventory_stock_out_non_negative CHECK (stock_out >= 0),
    CONSTRAINT branch_inventory_number_of_times_received_non_negative CHECK (number_of_times_received >= 0),
    CONSTRAINT branch_inventory_min_stock_non_negative CHECK (min_stock >= 0),
    CONSTRAINT branch_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT branch_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_product_id ON public.branch_inventory USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch_id ON public.branch_inventory USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_product_branch ON public.branch_inventory USING btree (product_id, branch_id);

-- 2. Get the first active branch to assign existing stock to
DO $$
DECLARE
    default_branch_id uuid;
BEGIN
    SELECT id INTO default_branch_id FROM public.branches WHERE status = 'active' ORDER BY created_at ASC LIMIT 1;

    -- If no branches exist at all, we can't assign stock — skip migration data step
    IF default_branch_id IS NULL THEN
        RAISE NOTICE 'No active branches found — skipping stock data migration. Create a branch first, then re-run this script.';
        RETURN;
    END IF;

    -- 3. Move existing stock from products to branch_inventory for the default branch
    INSERT INTO public.branch_inventory (product_id, branch_id, current_stock, stock_in, stock_out, number_of_times_received, min_stock, status)
    SELECT
        p.id,
        default_branch_id,
        p.total_current_stock,
        p.total_stock_in,
        p.total_stock_out,
        p.total_number_of_times_received,
        p.default_min_stock,
        p.aggregate_status
    FROM public.products p
    ON CONFLICT (product_id, branch_id) DO NOTHING;

    -- 4. For every other active branch, create empty branch_inventory rows for all products
    INSERT INTO public.branch_inventory (product_id, branch_id, current_stock, stock_in, stock_out, number_of_times_received, min_stock, status)
    SELECT
        p.id,
        b.id,
        0, 0, 0, 0,
        p.default_min_stock,
        'Out of Stock'
    FROM public.products p
    CROSS JOIN public.branches b
    WHERE b.status = 'active'
      AND b.id != default_branch_id
      AND NOT EXISTS (
          SELECT 1 FROM public.branch_inventory bi
          WHERE bi.product_id = p.id AND bi.branch_id = b.id
      );

    RAISE NOTICE 'Migration complete. Default branch: %, products migrated: check row counts below.', default_branch_id;
END $$;

-- 5. Verify data integrity
SELECT
    'products' AS source,
    COUNT(*) AS row_count,
    SUM(total_current_stock) AS total_stock
FROM public.products
UNION ALL
SELECT
    'branch_inventory' AS source,
    COUNT(*) AS row_count,
    SUM(current_stock) AS total_stock
FROM public.branch_inventory;

COMMIT;
