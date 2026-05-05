-- This script should be run in the Supabase SQL Editor to initialize BMW sorteos
-- Copy and paste this SQL into your Supabase dashboard (SQL Editor) and execute it

-- Create BMW X6 sorteo if it doesn't exist
INSERT INTO sorteos (
  slug,
  nombre,
  descripcion,
  precio_rd,
  precio_usd,
  total_boletos,
  estado,
  metadata
)
SELECT
  'bmw-x6',
  'BMW X6 2024',
  'Vehiculo deportivo, elegante y potente. Diseñado para destacar.',
  490,
  9,
  99999,
  'activo',
  '{"progreso_manual": 0}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM sorteos WHERE slug = 'bmw-x6'
);

-- Create BMW X7 sorteo if it doesn't exist
INSERT INTO sorteos (
  slug,
  nombre,
  descripcion,
  precio_rd,
  precio_usd,
  total_boletos,
  estado,
  metadata
)
SELECT
  'bmw-x7',
  'BMW X7 2024',
  'SUV espacioso, cómodo y confortable. Ideal para toda la familia.',
  490,
  9,
  99999,
  'activo',
  '{"progreso_manual": 0}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM sorteos WHERE slug = 'bmw-x7'
);

-- Verify the sorteos were created
SELECT slug, nombre, estado FROM sorteos WHERE slug IN ('bmw-x6', 'bmw-x7');
