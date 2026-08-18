INSERT INTO flash_sales (
  id,
  product_name,
  starts_at,
  ends_at,
  total_stock,
  remaining_stock,
  limit_claim
) VALUES ($1, $2, $3, $4, $5, $5, $6)
ON CONFLICT (id) DO NOTHING;
