-- Update shipping option to use Postex with calculated price type

UPDATE shipping_option 
SET 
  price_type = 'calculated',
  provider_id = 'postex'
WHERE 
  id = 'so_01K9ETRPKZT05FV7976ZH5ZVWK';

-- Verify the update
SELECT 
  id, 
  name, 
  price_type, 
  provider_id,
  created_at,
  updated_at
FROM 
  shipping_option 
WHERE 
  id = 'so_01K9ETRPKZT05FV7976ZH5ZVWK';















