# Progreso — Cantixplora v0.1 (Cimientos)

## Qué se ha hecho (rama `claude/cantixplora-v0-1-setup-fc92dk`, ya en GitHub)

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
  - **Migración inicial de Prisma** ya generada y en el repo (`apps/backend/prisma/migrations/20260909181514_init`),
    creada offline con `prisma migrate diff --from-empty` (sin conexión a BD, porque la sesión donde se
    generó tenía la red bloqueada hacia supabase.co). Contiene las 26 tablas. **Aún no aplicada a ninguna
    base de datos real** — pendiente de `prisma migrate deploy` contra la BD del Supabase self-hosted del VPS.
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

## Qué falta para cerrar v0.1

1. Desplegar Supabase self-hosted en el VPS vía Coolify (Services → Supabase template).
2. Actualizar `apps/backend/.env` con las credenciales del Supabase self-hosted nuevo.
3. Aplicar la migración: `pnpm --filter backend prisma migrate deploy`.
4. Desplegar el backend NestJS en Coolify (o correrlo con `pnpm --filter backend start:dev` para probar
   primero) apuntando a ese Supabase.
5. Probar con curl real: `/auth/register`, `/auth/login`, `/users/me`.
6. Configurar `apps/mobile/.env` con la URL pública del backend y probar en Expo Go: registro → pantalla
   "Hola, {nombre}".
7. Marcar el checklist de accesibilidad del CLAUDE.md (VoiceOver/TalkBack) sobre la pantalla de login.
8. Confirmar con el usuario que todo lo anterior queda verificado con evidencia antes de dar v0.1 por cerrada.

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Nada de v0.2 en adelante todavía.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
