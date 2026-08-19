INSERT INTO flash_sales (
  id,
  product_name,
  starts_at,
  ends_at,
  total_stock,
  remaining_stock,
  limit_claim,
  inactive
) VALUES
  (
    'flash-headphones-001',
    'Noise-Cancelling Headphones',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP + INTERVAL '23 hours',
    100,
    100,
    1,
    FALSE
  ),
  (
    'flash-keyboard-002',
    'Mechanical Gaming Keyboard',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    CURRENT_TIMESTAMP + INTERVAL '2 hours',
    50,
    50,
    2,
    FALSE
  ),
  (
    'upcoming-watch-003',
    'Limited Edition Smart Watch',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    75,
    75,
    1,
    FALSE
  ),
  (
    'ended-speaker-004',
    'Portable Bluetooth Speaker',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    40,
    0,
    1,
    FALSE
  ),
  (
    'inactive-camera-005',
    'Instant Print Camera',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    25,
    25,
    1,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;
