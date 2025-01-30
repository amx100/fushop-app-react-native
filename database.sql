-- Create an enum for sizes
CREATE TYPE size_type AS ENUM ('S', 'M', 'L', 'XL', '2XL', '3XL');

-- Create product_size table
CREATE TABLE product_size (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product(id) ON DELETE CASCADE,
  size size_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, size)
);

-- Modify product table (remove maxQuantity as it will be managed per size)
ALTER TABLE product DROP COLUMN maxQuantity;

CREATE OR REPLACE FUNCTION decrement_size_quantity(
  p_product_id INT,
  p_size size_type,
  p_quantity INT
) RETURNS void AS $$
BEGIN
  -- Add locking to prevent concurrent updates
  PERFORM pg_advisory_xact_lock(p_product_id);
  
  UPDATE product_size
  SET quantity = quantity - p_quantity
  WHERE product_id = p_product_id 
    AND size = p_size
    AND quantity >= p_quantity;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient quantity available for product % size %', p_product_id, p_size;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add size column to order_item table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_item' 
        AND column_name = 'size'
    ) THEN
        ALTER TABLE order_item ADD COLUMN size size_type NOT NULL DEFAULT 'M';
        -- We set a default value temporarily to handle existing records
        -- After migration is complete, you can remove the DEFAULT if desired
    END IF;
END $$; 