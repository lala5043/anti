USE agriculture_portal;

ALTER TABLE products 
ADD COLUMN unit_type VARCHAR(20) DEFAULT 'Kg' AFTER price,
ADD COLUMN moq INT DEFAULT 1 AFTER unit_type,
ADD COLUMN harvest_date DATE NULL AFTER moq;
