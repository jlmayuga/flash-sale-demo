CREATE TABLE IF NOT EXISTS flash_sales (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
  remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
  limit_claim INTEGER NOT NULL DEFAULT 1 CHECK (limit_claim > 0),
  inactive BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (remaining_stock <= total_stock),
  CHECK (ends_at > starts_at)
);

ALTER TABLE flash_sales
  ADD COLUMN IF NOT EXISTS inactive BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE flash_sales
  ADD COLUMN IF NOT EXISTS limit_claim INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE purchases
  DROP CONSTRAINT IF EXISTS purchases_sale_id_user_identifier_key;

CREATE INDEX IF NOT EXISTS purchases_user_lookup
  ON purchases (sale_id, user_identifier);
