-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';
-- public.branches definition

-- Drop table

-- DROP TABLE public.branches;

CREATE TABLE public.branches ( id uuid DEFAULT gen_random_uuid() NOT NULL, branch_code varchar(50) NOT NULL, branch_name varchar(255) NOT NULL, address text NULL, phone varchar(50) NULL, status varchar(50) DEFAULT 'active'::character varying NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT branches_branch_code_key UNIQUE (branch_code), CONSTRAINT branches_pkey PRIMARY KEY (id));

CREATE INDEX idx_branches_branch_code ON public.branches USING btree (branch_code);

CREATE INDEX idx_branches_status ON public.branches USING btree (status);

-- Permissions

ALTER TABLE public.branches OWNER TO "admin";

GRANT ALL ON TABLE public.branches TO "admin";

-- public.products definition

-- Drop table

-- DROP TABLE public.products;

CREATE TABLE public.products ( id uuid DEFAULT gen_random_uuid() NOT NULL, product_code varchar(50) NULL, product_name varchar(255) NOT NULL, "cost" numeric(10, 2) DEFAULT 0 NOT NULL, cash_price numeric(10, 2) DEFAULT 0 NOT NULL, grab_price numeric(10, 2) DEFAULT 0 NOT NULL, line_man_price numeric(10, 2) DEFAULT 0 NOT NULL, total_current_stock int4 DEFAULT 0 NOT NULL, total_stock_in int4 DEFAULT 0 NOT NULL, total_stock_out int4 DEFAULT 0 NOT NULL, default_min_stock int4 DEFAULT 0 NOT NULL, aggregate_status varchar(50) NULL, total_number_of_times_received int4 DEFAULT 0 NOT NULL, image_url text NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT products_cash_price_check CHECK ((cash_price >= (0)::numeric)), CONSTRAINT products_cost_check CHECK ((cost >= (0)::numeric)), CONSTRAINT products_total_current_stock_non_negative CHECK ((total_current_stock >= 0)), CONSTRAINT products_grab_price_check CHECK ((grab_price >= (0)::numeric)), CONSTRAINT products_line_man_price_check CHECK ((line_man_price >= (0)::numeric)), CONSTRAINT products_default_min_stock_check CHECK ((default_min_stock >= 0)), CONSTRAINT products_total_number_of_times_received_non_negative CHECK ((total_number_of_times_received >= 0)), CONSTRAINT products_pkey PRIMARY KEY (id), CONSTRAINT products_product_code_key UNIQUE (product_code), CONSTRAINT products_total_stock_in_non_negative CHECK ((total_stock_in >= 0)), CONSTRAINT products_total_stock_out_non_negative CHECK ((total_stock_out >= 0)));

CREATE INDEX idx_products_product_code ON public.products USING btree (product_code);

CREATE INDEX idx_products_product_name ON public.products USING btree (product_name);

CREATE INDEX idx_products_aggregate_status ON public.products USING btree (aggregate_status);

-- Permissions

ALTER TABLE public.products OWNER TO "admin";

GRANT ALL ON TABLE public.products TO "admin";

-- public.roles definition

-- Drop table

-- DROP TABLE public.roles;

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid () NOT NULL,
    role_name varchar(50) NOT NULL,
    description text NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_role_name_key UNIQUE (role_name)
);

CREATE INDEX idx_roles_role_name ON public.roles USING btree (role_name);

-- Permissions

ALTER TABLE public.roles OWNER TO "admin";

GRANT ALL ON TABLE public.roles TO "admin";

-- public.sales definition

-- Drop table

-- DROP TABLE public.sales;

CREATE TABLE public.sales ( id uuid DEFAULT gen_random_uuid() NOT NULL, branch_id uuid NULL, order_id varchar(50) NOT NULL, order_datetime timestamp NOT NULL, product_id uuid NULL, qty int4 DEFAULT 0 NOT NULL, channel varchar(50) NULL, unit_price numeric(10, 2) DEFAULT 0 NOT NULL, gp_percent numeric(5, 2) DEFAULT 0 NOT NULL, gp_amount numeric(10, 2) DEFAULT 0 NOT NULL, net_revenue numeric(10, 2) DEFAULT 0 NOT NULL, unit_cost numeric(10, 2) DEFAULT 0 NOT NULL, total_cost numeric(10, 2) DEFAULT 0 NOT NULL, total_sales numeric(10, 2) DEFAULT 0 NOT NULL, net_profit numeric(10, 2) DEFAULT 0 NOT NULL, note text NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, CONSTRAINT sales_gp_amount_check CHECK ((gp_amount >= (0)::numeric)), CONSTRAINT sales_gp_percent_check CHECK ((gp_percent >= (0)::numeric)), CONSTRAINT sales_net_revenue_check CHECK ((net_revenue >= (0)::numeric)), CONSTRAINT sales_pkey PRIMARY KEY (id), CONSTRAINT sales_qty_check CHECK ((qty >= 0)), CONSTRAINT sales_total_cost_check CHECK ((total_cost >= (0)::numeric)), CONSTRAINT sales_total_sales_check CHECK ((total_sales >= (0)::numeric)), CONSTRAINT sales_unit_cost_check CHECK ((unit_cost >= (0)::numeric)), CONSTRAINT sales_unit_price_check CHECK ((unit_price >= (0)::numeric)), CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE CASCADE);

CREATE INDEX idx_sales_branch_id ON public.sales USING btree (branch_id);

CREATE INDEX idx_sales_channel ON public.sales USING btree (channel);

CREATE INDEX idx_sales_order_datetime ON public.sales USING btree (order_datetime);

CREATE INDEX idx_sales_order_id ON public.sales USING btree (order_id);

CREATE INDEX idx_sales_product_id ON public.sales USING btree (product_id);

-- Permissions

ALTER TABLE public.sales OWNER TO "admin";

GRANT ALL ON TABLE public.sales TO "admin";

-- public.stock_in definition

-- Drop table

-- DROP TABLE public.stock_in;

CREATE TABLE public.stock_in (
    id uuid DEFAULT gen_random_uuid () NOT NULL,
    branch_id uuid NULL,
    transaction_timestamp timestamp NOT NULL,
    product_id uuid NULL,
    quantity int4 DEFAULT 0 NOT NULL,
    restock varchar(100) NULL,
    note text NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT stock_in_pkey PRIMARY KEY (id),
    CONSTRAINT stock_in_quantity_non_negative CHECK ((quantity >= 0)),
    CONSTRAINT stock_in_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT stock_in_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_stock_in_branch_id ON public.stock_in USING btree (branch_id);

CREATE INDEX idx_stock_in_product_id ON public.stock_in USING btree (product_id);

CREATE INDEX idx_stock_in_transaction_timestamp ON public.stock_in USING btree (transaction_timestamp);

-- Permissions

ALTER TABLE public.stock_in OWNER TO "admin";

GRANT ALL ON TABLE public.stock_in TO "admin";

-- public.branch_inventory definition

-- Drop table

-- DROP TABLE public.branch_inventory;

CREATE TABLE public.branch_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    current_stock int4 DEFAULT 0 NOT NULL,
    stock_in int4 DEFAULT 0 NOT NULL,
    stock_out int4 DEFAULT 0 NOT NULL,
    number_of_times_received int4 DEFAULT 0 NOT NULL,
    min_stock int4 DEFAULT 0 NOT NULL,
    status varchar(50) DEFAULT 'Out of Stock'::character varying NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT branch_inventory_pkey PRIMARY KEY (id),
    CONSTRAINT branch_inventory_product_branch_unique UNIQUE (product_id, branch_id),
    CONSTRAINT branch_inventory_current_stock_non_negative CHECK ((current_stock >= 0)),
    CONSTRAINT branch_inventory_stock_in_non_negative CHECK ((stock_in >= 0)),
    CONSTRAINT branch_inventory_stock_out_non_negative CHECK ((stock_out >= 0)),
    CONSTRAINT branch_inventory_number_of_times_received_non_negative CHECK ((number_of_times_received >= 0)),
    CONSTRAINT branch_inventory_min_stock_non_negative CHECK ((min_stock >= 0)),
    CONSTRAINT branch_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT branch_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_branch_inventory_product_id ON public.branch_inventory USING btree (product_id);

CREATE INDEX idx_branch_inventory_branch_id ON public.branch_inventory USING btree (branch_id);

CREATE INDEX idx_branch_inventory_product_branch ON public.branch_inventory USING btree (product_id, branch_id);

-- Permissions

ALTER TABLE public.branch_inventory OWNER TO "admin";

GRANT ALL ON TABLE public.branch_inventory TO "admin";

-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users ( id uuid DEFAULT gen_random_uuid() NOT NULL, first_name varchar(100) NOT NULL, last_name varchar(100) NOT NULL, email varchar(255) NOT NULL, role_id uuid NOT NULL, branch_id uuid NULL, status varchar(50) DEFAULT 'active'::character varying NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, password_hash varchar NOT NULL, CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (id), CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT ON UPDATE CASCADE);

CREATE INDEX idx_users_branch_id ON public.users USING btree (branch_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);

CREATE INDEX idx_users_status ON public.users USING btree (status);

-- Permissions

ALTER TABLE public.users OWNER TO "admin";

GRANT ALL ON TABLE public.users TO "admin";

-- DROP FUNCTION public.armor(bytea);

CREATE OR REPLACE FUNCTION public.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- Permissions

ALTER FUNCTION public.armor(bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.armor (bytea) TO "admin";

-- DROP FUNCTION public.armor(bytea, _text, _text);

CREATE OR REPLACE FUNCTION public.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- Permissions

ALTER FUNCTION public.armor(bytea, _text, _text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.armor (bytea, _text, _text) TO "admin";

-- DROP FUNCTION public.crypt(text, text);

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

-- Permissions

ALTER FUNCTION public.crypt(text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.crypt (text, text) TO "admin";

-- DROP FUNCTION public.dearmor(text);

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

-- Permissions

ALTER FUNCTION public.dearmor(text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.dearmor (text) TO "admin";

-- DROP FUNCTION public.decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

-- Permissions

ALTER FUNCTION public.decrypt(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.decrypt (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.decrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

-- Permissions

ALTER FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.decrypt_iv (bytea, bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.digest(bytea, text);

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- Permissions

ALTER FUNCTION public.digest(bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.digest (bytea, text) TO "admin";

-- DROP FUNCTION public.digest(text, text);

CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- Permissions

ALTER FUNCTION public.digest(text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.digest (text, text) TO "admin";

-- DROP FUNCTION public.encrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

-- Permissions

ALTER FUNCTION public.encrypt(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.encrypt (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.encrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

-- Permissions

ALTER FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.encrypt_iv (bytea, bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.gen_random_bytes(int4);

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

-- Permissions

ALTER FUNCTION public.gen_random_bytes(int4) OWNER TO "admin";

GRANT ALL ON FUNCTION public.gen_random_bytes (int4) TO "admin";

-- DROP FUNCTION public.gen_random_uuid();

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

-- Permissions

ALTER FUNCTION public.gen_random_uuid() OWNER TO "admin";

GRANT ALL ON FUNCTION public.gen_random_uuid () TO "admin";

-- DROP FUNCTION public.gen_salt(text, int4);

CREATE OR REPLACE FUNCTION public.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

-- Permissions

ALTER FUNCTION public.gen_salt(text, int4) OWNER TO "admin";

GRANT ALL ON FUNCTION public.gen_salt (text, int4) TO "admin";

-- DROP FUNCTION public.gen_salt(text);

CREATE OR REPLACE FUNCTION public.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

-- Permissions

ALTER FUNCTION public.gen_salt(text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.gen_salt (text) TO "admin";

-- DROP FUNCTION public.hmac(text, text, text);

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- Permissions

ALTER FUNCTION public.hmac(text, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.hmac (text, text, text) TO "admin";

-- DROP FUNCTION public.hmac(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- Permissions

ALTER FUNCTION public.hmac(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.hmac (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_armor_headers(in text, out text, out text);

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

-- Permissions

ALTER FUNCTION public.pgp_armor_headers(in text, out text, out text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_armor_headers (in text, out text, out text) TO "admin";

-- DROP FUNCTION public.pgp_key_id(bytea);

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

-- Permissions

ALTER FUNCTION public.pgp_key_id(bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_key_id (bytea) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt(bytea, bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt (bytea, bytea) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt (bytea, bytea, text, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea (bytea, bytea, text, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea (bytea, bytea) TO "admin";

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_encrypt(text, bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_encrypt (text, bytea) TO "admin";

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_encrypt(text, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_encrypt (text, bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea (bytea, bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea (bytea, bytea) TO "admin";

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_decrypt(bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_decrypt (bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_decrypt(bytea, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_decrypt (bytea, text, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea (bytea, text, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea (bytea, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_encrypt(text, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_encrypt(text, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_encrypt (text, text, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_encrypt(text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_encrypt(text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_encrypt (text, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea (bytea, text, text) TO "admin";

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- Permissions

ALTER FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) OWNER TO "admin";

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea (bytea, text) TO "admin";

-- Permissions

GRANT ALL ON SCHEMA public TO pg_database_owner;

GRANT USAGE ON SCHEMA public TO public;
