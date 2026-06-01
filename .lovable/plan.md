## Plan: Mejoras El Toro Rugby Performance

### 1. Entrenamientos recurrentes (Coach)
- Nueva tabla `recurring_schedules` con: `type` (training/physio_slot), `name`, `weekday` (0-6), `start_time`, `duration_minutes`, `start_date`, `end_date` (nullable = activo indefinido), `active`, `created_by`, metadata json (para tipo, descripción, etc.).
- En `/coach/calendario`: botón "Programar recurrente" → dialog con días de semana (checkboxes), hora, duración, fecha inicio/fin opcional. Lista de recurrentes activos con botón "Frenar" (desactiva → no genera más eventos).
- Generación: al cargar el calendario del mes, expandir las series activas en eventos virtuales mostrados (o función `expand_recurring(month)` que materializa en `calendar_events` si no existen). Usaré expansión en cliente al mostrar, e inserción real cuando coach quiere.
- Mejor enfoque: una función SQL que materializa próximos 90 días al crear/actualizar la serie; al frenar marca `active=false` y borra futuros eventos sin asistencia.

### 2. Slots de fisio reservables
- Nueva tabla `physio_slots`: `slot_date`, `start_time`, `duration_minutes` (15 default), `appointment_type`, `capacity` (default 1), `reserved_by` (uuid nullable), `recurring_schedule_id` nullable, `created_by`.
- En `/coach/fisio`: pestaña "Slots disponibles" — crear slots individuales o por bloque (rango horario + intervalo) en un día. También opción "Repetir semanalmente" (días + horas + hasta cuándo) usando `recurring_schedules` con type=physio_slot.
- En `/atleta/fisio`: nueva sección "Reservar turno disponible" con slots libres por día. Click reserva el slot (atómico, transacción que verifica `reserved_by IS NULL`) y crea automáticamente el `physio_appointment` correspondiente. Notifica al atleta y al coach.
- Prevenir solapes: UNIQUE en (slot_date, start_time, appointment_type).

### 3. Landing page
- Eliminar duplicado de CTA registro/login (dejar solo el de arriba derecha, que es más limpio).
- Agregar enlace "¿Olvidaste tu contraseña?" en `/login` → nueva ruta `/recuperar` que llama `supabase.auth.resetPasswordForEmail` con `redirectTo: /reset-password`.
- Nueva ruta `/reset-password` que detecta token recovery y permite cambiar contraseña.

### 4. Validación contraseña
- En registro y reset: mínimo 8 caracteres, una mayúscula, un número, un carácter especial. Validar con Zod, mostrar requisitos en vivo.

### 5. Datos personales por rol
- En `registro.tsx`: si role=coach, ocultar campos posición/peso/altura. Solo nombre, apellido, email, contraseña.
- En `atleta.onboarding.tsx`: ya está para atletas, no cambia.
- En `atleta.perfil.tsx`: igual condicionar visibilidad de stats físicos al rol.
- En `Shell` (header): no mostrar peso/posición para coach.

### 6. Español neutro (vos → tú)
- Pasada de texto en routes/components principales: "Iniciá" → "Inicia", "Tocá" → "Toca", "Pediles" → "Pídele", "Elegí" → "Elige", "Pinchá" → "Pulsa", "Subí" → "Sube", "Asigná" → "Asigna", "Activá" → "Activa", "vos/tu" → "tú/tu", "agregá" → "agrega", etc. Mantener nombres propios.

### 7. Loader animado pelota de rugby
- Nuevo componente `RugbyLoader.tsx` (SVG de pelota ovalada con animación de rotación + bounce). Variantes: `inline` y `fullscreen`.
- Reemplazar en `Protected` el "Cargando..." por `<RugbyLoader fullscreen />`.
- Crear hook `useDataLoader` o simplemente reemplazar los `Skeleton`/textos "Cargando" comunes con el loader (al menos en listas principales y dashboard coach).

### Estructura técnica

```
SQL (supabase--migration):
  - CREATE TABLE recurring_schedules (...)
  - CREATE TABLE physio_slots (...)
  - GRANT + RLS (coach manages, athletes view available slots y reservan los suyos)
  - Función reserve_physio_slot(slot_id) que valida y crea appointment atómicamente
  - Función generate_events_from_schedule(schedule_id, until_date) para expandir

Frontend:
  - src/components/RugbyLoader.tsx (nuevo)
  - src/components/RecurringDialog.tsx (reusable para training y fisio)
  - src/routes/recuperar.tsx (nuevo)
  - src/routes/reset-password.tsx (nuevo)
  - src/routes/coach.calendario.tsx (editar: botón recurrente, listar series)
  - src/routes/coach.fisio.tsx (editar: tab slots, generar slots, ver reservas)
  - src/routes/atleta.fisio.tsx (editar: sección "Reservar turno")
  - src/routes/index.tsx (editar: quitar CTA duplicado)
  - src/routes/login.tsx (editar: link recuperar contraseña)
  - src/routes/registro.tsx (editar: validación robusta password, ocultar campos físicos para coach)
  - src/lib/protected.tsx (editar: usar RugbyLoader)
  - src/lib/password-validation.ts (nuevo: zod schema + helper)
  - Pasada de español neutro en routes principales
```

### Notas
- Las series recurrentes se materializan en `calendar_events` / `physio_slots` para 90 días hacia adelante; al frenar, se borran los futuros que no estén ya reservados/asistidos.
- Los slots reservados pueden cancelarse por el atleta (libera el slot) si está en la semana en curso, manteniendo el patrón actual.
- Loader pelota: SVG inline, sin dependencias adicionales.
