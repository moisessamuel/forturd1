-- Script de migración para agregar soporte de progreso manual a sorteos
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna metadata si no existe
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Crear indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_sorteos_metadata ON sorteos USING GIN (metadata);

-- 3. Inicializar sorteos BMW si no existen
INSERT INTO sorteos (slug, nombre, descripcion, precio_rd, precio_usd, total_boletos, estado, metadata)
VALUES 
  (
    'bmw-x6',
    'BMW X6 2024',
    'Deportivo, elegante y potente. Diseñado para destacar.',
    490,
    9,
    99999,
    'activo',
    '{"progreso_manual": 0, "boletosVendidos": [], "created_at": "' || NOW() || '"}'::jsonb
  ),
  (
    'bmw-x7',
    'BMW X7 2024',
    'Espacioso, cómodo y confortable. Ideal para toda la familia.',
    490,
    9,
    99999,
    'activo',
    '{"progreso_manual": 0, "boletosVendidos": [], "created_at": "' || NOW() || '"}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET metadata = EXCLUDED.metadata
WHERE sorteos.slug IN ('bmw-x6', 'bmw-x7');

-- Verificar que los sorteos existen
SELECT id, slug, nombre, metadata FROM sorteos WHERE slug IN ('bmw-x6', 'bmw-x7');
