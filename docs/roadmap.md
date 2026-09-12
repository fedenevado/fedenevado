# Roadmap — Cantixplora

Una sesión = una fase. No se empieza una fase sin que el usuario lo pida
explícitamente, aunque la fase siguiente ya esté planificada aquí (ver
CLAUDE.md, "Reglas de trabajo").

Cada fase, antes de cerrarse, pasa por el checklist de CLAUDE.md
("Antes de dar por cerrada cualquier fase"): sin botones sin acción real,
filtros/estado persistente, accesibilidad (VoiceOver/TalkBack), probado en
Expo Go en dispositivo real.

## v0.1 — Cimientos ✅ (cerrado 2026-09-12)

Monorepo (pnpm workspaces), backend NestJS + Prisma + Postgres, Supabase Auth
self-hosted en el VPS. Registro/login reales, pantalla "Hola, {nombre}"
contra `/users/me`. Sin datos simulados del prototipo.

## v0.2 — Amigos ✅ (cerrado 2026-09-12)

Sistema de amistades: buscar usuarios, enviar/aceptar solicitud, listar
amigos y solicitudes pendientes. Backend (`FriendshipsModule`) + pantalla
`friends.tsx` conectada a la API real.

Explícitamente fuera de alcance (decisión del usuario, quedan en backlog):
- **Eliminar amigo** → backlog v1.0+.
- **"+ Invitar amigos"** (compartir invitación fuera del flujo de creación
  de plan) → depende de Planes, se retoma en v0.3 o v0.4.
- **"Buscar hueco común"** (disponibilidad compartida entre amigos) →
  depende de Calendario, se retoma en v0.4.

## v0.3 — Planes

CRUD completo de planes (viaje/comida/evento/plan casual). RSVP con gate +
confirmación explícita de "no voy". Públicos/privados, con aprobación de
solicitudes en planes públicos. Permisos de gestión de invitados para el
propietario (expulsar, aprobar, etc. — verificando pertenencia en cada
endpoint, no solo en el cliente).

Incluye el flujo de **invitado sin cuenta**: unirse a un plan público desde
un enlace, sin registrarse (ver CLAUDE.md, sección Auth del prototipo).
Requiere rate-limit en el endpoint de invitación por link.

Candidato a incluir aquí (si tiene sentido una vez se vea el flujo real):
"+ Invitar amigos" dentro de la gestión de un plan ya creado.

## v0.4 — Calendario

Vista mensual navegable (swipe), días con múltiples eventos, integrado con
los planes de v0.3. Disponibilidad compartida entre amigos ("buscar hueco
común"), que quedó pendiente de v0.2 por depender de este calendario.

## v0.5 — Gastos

Reparto parcial de gastos por plan, balances simplificados, cerrar cuentas,
marcar transferencias como pagadas (dispara notificación → depende de que
exista el sistema de notificaciones o al menos su modelo base).

## v0.6 — Chat

Chat en tiempo real por plan vía Socket.io.

## v0.7 — Listas

Listas compartidas por plan, con plantillas guardables, editables y
gestionables desde Perfil.

## v0.8 — Tareas de ruta

Tareas compartibles con amigos dentro de un plan, con checklist propia por
usuario, y vista agregada en Inicio.

## v0.9 — Notificaciones

Centro de notificaciones real, todas clicables (llevan a la
pantalla/pestaña correspondiente). Push con Firebase Cloud Messaging.
Conecta con los disparadores ya anticipados en v0.5 (transferencia marcada
como pagada) y en el resto de fases.

## v1.0 — Pulido y cierre

- Accesibilidad: repaso completo VoiceOver/TalkBack de **todas** las
  pantallas (no solo la última tocada), WCAG 2.1 AA de principio a fin.
- Seguridad: repaso final de CORS, rate-limits, verificación de pertenencia
  en todos los endpoints, logs sin datos sensibles.
- Rendimiento y limpieza general antes de cualquier release pública.

## v1.0+ — Backlog (sin fecha, no implementar sin pedirlo explícitamente)

- Eliminar amigo.
- Mejoras derivadas de uso real una vez haya usuarios probando la app.
- Cualquier idea que surja durante v0.1–v1.0 y no encaje en la fase activa
  se anota aquí en lugar de implementarse fuera de orden.
