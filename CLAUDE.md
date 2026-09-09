# Cantixplora

App de organización social: calendario compartido, planes (viaje/comida/evento/plan casual), gastos con reparto parcial, chat, listas con plantillas, tareas de ruta compartibles con checklist propia, login con acceso de invitado sin cuenta. Mercado objetivo: España. Proyecto personal, sin prisa, prioriza calidad y accesibilidad sobre velocidad.

## Estado del prototipo (referencia de comportamiento, no de código a copiar)

El prototipo (`docs/cantixplora-prototype.jsx`) está congelado y validado — 19 componentes, sin errores de sintaxis ni referencias rotas (verificado con esbuild). Cubre:

- Auth: pantalla de login/registro + vista de invitado sin cuenta (unirse a un plan público desde un enlace, sin registrarse)
- Planes: CRUD completo, RSVP con gate + confirmación de "no voy", públicos/privados con aprobación de solicitudes, propietario con permisos de gestión de invitados
- Calendario: navegable (mes, swipe), con días multi-evento, y disponibilidad compartida entre amigos ("buscar hueco común")
- Gastos: reparto parcial, balances simplificados, cerrar cuentas, marcar transferencias como pagadas (dispara notificación)
- Chat y Listas (con plantillas guardables, editables y gestionables desde Perfil)
- Tareas de ruta: compartibles con amigos, con checklist propia, vista agregada en Inicio
- Notificaciones: todas clicables, llevan a la pantalla/pestaña correspondiente

## Stack (no uses versiones ni APIs distintas a estas)

- **Mobile:** React Native + Expo (SDK más reciente estable)
- **Backend:** Node.js + NestJS + TypeScript
- **ORM / DB:** Prisma + PostgreSQL
- **Auth:** Supabase Auth
- **Tiempo real:** Socket.io (chat)
- **Push:** Firebase Cloud Messaging
- **Hosting:** VPS propio con Coolify (no Railway, no Vercel, no Heroku)
- **Gestor de paquetes:** pnpm

## Estructura del repo (monorepo)

```
/apps
  /backend   → NestJS + Prisma
  /mobile    → Expo
/docs
  cantixplora-prototype.jsx   → referencia de comportamiento de cada pantalla
  schema.prisma               → modelo de datos completo y actualizado
  roadmap.md                  → fases v0.1 a v1.0+
```

## Documentos de referencia — consúltalos antes de implementar cualquier pantalla o endpoint

- `docs/cantixplora-prototype.jsx` es la fuente de verdad del **comportamiento** de cada pantalla (qué pasa al tocar cada botón, qué validaciones hay, qué estados existen). Si tienes dudas de cómo debe comportarse algo, mira ahí antes de inventar.
- `docs/schema.prisma` es la fuente de verdad del **modelo de datos**. No crees campos o tablas nuevas sin comprobar antes si ya existen ahí.
- No cambies el modelo de datos sin decirlo explícitamente antes de tocar el schema.

## Reglas de trabajo

- **Una sesión = una fase del roadmap.** No implementes nada de una fase futura sin que se pida explícitamente.
- **Modo plan primero.** Para cualquier cambio que toque más de un archivo, describe el plan antes de escribir código. Espera confirmación.
- **Evidencia, no promesas.** Nunca digas "ya funciona" sin pegar la salida real de un test, build, o petición curl. Si algo no se puede verificar en este entorno, dilo explícitamente en vez de asumir que funciona.
- **Comandos para verificar:**
  - Backend: `pnpm --filter backend test` / `pnpm --filter backend build`
  - Prisma: `pnpm --filter backend prisma validate`
  - Mobile: probar siempre con Expo Go en dispositivo real, no dar por bueno solo por compilar

## Cero contenido de prueba en producción

El prototipo usa datos simulados (`userId === "me"`, usuario fijo "Ana García", array `FRIENDS` fijo, planes de ejemplo). **Nada de esto se copia literalmente.** Todo dato debe venir de la base de datos o del usuario autenticado real. Si al implementar una pantalla ves un nombre, ID o dato que coincide con el prototipo, es una señal de que falta conectar algo a la API real, no una casualidad válida.

El `LoginScreen` del prototipo no valida nada de verdad — cualquier email/contraseña "funciona" y entra directo. Es solo la maqueta visual del flujo; la autenticación real (Supabase Auth) debe implementarse desde cero, sin heredar ese comportamiento.

## Seguridad (aplícalo desde el primer endpoint, no al final)

- IDs siempre UUID, nunca autoincrementales.
- Cada endpoint verifica pertenencia además de autenticación (ej: solo el owner de un plan puede editarlo o expulsar participantes).
- Rate-limit en endpoints públicos (invitación por link) y de autenticación.
- El filtro de visibilidad de listas de invitados (`rsvp_status = yes`) se aplica en el backend, nunca solo en el cliente.
- Nunca loguear contraseñas ni importes de gastos en texto plano innecesariamente.
- CORS explícito al dominio de la app, nunca abierto con `*`.

## Accesibilidad (Ley 11/2023 — WCAG 2.1 AA)

- Todo elemento interactivo lleva `accessibilityLabel` descriptivo.
- El color nunca es el único indicador de estado — siempre acompañado de texto.
- Área táctil mínima 44×44pt.
- Texto debe escalar si el usuario aumenta el tamaño de fuente del sistema.
- Antes de dar una pantalla por cerrada, compruébala con VoiceOver/TalkBack.

## Antes de dar por cerrada cualquier fase

- [ ] Lista explícitamente cualquier botón, icono o fila interactiva sin acción real conectada (ya hubo un caso así en el prototipo — "+ Invitar amigos" sin onClick).
- [ ] Los filtros y estados de UI persisten correctamente al cambiar de pantalla y volver.
- [ ] Checklist de accesibilidad de la fase correspondiente (ver `docs/roadmap.md`) marcado.
- [ ] Probado en dispositivo real con Expo Go, no solo compilado.

## Gestión de contexto en sesiones largas

Si la sesión se alarga mucho, antes de que degrade: pide que escriba el progreso en `docs/progress.md` (qué se hizo, qué falta, decisiones tomadas), limpia el contexto, y retoma leyendo ese archivo en una sesión nueva.
