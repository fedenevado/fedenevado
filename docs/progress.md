# Progreso — Cantixplora

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

No verificado en esta sesión (pendiente, ver checklist más abajo):
- Prueba manual en Expo Go en dispositivo físico del flujo completo
  (buscar → enviar solicitud → aceptar desde la segunda cuenta → aparece en
  "Amigos" de ambas).
- Checklist VoiceOver/TalkBack de la pantalla `friends.tsx`.

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada: buscar, enviar, aceptar
      y rechazar solicitud están todos conectados a la API real. "Eliminar
      amigo" no aparece en la UI (se decidió no implementarlo, no es un
      botón huérfano).
- [x] Filtros/estado de UI: la pantalla `friends.tsx` recarga
      amigos/solicitudes al entrar y tras cada acción (no depende de estado
      que se pierda al cambiar de pantalla).
- [ ] **Probado en dispositivo real con Expo Go** — pendiente de que el
      usuario lo haga con dos cuentas (pasos abajo, en la respuesta de esta
      sesión). No dar la fase por 100% cerrada hasta confirmarlo.
- [ ] **Checklist de accesibilidad VoiceOver/TalkBack** sobre `friends.tsx`
      — pendiente de que el usuario lo pruebe en el móvil. Igual que quedó
      pendiente en v0.1 (nunca se confirmó explícitamente tampoco), esto se
      arrastra como deuda de accesibilidad a revisar. **No asumir que está
      hecho hasta que el usuario lo confirme.**

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

- [ ] VoiceOver/TalkBack sobre login/registro (v0.1).
- [ ] VoiceOver/TalkBack sobre `friends.tsx` (v0.2).

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Una sesión = una fase del roadmap — no adelantar v0.3 sin petición explícita.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
