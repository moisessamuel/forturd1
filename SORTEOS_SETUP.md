## Solución - Control de Progreso de Sorteos BMW X6 y BMW X7

### Problema
El panel administrativo mostraba el error: **"Sorteo not found: bmw-x6"** al intentar ajustar el progreso.

### Causa
Los sorteos BMW X6 y BMW X7 no estaban registrados en la tabla `sorteos` de Supabase.

### Solución - Opción 1: Automática (Recomendado)
El sistema ahora **se auto-inicializa automáticamente**:
1. Cuando accedes a `/admin/bmw-x6` o `/admin/bmw-x7`, el panel verifica si los sorteos existen
2. Si no existen, los crea automáticamente en la base de datos
3. Luego muestra el slider de progreso para que puedas controlar el porcentaje

**No necesitas hacer nada - funcionará automáticamente.**

### Solución - Opción 2: Manual (Si la automática no funciona)
Si aún experimentas el problema, ejecuta el SQL directamente:

1. Ve a tu consola de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `scripts/SETUP_INSTRUCTIONS.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que los sorteos se crearon exitosamente

### ¿Cómo funciona el Control de Progreso?

Ambos sorteos ahora tienen sliders **independientes**:

**BMW X6** (`/admin/bmw-x6`):
- Accede al panel administrativo
- En la sección "Estadísticas - BMW X6" encontrarás "Progreso del Sorteo"
- Mueve el slider de 0% a 100%
- Los cambios se guardan automáticamente en Supabase
- El progreso se refleja en la página pública

**BMW X7** (`/admin/bmw-x7`):
- Mismo proceso que BMW X6 pero independiente

### Características
✅ Cada sorteo tiene su propio slider independiente  
✅ Los cambios se guardan automáticamente  
✅ Sin recarga necesaria  
✅ Retroalimentación visual con toast notifications  
✅ Logs en consola para debuggear problemas  

### Debugging
Si aún hay problemas, abre la consola del navegador (F12) y busca logs con `[v0]`:
- `[v0] Initializing sorteos...` - Se está iniciando
- `[v0] Saving progress for bmw-x6: 50%` - Se está guardando el progreso
- `[v0] Progress response:` - Respuesta del servidor

### Archivos Modificados/Creados
- `components/sorteo-admin-panel.tsx` - Agregado auto-inicialización
- `app/api/admin/init-sorteos/route.ts` - API para crear sorteos
- `app/api/sorteos/[slug]/progress/route.ts` - API para controlar progreso
- `scripts/SETUP_INSTRUCTIONS.sql` - SQL manual para crear sorteos
