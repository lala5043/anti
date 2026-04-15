USE agriculture_portal;

ALTER TABLE users 
ADD COLUMN profile_pic VARCHAR(255) NULL AFTER phone;
