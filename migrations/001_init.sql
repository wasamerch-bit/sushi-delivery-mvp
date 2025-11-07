-- 001_init.sql
-- Kerntabellen für SushiDelivery MVP
-- Run: psql -d yourdb -f 001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis; -- optional, für geolocation

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL,
  channel_order_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address JSONB,
  items JSONB NOT NULL,
  requested_time TIMESTAMPTZ,
  priority INT DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (channel, channel_order_id)
);

-- Tasks (KDS)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station TEXT NOT NULL, -- sushi, cutter, hot, packing
  status TEXT NOT NULL DEFAULT 'pending', -- pending, claimed, in_progress, done, blocked
  claimed_by UUID NULL,
  estimated_time INT NULL, -- seconds
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_station_status ON tasks (station, status);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  phone TEXT,
  vehicle TEXT,
  status TEXT DEFAULT 'off_shift', -- available, assigned, on_trip, off_shift
  last_location JSONB,
  current_tour_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tours (Dispatch)
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id),
  orders JSONB, -- array of {order_id, eta}
  status TEXT DEFAULT 'planned', -- planned, dispatched, completed
  estimated_total_time INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- fridge_daily, packing, startup
  entries JSONB,
  done_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NULL REFERENCES orders(id),
  uploaded_by UUID,
  url TEXT NOT NULL,
  tag TEXT, -- packing, fridge, other
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events (Audit)
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  entity TEXT,
  entity_id UUID NULL,
  event_type TEXT,
  payload JSONB,
  source TEXT,
  event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_eventid ON events (event_id);

-- Useful trigger to update updated_at on change
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER trg_drivers_updated_at
BEFORE UPDATE ON drivers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER trg_tours_updated_at
BEFORE UPDATE ON tours
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
