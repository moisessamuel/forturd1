# Guía: Control de Progreso de Sorteos BMW X6 y BMW X7

## Descripción

Ahora puedes controlar el porcentaje de progreso de cada sorteo (BMW X6 y BMW X7) de forma independiente a través de cursores/sliders en sus respectivos paneles administrativos.

## Cómo usar

### 1. Acceder al Panel Administrativo
- BMW X6: `/admin/bmw-x6`
- BMW X7: `/admin/bmw-x7`

### 2. Buscar la Sección "Progreso del Sorteo"
En cada panel, en la sección de **Estadísticas**, verás una tarjeta dorada con:
- **Etiqueta**: "Progreso del Sorteo"
- **Porcentaje actual**: Mostrado en texto grande
- **Slider/Cursor**: Para ajustar el porcentaje de 0% a 100%

### 3. Ajustar el Progreso
1. Arrastra el cursor a la izquierda para disminuir el porcentaje
2. Arrastra a la derecha para aumentar el porcentaje
3. Los cambios se guardan **automáticamente** en Supabase

### 4. Verificación

#### En el Navegador
Abre la **Consola del Navegador** (F12 > Console) y busca logs con `[v0]`:
```
[v0] Fetching progress for bmw-x6
[v0] Progress data: { porcentaje: 50, ... }
[v0] Saving progress for bmw-x6: 75%
[v0] Progress response: { porcentaje: 75, message: '...', isManual: true }
```

#### Cambios Esperados
- ✅ El porcentaje se actualiza en tiempo real
- ✅ Recibes una notificación: "Progreso actualizado a X%"
- ✅ Los cambios persisten al recargar la página
- ✅ Cada sorteo mantiene su propio porcentaje independiente

## Estructura de Datos

Los porcentajes se guardan en la tabla `sorteos` de Supabase en el campo **metadata** como JSON:

```json
{
  "progreso_manual": 75,
  "ultima_actualizacion": "2024-12-20T15:30:45.123Z"
}
```

## Archivos Modificados

1. **API**: `/app/api/sorteos/[slug]/progress/route.ts`
   - GET: Obtiene el progreso actual
   - PUT: Actualiza el progreso manualmente

2. **Componente**: `/components/sorteo-admin-panel.tsx`
   - Agrega el slider de progreso en la sección de estadísticas
   - Maneja la lógica de actualización

3. **Scripts**: `/scripts/add_metadata_to_sorteos.sql`
   - Migración SQL para agregar la columna `metadata` si no existe

## Troubleshooting

### Error: "Error al guardar el progreso"

**Causa posible**: La columna `metadata` no existe en la tabla `sorteos`

**Solución**:
1. Ve a Supabase Dashboard
2. SQL Editor
3. Ejecuta el script: `/scripts/add_metadata_to_sorteos.sql`
4. Recarga la página e intenta de nuevo

### El porcentaje se muestra como 0%

**Verificación**:
1. Abre la consola del navegador (F12)
2. Busca logs con `[v0]`
3. Si ves "Error fetching progress", verifica la conexión a Supabase
4. Asegúrate de que el sorteo exista en la tabla `sorteos`

## Notas Técnicas

- El progreso manual override el cálculo automático basado en boletos vendidos
- Los cambios se guardan en tiempo real en Supabase
- El componente Slider está configurado para ser sensible al toque y al mouse
- Hay validación en el frontend y backend para valores 0-100

## Próximos Pasos

Puedes:
1. ✅ Ajustar el progreso manualmente en ambos sorteos
2. ✅ Ver los cambios reflejados en tiempo real
3. ✅ Los usuarios verán el progreso actualizado en la página principal
