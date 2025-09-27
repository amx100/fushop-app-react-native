-- Fix foreign key constraint for reservations -> order relationship
-- This will allow deleting orders and automatically handle the reservations

-- Option 1: CASCADE - Delete reservations when order is deleted
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_order_id_fkey;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES "order"(id) 
ON DELETE CASCADE;

-- Option 2: SET NULL - Set order_id to NULL when order is deleted (if you prefer this)
-- Uncomment the lines below if you want to use SET NULL instead of CASCADE

-- ALTER TABLE reservations 
-- DROP CONSTRAINT IF EXISTS reservations_order_id_fkey;

-- ALTER TABLE reservations 
-- ADD CONSTRAINT reservations_order_id_fkey 
-- FOREIGN KEY (order_id) 
-- REFERENCES "order"(id) 
-- ON DELETE SET NULL;

-- Verify the constraint was updated
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'reservations'
  AND kcu.column_name = 'order_id';
