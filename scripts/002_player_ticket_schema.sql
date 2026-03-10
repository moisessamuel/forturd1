-- Migration: Player-based ticket system with permanent QR codes
-- This creates the new relational model alongside the existing compras table

-- 1. Players table - identified by phone number
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT,
  cedula TEXT,
  qr_code_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. QR Codes table - permanent QR per player
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_value TEXT UNIQUE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key from players to qr_codes
ALTER TABLE players ADD CONSTRAINT fk_players_qr_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id);

-- 3. Purchase Groups table - one group per purchase transaction
CREATE TABLE IF NOT EXISTS purchase_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
  total_tickets INTEGER NOT NULL DEFAULT 1,
  monto NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'DOP',
  banco TEXT,
  comprobante_url TEXT,
  referido_codigo TEXT,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ
);

-- 4. Tickets table - individual ticket numbers
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_boleto TEXT UNIQUE NOT NULL,
  purchase_group_id UUID NOT NULL REFERENCES purchase_groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone_number);
CREATE INDEX IF NOT EXISTS idx_qr_codes_value ON qr_codes(qr_value);
CREATE INDEX IF NOT EXISTS idx_tickets_numero ON tickets(numero_boleto);
CREATE INDEX IF NOT EXISTS idx_tickets_player ON tickets(player_id);
CREATE INDEX IF NOT EXISTS idx_tickets_purchase_group ON tickets(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_player ON purchase_groups(player_id);
CREATE INDEX IF NOT EXISTS idx_purchase_groups_estado ON purchase_groups(estado);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow anon read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow anon insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update players" ON players FOR UPDATE USING (true);

CREATE POLICY "Allow anon read qr_codes" ON qr_codes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert qr_codes" ON qr_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon read purchase_groups" ON purchase_groups FOR SELECT USING (true);
CREATE POLICY "Allow anon insert purchase_groups" ON purchase_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update purchase_groups" ON purchase_groups FOR UPDATE USING (true);

CREATE POLICY "Allow anon read tickets" ON tickets FOR SELECT USING (true);
CREATE POLICY "Allow anon insert tickets" ON tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update tickets" ON tickets FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete tickets" ON tickets FOR DELETE USING (true);

CREATE POLICY "Allow anon delete purchase_groups" ON purchase_groups FOR DELETE USING (true);
CREATE POLICY "Allow anon delete qr_codes" ON qr_codes FOR DELETE USING (true);
CREATE POLICY "Allow anon delete players" ON players FOR DELETE USING (true);
