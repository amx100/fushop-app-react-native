-- Remove the size_type enum since we'll use custom sizes
DROP TYPE IF EXISTS size_type;

-- Modify product_size table to use varchar for size
CREATE TABLE product_size (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product(id) ON DELETE CASCADE,
  size_id INTEGER REFERENCES sizes(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, size_id)
);



CREATE OR REPLACE FUNCTION decrement_size_quantity(
  p_product_id INT,
  p_size_id INT,
  p_quantity INT
) RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(p_product_id);
  
  UPDATE product_size
  SET quantity = quantity - p_quantity
  WHERE product_id = p_product_id 
    AND size_id = p_size_id
    AND quantity >= p_quantity;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient quantity available for product % size %', p_product_id, p_size_id;
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
        ALTER TABLE order_item ADD COLUMN size VARCHAR(20) NOT NULL DEFAULT 'M';
        -- We set a default value temporarily to handle existing records
        -- After migration is complete, you can remove the DEFAULT if desired
    END IF;
END $$;

-- Create sizes table
CREATE TABLE sizes (
  id SERIAL PRIMARY KEY,
  value VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Update product_size table structure
ALTER TABLE product_size 
DROP COLUMN size,
ADD COLUMN size_id INTEGER REFERENCES sizes(id) ON DELETE RESTRICT;

-- Add size_id column to order_item table
ALTER TABLE order_item 
ADD COLUMN size_id INTEGER REFERENCES sizes(id);

-- Update database types for order_item table
ALTER TABLE order_item
ALTER COLUMN size TYPE VARCHAR(20),
ADD COLUMN size_id INTEGER REFERENCES sizes(id);

-- First drop existing foreign key constraints
ALTER TABLE order_item 
DROP CONSTRAINT IF EXISTS order_item_size_id_fkey;

ALTER TABLE product_size 
DROP CONSTRAINT IF EXISTS product_size_size_id_fkey;

-- Then add them back with proper ON DELETE rules
ALTER TABLE order_item 
ADD CONSTRAINT order_item_size_id_fkey 
FOREIGN KEY (size_id) 
REFERENCES sizes(id) 
ON DELETE SET NULL;  -- When size is deleted, set size_id to NULL in order_item

ALTER TABLE product_size 
ADD CONSTRAINT product_size_size_id_fkey 
FOREIGN KEY (size_id) 
REFERENCES sizes(id) 
ON DELETE CASCADE;  -- When size is deleted, also delete related product_size entries

-- Make size_id nullable in order_item since we're using ON DELETE SET NULL
ALTER TABLE order_item 
ALTER COLUMN size_id DROP NOT NULL; 