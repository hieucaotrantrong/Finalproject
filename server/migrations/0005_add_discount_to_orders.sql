-- Add discount columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Create index for discount code lookups
CREATE INDEX IF NOT EXISTS idx_order_discount_code ON orders(discount_code);
