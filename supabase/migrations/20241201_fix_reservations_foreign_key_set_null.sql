-- Alternative migration: Set order_id to NULL when order is deleted
-- This keeps the reservations but removes the order reference

-- Drop the existing constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_order_id_fkey;

-- Add the new constraint with SET NULL delete behavior
-- This means when an order is deleted, order_id in reservations becomes NULL
ALTER TABLE reservations 
ADD CONSTRAINT reservations_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES "order"(id) 
ON DELETE SET NULL;

-- Add a comment to document the change
COMMENT ON CONSTRAINT reservations_order_id_fkey ON reservations IS 
'Foreign key constraint with SET NULL delete - when an order is deleted, order_id in reservations becomes NULL';
