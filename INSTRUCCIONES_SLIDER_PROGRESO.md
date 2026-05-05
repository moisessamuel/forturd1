# ⚙️ INSTRUCCIONES PARA ACTIVAR EL SLIDER DE PROGRESO

## PROBLEMA IDENTIFICADO
La columna `metadata` no existe en la tabla `sorteos` de Supabase, por eso el slider no guarda datos.

## SOLUCIÓN: Ejecuta estas instrucciones en Supabase

### PASO 1: Abre Supabase SQL Editor
1. Ve a tu proyecto Supabase
2. Click en "SQL Editor" en el menú izquierdo
3. Click en "New Query"

### PASO 2: Copia y ejecuta este SQL
```sql
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sorteos_metadata ON sorteos USING GIN (metadata);

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
    '{"progreso_manual": 0}'::jsonb
  ),
  (
    'bmw-x7',
    'BMW X7 2024',
    'Espacioso, cómodo y confortable. Ideal para toda la familia.',
    490,
    9,
    99999,
    'activo',
    '{"progreso_manual": 0}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET metadata = EXCLUDED.metadata;
```

### PASO 3: Ejecuta la query
Click el botón ▶️ "Run" o presiona Cmd/Ctrl + Enter

### PASO 4: Verifica que funcionó
Deberías ver: "Execution successful"

## AHORA PRUEBA EL SLIDER

### En el Admin Panel:
1. Ve a `/admin/bmw-x6` o `/admin/bmw-x7`
2. Mueve el slider "Progreso del Sorteo"
3. Deberías ver: "Progreso actualizado al X%"

### En la página pública:
1. Ve a `/bmw-x6` o `/bmw-x7`
2. Mira el "PROGRESO DE VENTA" - debe mostrar el % que pusiste en el admin
3. El progreso se actualiza cada 5 segundos automáticamente

## SI SIGUEN HABIENDO PROBLEMAS

### Opción 1: Verifica los logs
1. Abre la consola del navegador (F12)
2. Busca mensajes con `[v0]`
3. Envíame los errores exactos

### Opción 2: Verifica manualmente que los sorteos existen
En Supabase SQL Editor ejecuta:
```sql
SELECT id, slug, nombre, metadata FROM sorteos WHERE slug IN ('bmw-x6', 'bmw-x7');
```

Deberías ver dos filas con los BMW X6 y X7.

## FLUJO COMPLETO

1. **Admin Panel** → Mueve slider → Envía % a `/api/sorteos/[slug]/progress` (PUT)
2. **API PUT** → Guarda en `sorteos.metadata.progreso_manual` en Supabase
3. **Página Pública** → Cada 5 segundos, hace poll a `/api/sorteos/[slug]/progress` (GET)
4. **API GET** → Lee `sorteos.metadata.progreso_manual` y retorna el %
5. **Página Pública** → Actualiza "PROGRESO DE VENTA" con el % nuevo

Todo sincronizado automáticamente ✓
