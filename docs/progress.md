# Progreso — Cantixplora v0.1 (Cimientos) — CERRADO 2026-09-12

## Estado: v0.1 verificado en dispositivo real y cerrado

El usuario ha probado el flujo completo (registro → login → pantalla "Hola, {nombre}")
en Expo Go sobre un móvil físico, contra el backend real desplegado en el VPS
(Supabase self-hosted + Postgres local en `127.0.0.1:5432`, migración aplicada). Resultado:
funciona de principio a fin y muestra el nombre real del usuario autenticado (no datos
simulados del prototipo).

Evidencia adicional recogida en esta sesión (dentro del VPS, mismo entorno que corre el backend):

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

Lo que **no** se ha verificado explícitamente en esta sesión ni se ha confirmado con el
usuario: el checklist de accesibilidad VoiceOver/TalkBack sobre la pantalla de login
(punto 7 de la lista "qué faltaba" original, más abajo). Si no se ha hecho, queda como
deuda a cerrar antes de considerar el checklist de accesibilidad de la fase 100% cumplido
(ver CLAUDE.md, sección "Antes de dar por cerrada cualquier fase").

## Qué se completó en v0.1 (además de lo de más abajo)

- Supabase self-hosted desplegado en el VPS (Coolify) y backend apuntando a él.
- Migración inicial de Prisma aplicada a la base de datos real (`prisma migrate status` → up to date).
- Backend NestJS corriendo y accesible desde la app mobile (`EXPO_PUBLIC_API_URL`).
- App mobile probada en Expo Go en dispositivo físico: registro, login y lectura de `/users/me` reales,
  sin datos del prototipo (`userId === "me"`, "Ana García", etc.).

## Qué se hizo en el scaffold inicial (rama `claude/cantixplora-v0-1-setup-fc92dk`, ya en GitHub)

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

## Decisión de infraestructura (tomada con el usuario en esta sesión)

- **VPS contratado:** Hostinger, Francia, Ubuntu 24.04, 2 vCPU / 8 GB RAM / 100 GB NVMe.
  IP: `89.116.38.172` (dato no sensible, es pública).
- **Coolify ya instalado** en el VPS (`http://89.116.38.172:8000`), usuario admin ya creado por el usuario.
- **Plan:** desplegar Supabase self-hosted en el propio VPS vía la plantilla de "Services" de Coolify,
  usando dominios automáticos `*.sslip.io` (no hay dominio propio comprado todavía, no hace falta —
  sslip.io resuelve solo a la IP y Coolify gestiona el certificado Let's Encrypt).
- **Importante:** el Supabase Cloud temporal (proyecto `cantixplora-dev`, ref `trehtmuyyxzdcaymmszy`) se
  creó solo para probar el flujo de Auth desde una sesión sin acceso de red al VPS. Al montar el Supabase
  self-hosted del VPS, hay que generar credenciales NUEVAS para ese proyecto (no reutilizar las del Cloud)
  y actualizar `apps/backend/.env` para apuntar ahí.

## Por qué se cambió de sesión

La sesión anterior (Claude Code on the web) tiene la salida de red bloqueada por política de la
organización: no puede hacer SSH ni llegar a `supabase.co` ni a la IP del VPS (solo un allowlist de
dominios). Por eso no pudo aplicarse la migración ni configurarse el servidor desde ahí. Se decidió
instalar Claude Code directamente en el VPS (o ejecutarlo desde el ordenador del usuario) para tener
acceso de red real y poder trabajar directamente sobre el servidor.

## Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada en las pantallas de v0.1 (login/registro/"Hola, {nombre}").
- [x] Probado en dispositivo real con Expo Go (confirmado por el usuario 2026-09-12), no solo compilado.
- [ ] Checklist de accesibilidad VoiceOver/TalkBack sobre la pantalla de login — **pendiente de confirmación
      explícita**. No se ha verificado en esta sesión ni el usuario lo ha mencionado al cerrar v0.1. Revisar
      antes de asumirlo hecho.

## Pendiente para v0.2 (no empezar sin que se pida explícitamente)

Ver `docs/roadmap.md` para el alcance de la siguiente fase.

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Una sesión = una fase del roadmap — no adelantar v0.2 sin petición explícita.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
