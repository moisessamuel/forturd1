-- Create audit_log table for tracking purchase state reversions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_group_id UUID REFERENCES purchase_groups(id) ON DELETE CASCADE,
  admin_username TEXT NOT NULL,
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL DEFAULT 'pendiente',
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by purchase group
CREATE INDEX IF NOT EXISTS idx_audit_log_purchase_group ON audit_log(purchase_group_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
