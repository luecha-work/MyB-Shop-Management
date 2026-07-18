SET search_path TO mybshop, public, extensions;

INSERT INTO users (
    first_name,
    last_name,
    email,
    password_hash,
    role_id,
    branch_id,
    status
)
SELECT
    'Owner',
    'User',
    'owner@myb.com',
    crypt('owner123', gen_salt('bf')),
    r.id,
    NULL,
    'active'
FROM roles r
WHERE r.role_name = 'owner'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    branch_id = EXCLUDED.branch_id,
    status = 'active',
    updated_at = CURRENT_TIMESTAMP;
