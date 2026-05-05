-- Insert or update BMW X6 sorteo
INSERT INTO sorteos (slug, nombre, descripcion, precio_rd, precio_usd, total_boletos, estado, created_at, updated_at, metadata)
VALUES (
  'bmw-x6',
  'BMW X6 2024',
  'Vehiculo deportivo, elegante y potente. Diseñado para destacar.',
  490,
  9,
  99999,
  'activo',
  NOW(),
  NOW(),
  '{"progreso_manual": 0}'
)
ON CONFLICT (slug) DO UPDATE SET
  metadata = jsonb_set(sorteos.metadata, '{progreso_manual}', '0'::jsonb)
WHERE sorteos.slug = 'bmw-x6';

-- Insert or update BMW X7 sorteo
INSERT INTO sorteos (slug, nombre, descripcion, precio_rd, precio_usd, total_boletos, estado, created_at, updated_at, metadata)
VALUES (
  'bmw-x7',
  'BMW X7 2024',
  'SUV espacioso, cómodo y confortable. Ideal para toda la familia.',
  490,
  9,
  99999,
  'activo',
  NOW(),
  NOW(),
  '{"progreso_manual": 0}'
)
ON CONFLICT (slug) DO UPDATE SET
  metadata = jsonb_set(sorteos.metadata, '{progreso_manual}', '0'::jsonb)
WHERE sorteos.slug = 'bmw-x7';
