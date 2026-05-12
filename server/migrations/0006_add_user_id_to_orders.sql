-- Add user_id to orders so discount usage can be tracked per user
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id INTEGER;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'orders_user_id_fkey'
	) THEN
		ALTER TABLE orders
		ADD CONSTRAINT orders_user_id_fkey
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_discount_code ON orders(user_id, discount_code);
