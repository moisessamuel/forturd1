-- FortuRD Database Schema

-- Configuration table for the raffle
CREATE TABLE IF NOT EXISTS public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_boletos INTEGER NOT NULL DEFAULT 200000,
  precio_boleto_dop NUMERIC NOT NULL DEFAULT 1000,
  precio_boleto_usd NUMERIC NOT NULL DEFAULT 20,
  comision_referido NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referral agents table
CREATE TABLE IF NOT EXISTS public.referidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  ventas_aprobadas INTEGER DEFAULT 0,
  ventas_total_dop NUMERIC DEFAULT 0,
  comision_porcentaje NUMERIC DEFAULT 10,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchases / tickets table
CREATE TABLE IF NOT EXISTS public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_boleto TEXT UNIQUE,
  nombre_comprador TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  cedula TEXT,
  cantidad_boletos INTEGER NOT NULL DEFAULT 1,
  monto NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'DOP',
  banco TEXT,
  metodo_pago TEXT DEFAULT 'directo',
  referido_codigo TEXT,
  referido_id UUID REFERENCES public.referidos(id) ON DELETE SET NULL,
  comprobante_url TEXT,
  estado TEXT DEFAULT 'pendiente',
  fecha TIMESTAMPTZ DEFAULT now(),
  fecha_aprobacion TIMESTAMPTZ,
  notas TEXT
);

-- Bank accounts for payment
CREATE TABLE IF NOT EXISTS public.bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  titular TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  tipo_cuenta TEXT,
  moneda TEXT DEFAULT 'DOP',
  logo_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
