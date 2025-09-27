-- Fix foreign key constraint for reservations -> order relationship
-- This migration fixes the foreign key constraint to allow deleting orders

-- Drop the existing constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_order_id_fkey;

-- Add the new constraint with CASCADE delete behavior
-- This means when an order is deleted, all related reservations will also be deleted
ALTER TABLE reservations 
ADD CONSTRAINT reservations_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES "order"(id) 
ON DELETE CASCADE;

-- Alternative: If you prefer to keep reservations but just remove the order reference
-- Uncomment the lines below instead of the CASCADE option above

-- ALTER TABLE reservations 
-- ADD CONSTRAINT reservations_order_id_fkey 
-- FOREIGN KEY (order_id) 
-- REFERENCES "order"(id) 
-- ON DELETE SET NULL;

-- Add a comment to document the change
COMMENT ON CONSTRAINT reservations_order_id_fkey ON reservations IS 
'Foreign key constraint with CASCADE delete - when an order is deleted, related reservations are also deleted';
