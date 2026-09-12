# Progreso — Cantixplora

## v0.3 — Planes (núcleo) — EN CURSO, pendiente de verificación manual (2026-09-12)

Alcance acordado con el usuario (más estrecho que `docs/roadmap.md`):
CRUD de los 4 tipos de plan, invitar amigos existentes (sin link todavía),
RSVP (Voy/Tal vez/No voy) con gate + confirmación de "No voy", y pestaña
Planes con filtros y las secciones Pendientes/Próximos/Pasados. Fuera de
alcance explícitamente: enlace de invitación, público/privado con
aprobación, invitado sin cuenta, gestión de permisos de invitados, y todo
Gastos (v0.4/v0.5). No se tocó `docs/schema.prisma` — no hizo falta ninguna
migración nueva de Prisma, las tablas ya existían desde v0.1.

Plan de implementación completo (contexto, alcance exacto, orden de
construcción): `/root/.claude/plans/swift-prancing-panda.md`.

### Qué se implementó

- **Backend** (`apps/backend/src/plans/`): `PlansModule`,
  `PlansController`, `PlansService`, DTOs (`create-plan`, `update-plan`,
  `rsvp`), tests unitarios (`plans.service.spec.ts`). Endpoints:
  `GET /plans`, `GET /plans/:id`, `POST /plans`, `PATCH /plans/:id`,
  `DELETE /plans/:id`, `PATCH /plans/:id/rsvp`. Cada endpoint verifica
  pertenencia (solo el owner edita/borra; solo un participante puede hacer
  RSVP; solo se puede invitar a amigos con amistad `accepted`).
- **Mobile**: `app/plans.tsx` (lista con filtros por tipo/fecha y secciones
  Pendientes/Próximos/Pasados, igual lógica que el prototipo),
  `app/plan-form.tsx` (crear/editar en 3 pasos: título+tipo, fecha/hora/
  lugar, invitar amigos), `app/plan/[id].tsx` (detalle: gate "¿Vas a ir?"
  con vista previa, confirmación obligatoria de "No voy" con "Me lo
  pienso"/"No, no voy", lista de participantes con su rsvp, Editar/Eliminar
  para el owner). Botón "Planes" añadido en `home.tsx`. Tipos y métodos
  nuevos en `api/client.ts`. Constantes de tipo de plan (etiqueta + color)
  centralizadas en `src/plans/plan-types.ts`.
- **No** se implementaron aquí las pestañas Chat/Listas/Gastos/El Plan del
  detalle del prototipo — son de fases posteriores.

### Evidencia recogida en esta sesión (VPS, mismo entorno que corre el backend)

```
$ pnpm --filter backend test
PASS src/plans/plans.service.spec.ts (5.292 s)
PASS src/friendships/friendships.service.spec.ts
PASS src/auth/auth.service.spec.ts
PASS src/auth/supabase-auth.guard.spec.ts
Test Suites: 4 passed, 4 total
Tests:       29 passed, 29 total

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ pnpm --filter backend build
> nest build   (sin errores)

$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)
```

Nota de proceso: al correr `npx expo lint` (primera vez que se ejecuta en
este proyecto — no había config de ESLint) se detectó y corrigió un bug real
en `app/plans.tsx`: un `useMemo` se llamaba después de un `return`
condicional, violando las reglas de hooks de React (orden de hooks
inconsistente entre renders). Ya corregido y verificado con `tsc` limpio.
El lint también señaló el mismo patrón (`setState` dentro de un `useEffect`)
en código nuevo de `plan-form.tsx` y en código ya existente de v0.1/v0.2
(`friends.tsx`, `auth-context.tsx`) — es el patrón ya establecido en este
código base para cargar datos al montar una pantalla, no un bug de esta
sesión. El archivo `eslint.config.js` que `expo lint` generó automáticamente
se descartó (no se commiteó): adoptar linting en todo el proyecto es una
decisión aparte que no se ha pedido para v0.3.

### No verificado en esta sesión (pendiente)

- **Prueba manual en Expo Go en dispositivo real** de todo el flujo: crear
  un plan de cada tipo (Viaje/Comida/Evento/Plan casual), invitar a un
  amigo y que le aparezca en su lista de planes, responder RSVP (Voy/Tal
  vez/No voy con la confirmación), cambiar de opinión, editar un plan
  (añadir/quitar invitados) y eliminarlo.
- **Checklist de accesibilidad VoiceOver/TalkBack** sobre las 3 pantallas
  nuevas (`plans.tsx`, `plan-form.tsx`, `plan/[id].tsx`) — recordatorio
  explícito pedido por el usuario. No dar la fase por cerrada sin esto.

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada: revisado — todo botón
      interactivo en las 3 pantallas nuevas llama a la API real o navega.
- [x] Filtros/estado de UI: `plans.tsx` recarga al recuperar el foco
      (`useFocusEffect`); los filtros de tipo/fecha persisten mientras la
      pantalla está montada (no hay caso de "vuelve y se resetea" dentro de
      la sesión de navegación).
- [ ] **Probado en dispositivo real con Expo Go** — pendiente, ver arriba.
- [ ] **Checklist de accesibilidad VoiceOver/TalkBack** — pendiente, ver
      arriba.

## v0.2 — Amigos — CERRADO 2026-09-12

### Qué se implementó

- **Backend** (`apps/backend/src/friendships/`): `FriendshipsModule`,
  `FriendshipsController`, `FriendshipsService`, DTOs de búsqueda y envío de
  solicitud, tests unitarios (`friendships.service.spec.ts`). Usa el modelo
  `Friendship` ya existente en `docs/schema.prisma` (sin tocar el schema).
  - `GET /friendships` — lista de amigos del usuario autenticado.
  - `GET /friendships/requests` — solicitudes pendientes recibidas.
  - `GET /friendships/search?q=` — buscar usuarios (con estado de relación:
    `none` / `pending_sent` / `pending_received` / `friends`).
  - `POST /friendships` — enviar solicitud.
  - `PATCH /friendships/:id/accept` — aceptar solicitud.
  - `DELETE /friendships/:id` — rechazar/cancelar solicitud pendiente.
  - Guard `SupabaseAuthGuard` en todo el controller (autenticación). Cada
    operación verifica pertenencia (solo el destinatario acepta/rechaza lo
    suyo) — no solo autenticación.
- **Mobile**: pantalla `apps/mobile/src/app/friends.tsx` (buscar, enviar
  solicitud, aceptar/rechazar, listar amigos), tipos y llamadas añadidas a
  `apps/mobile/src/api/client.ts`. Botón "Amigos" añadido en `home.tsx` para
  navegar a la pantalla.
- Sin datos simulados del prototipo: todo sale de `/friendships/*` contra la
  base de datos real.

### Explícitamente fuera de alcance de v0.2 (decisión del usuario, 2026-09-12)

- **Eliminar amigo** — no implementado, queda en backlog v1.0+.
- **"+ Invitar amigos"** — no implementado, depende de Planes/Calendario.
- **Buscar hueco común** — no implementado, depende de Calendario.

Ver `docs/roadmap.md` para dónde se retoma cada uno.

### Evidencia recogida en esta sesión (VPS, mismo entorno que corre el backend)

```
$ pnpm --filter backend test
PASS src/friendships/friendships.service.spec.ts (9.617 s)
PASS src/auth/auth.service.spec.ts
PASS src/auth/supabase-auth.guard.spec.ts
Test Suites: 3 passed, 3 total
Tests:       17 passed, 17 total

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ pnpm --filter backend build
> nest build   (sin errores)
```

Verificado por el usuario con dos cuentas reales (confirmación explícita,
2026-09-12): flujo completo buscar → enviar solicitud → aceptar desde la
segunda cuenta → aparece en "Amigos" de ambas, en Expo Go en dispositivo
real. También confirmado: accesibilidad con VoiceOver/TalkBack sobre la
pantalla `friends.tsx`, correcta.

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada: buscar, enviar, aceptar
      y rechazar solicitud están todos conectados a la API real. "Eliminar
      amigo" no aparece en la UI (se decidió no implementarlo, no es un
      botón huérfano).
- [x] Filtros/estado de UI: la pantalla `friends.tsx` recarga
      amigos/solicitudes al entrar y tras cada acción (no depende de estado
      que se pierda al cambiar de pantalla).
- [x] **Probado en dispositivo real con Expo Go** — confirmado por el
      usuario (2026-09-12) con dos cuentas reales: envío, aceptación y
      aparición en la lista de amigos de ambas cuentas.
- [x] **Checklist de accesibilidad VoiceOver/TalkBack** sobre `friends.tsx`
      — confirmado por el usuario (2026-09-12).

**v0.2 queda cerrado y verificado end-to-end.**

## v0.1 — Cimientos — CERRADO 2026-09-12

### Estado: v0.1 verificado en dispositivo real y cerrado

El usuario ha probado el flujo completo (registro → login → pantalla "Hola, {nombre}")
en Expo Go sobre un móvil físico, contra el backend real desplegado en el VPS
(Supabase self-hosted + Postgres local en `127.0.0.1:5432`, migración aplicada). Resultado:
funciona de principio a fin y muestra el nombre real del usuario autenticado (no datos
simulados del prototipo).

Evidencia adicional recogida en esa sesión (dentro del VPS, mismo entorno que corre el backend):

```
$ pnpm --filter backend test
PASS src/auth/auth.service.spec.ts
PASS src/auth/supabase-auth.guard.spec.ts
Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ npx prisma migrate status
1 migration found in prisma/migrations
Database schema is up to date!

$ pnpm --filter backend build
> nest build   (sin errores)
```

Lo que **no** se verificó explícitamente en v0.1 ni se confirmó con el
usuario: el checklist de accesibilidad VoiceOver/TalkBack sobre la pantalla
de login. Sigue como deuda abierta (arrastrada también a v0.2, ver arriba).

### Qué se completó en v0.1

- Supabase self-hosted desplegado en el VPS (Coolify) y backend apuntando a él.
- Migración inicial de Prisma aplicada a la base de datos real (`prisma migrate status` → up to date).
- Backend NestJS corriendo y accesible desde la app mobile (`EXPO_PUBLIC_API_URL`).
- App mobile probada en Expo Go en dispositivo físico: registro, login y lectura de `/users/me` reales,
  sin datos del prototipo (`userId === "me"`, "Ana García", etc.).

### Qué se hizo en el scaffold inicial (rama `claude/cantixplora-v0-1-setup-fc92dk`, ya en GitHub)

- Monorepo pnpm workspaces: `apps/backend` (NestJS) y `apps/mobile` (Expo SDK 57 + Router).
  `.npmrc` con `node-linker=hoisted` (necesario para que Metro/React Native funcione bien con pnpm).
- Backend NestJS:
  - `PrismaModule` + `schema.prisma` completo (26 tablas, sin recortar) copiado en `apps/backend/prisma/`.
  - `SupabaseModule`: dos clientes de Supabase (admin con service_role, auth con anon key).
  - `AuthModule`: `POST /auth/register`, `POST /auth/login` (contra Supabase Auth), sincroniza el `User`
    en la BD propia. Rate-limit con `@nestjs/throttler`.
  - `SupabaseAuthGuard`: valida el JWT de Supabase (HS256, `SUPABASE_JWT_SECRET`) en rutas protegidas.
  - `GET /users/me` protegido, devuelve el usuario real de la BD.
  - Tests unitarios (guard + AuthService, con mocks, sin red): `pnpm --filter backend test` → 6/6 OK.
  - `nest build` compila sin errores.
  - **Migración inicial de Prisma** generada offline con `prisma migrate diff --from-empty`
    (`apps/backend/prisma/migrations/20260909181514_init`, 26 tablas). Ya aplicada a la base de
    datos real del VPS — confirmado con `prisma migrate status` → "Database schema is up to date!".
- Expo (mobile):
  - Pantalla de login/registro real (tabs, validación con texto, `accessibilityLabel`, área táctil ≥44pt)
    conectada al backend vía `EXPO_PUBLIC_API_URL`.
  - Contexto de sesión (`src/auth/auth-context.tsx`) con `expo-secure-store` para el token.
  - Pantalla "Hola, {nombre}" que consulta `/users/me`.
  - Limpiada la plantilla de Expo (quitados componentes/demo/assets sin usar de `create-expo-app`).
- `.env.example` en backend y mobile con las variables necesarias.

### Decisión de infraestructura (tomada con el usuario en la sesión de v0.1)

- **VPS contratado:** Hostinger, Francia, Ubuntu 24.04, 2 vCPU / 8 GB RAM / 100 GB NVMe.
  IP: `89.116.38.172` (dato no sensible, es pública).
- **Coolify ya instalado** en el VPS (`http://89.116.38.172:8000`), usuario admin ya creado por el usuario.
- **Supabase self-hosted** desplegado en el propio VPS vía la plantilla de "Services" de Coolify,
  con dominios automáticos `*.sslip.io` (no hay dominio propio comprado todavía).
- El Supabase Cloud temporal (proyecto `cantixplora-dev`, ref `trehtmuyyxzdcaymmszy`) que se usó para
  probar Auth desde una sesión sin acceso de red al VPS quedó descartado — se usan credenciales del
  Supabase self-hosted del VPS.

### Por qué se cambió de sesión (histórico, ya resuelto)

La sesión anterior (Claude Code on the web) tenía la salida de red bloqueada por política de la
organización: no podía hacer SSH ni llegar a `supabase.co` ni a la IP del VPS. Por eso se instaló
Claude Code directamente en el VPS para tener acceso de red real.

## Pendiente para v0.3 (no empezar sin que se pida explícitamente)

Ver `docs/roadmap.md` — v0.3 es "Planes" (CRUD, RSVP, públicos/privados,
aprobación de solicitudes, invitado sin cuenta vía enlace).

## Deuda de accesibilidad arrastrada (no marcar como resuelta sin confirmación del usuario)

- [ ] VoiceOver/TalkBack sobre login/registro (v0.1) — sigue pendiente,
      nunca se confirmó explícitamente pese al cierre de v0.1.
- [x] VoiceOver/TalkBack sobre `friends.tsx` (v0.2) — confirmado por el
      usuario 2026-09-12.
- [ ] VoiceOver/TalkBack sobre `plans.tsx`, `plan-form.tsx` y `plan/[id].tsx`
      (v0.3) — pendiente de que el usuario lo pruebe en el móvil.

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Una sesión = una fase del roadmap — no adelantar v0.3 sin petición explícita.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
