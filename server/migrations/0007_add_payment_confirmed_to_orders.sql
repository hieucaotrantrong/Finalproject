-- Track whether an order payment has been confirmed
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN NOT NULL DEFAULT true;

-- Existing rows should remain visible in history
UPDATE orders
SET payment_confirmed = true
WHERE payment_confirmed IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed ON orders(payment_confirmed);