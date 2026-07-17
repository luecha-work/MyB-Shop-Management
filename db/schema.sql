CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_name, description) VALUES
('owner', 'Business owner with full access to all branches'),
('admin', 'Administrator with management access to all branches'),
('staff', 'Staff user with access only to assigned branch')
ON CONFLICT (role_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cash_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    grab_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    line_man_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    current_stock INT NOT NULL DEFAULT 0,
    stock_in INT NOT NULL DEFAULT 0,
    stock_out INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    status VARCHAR(50),
    number_of_times_received INT NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_cost_check CHECK (cost >= 0),
    CONSTRAINT products_cash_price_check CHECK (cash_price >= 0),
    CONSTRAINT products_grab_price_check CHECK (grab_price >= 0),
    CONSTRAINT products_line_man_price_check CHECK (line_man_price >= 0),
    CONSTRAINT products_current_stock_check CHECK (current_stock >= 0),
    CONSTRAINT products_stock_in_check CHECK (stock_in >= 0),
    CONSTRAINT products_stock_out_check CHECK (stock_out >= 0),
    CONSTRAINT products_min_stock_check CHECK (min_stock >= 0)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
UPDATE users
SET password_hash = crypt('ChangeMe123!', gen_salt('bf'))
WHERE password_hash IS NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    order_id VARCHAR(50) NOT NULL,
    order_datetime TIMESTAMP NOT NULL,
    product_id UUID REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
    product_name VARCHAR(255),
    qty INT NOT NULL DEFAULT 0,
    channel VARCHAR(50),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gp_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    gp_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_profit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_qty_check CHECK (qty >= 0),
    CONSTRAINT sales_unit_price_check CHECK (unit_price >= 0),
    CONSTRAINT sales_gp_percent_check CHECK (gp_percent >= 0),
    CONSTRAINT sales_gp_amount_check CHECK (gp_amount >= 0),
    CONSTRAINT sales_net_revenue_check CHECK (net_revenue >= 0),
    CONSTRAINT sales_unit_cost_check CHECK (unit_cost >= 0),
    CONSTRAINT sales_total_cost_check CHECK (total_cost >= 0),
    CONSTRAINT sales_total_sales_check CHECK (total_sales >= 0)
);

CREATE TABLE IF NOT EXISTS stock_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    transaction_timestamp TIMESTAMP NOT NULL,
    product_id UUID REFERENCES products(id) ON UPDATE CASCADE ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity INT NOT NULL DEFAULT 0,
    restock VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_in_quantity_check CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles(role_name);
CREATE INDEX IF NOT EXISTS idx_branches_branch_code ON branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_product_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_datetime ON sales(order_datetime);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales(channel);
CREATE INDEX IF NOT EXISTS idx_stock_in_branch_id ON stock_in(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_transaction_timestamp ON stock_in(transaction_timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_in_product_id ON stock_in(product_id);
