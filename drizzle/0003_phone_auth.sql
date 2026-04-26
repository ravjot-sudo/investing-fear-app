-- Add phone and avatar columns to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN avatarUrl TEXT DEFAULT NULL;

-- Create phoneAuth table for OTP verification
CREATE TABLE IF NOT EXISTS phoneAuth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  verified ENUM('pending', 'verified') DEFAULT 'pending' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_phone (phone),
  INDEX idx_otp (otp)
);