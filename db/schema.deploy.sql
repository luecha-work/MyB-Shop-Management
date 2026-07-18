CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS mybshop;
SET search_path TO mybshop, public;

CREATE TABLE IF NOT EXISTS branches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  branch_code varchar(50) NOT NULL,
  branch_name varchar(255) NOT NULL,
  address text NULL,
  phone varchar(50) NULL,
  status varchar(50) DEFAULT 'active'::varchar NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT branches_pkey PRIMARY KEY (id),
  CONSTRAINT branches_branch_code_key UNIQUE (branch_code)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_code varchar(50) NULL,
  product_name varchar(255) NOT NULL,
  cost numeric(10, 2) DEFAULT 0 NOT NULL,
  cash_price numeric(10, 2) DEFAULT 0 NOT NULL,
  grab_price numeric(10, 2) DEFAULT 0 NOT NULL,
  line_man_price numeric(10, 2) DEFAULT 0 NOT NULL,
  current_stock int4 DEFAULT 0 NOT NULL,
  stock_in int4 DEFAULT 0 NOT NULL,
  stock_out int4 DEFAULT 0 NOT NULL,
  min_stock int4 DEFAULT 0 NOT NULL,
  status varchar(50) NULL,
  number_of_times_received int4 DEFAULT 0 NOT NULL,
  image_url text NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_product_code_key UNIQUE (product_code),
  CONSTRAINT products_cost_check CHECK (cost >= 0),
  CONSTRAINT products_cash_price_check CHECK (cash_price >= 0),
  CONSTRAINT products_grab_price_check CHECK (grab_price >= 0),
  CONSTRAINT products_line_man_price_check CHECK (line_man_price >= 0),
  CONSTRAINT products_min_stock_check CHECK (min_stock >= 0)
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  role_name varchar(50) NOT NULL,
  description text NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT roles_pkey PRIMARY KEY (id),
  CONSTRAINT roles_role_name_key UNIQUE (role_name)
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  branch_id uuid NULL,
  order_id varchar(50) NOT NULL,
  order_datetime timestamp NOT NULL,
  product_id uuid NULL,
  qty int4 DEFAULT 0 NOT NULL,
  channel varchar(50) NULL,
  unit_price numeric(10, 2) DEFAULT 0 NOT NULL,
  gp_percent numeric(5, 2) DEFAULT 0 NOT NULL,
  gp_amount numeric(10, 2) DEFAULT 0 NOT NULL,
  net_revenue numeric(10, 2) DEFAULT 0 NOT NULL,
  unit_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  total_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  total_sales numeric(10, 2) DEFAULT 0 NOT NULL,
  net_profit numeric(10, 2) DEFAULT 0 NOT NULL,
  note text NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
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
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  branch_id uuid NULL,
  transaction_timestamp timestamp NOT NULL,
  product_id uuid NULL,
  quantity int4 DEFAULT 0 NOT NULL,
  restock varchar(100) NULL,
  note text NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT stock_in_pkey PRIMARY KEY (id),
  CONSTRAINT stock_in_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT stock_in_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  role_id uuid NOT NULL,
  branch_id uuid NULL,
  status varchar(50) DEFAULT 'active'::varchar NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  password_hash varchar NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branches_branch_code ON branches USING btree (branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches USING btree (status);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products USING btree (product_code);
CREATE INDEX IF NOT EXISTS idx_products_product_name ON products USING btree (product_name);
CREATE INDEX IF NOT EXISTS idx_products_status ON products USING btree (status);
CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles USING btree (role_name);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales USING btree (channel);
CREATE INDEX IF NOT EXISTS idx_sales_order_datetime ON sales USING btree (order_datetime);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_branch_id ON stock_in USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_product_id ON stock_in USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_transaction_timestamp ON stock_in USING btree (transaction_timestamp);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users USING btree (role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users USING btree (status);

INSERT INTO roles (role_name, description)
VALUES
  ('owner', 'System owner'),
  ('admin', 'Administrator'),
  ('staff', 'Branch staff')
ON CONFLICT (role_name) DO UPDATE SET
  description = EXCLUDED.description;
