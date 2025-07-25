-- Flower Subscription Service Database Initialization
-- Punk rock database setup - no mercy for weak schemas

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Europe/Moscow';

-- Create custom types
CREATE TYPE user_role AS ENUM ('client', 'admin', 'courier');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE delivery_slot AS ENUM ('morning', 'afternoon', 'evening');
CREATE TYPE subscription_frequency AS ENUM ('daily', 'every_other_day', 'weekly', 'custom');

-- Indexes will be created by SQLAlchemy when tables are created

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE flower_db TO flower_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flower_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flower_user;

-- Load test data
\i /docker-entrypoint-initdb.d/test_data.sql

-- Load additional test data
\i /docker-entrypoint-initdb.d/additional_test_data.sql 