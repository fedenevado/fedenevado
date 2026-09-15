# Roadmap — Cantixplora

Una sesión = una fase. No se empieza una fase sin que el usuario lo pida
explícitamente, aunque la fase siguiente ya esté planificada aquí (ver
CLAUDE.md, "Reglas de trabajo").

Cada fase, antes de cerrarse, pasa por el checklist de CLAUDE.md
("Antes de dar por cerrada cualquier fase"): sin botones sin acción real,
filtros/estado persistente, accesibilidad (VoiceOver/TalkBack), probado en
Expo Go en dispositivo real.

Este orden es el que se ha seguido realmente en la práctica (fijado con el
usuario el 2026-09-14) y sustituye a cualquier numeración anterior de este
documento. No debe volver a desviarse sin que el usuario lo pida
explícitamente.

## v0.1 — Cimientos ✅ (cerrado 2026-09-12)

Monorepo (pnpm workspaces), backend NestJS + Prisma + Postgres, Supabase Auth
self-hosted en el VPS. Registro/login reales, pantalla "Hola, {nombre}"
contra `/users/me`. Sin datos simulados del prototipo.

## v0.2 — Amigos ✅ (cerrado 2026-09-12)

Sistema de amistades: buscar usuarios, enviar/aceptar solicitud, listar
amigos y solicitudes pendientes. Backend (`FriendshipsModule`) + pantalla
`friends.tsx` conectada a la API real.

Explícitamente fuera de alcance (decisión del usuario, quedan en backlog):
- **Eliminar amigo** → backlog.
- **"+ Invitar amigos"** (compartir invitación fuera del flujo de creación
  de plan) → se retoma cuando tenga sentido dentro de Planes.
- **"Buscar hueco común"** (disponibilidad compartida entre amigos) →
  depende de Calendario, se retoma en v0.6.

## v0.3 — Planes ✅ (cerrado 2026-09-12)

CRUD completo de planes (viaje/comida/evento/plan casual). RSVP con gate +
confirmación explícita de "no voy". Invitar amigos existentes.

Explícitamente fuera de alcance de v0.3 (quedan en backlog, no tienen fase
asignada todavía): enlace de invitación pública, planes públicos/privados
con aprobación de solicitudes, invitado sin cuenta vía enlace, gestión de
permisos de invitados. Retomar antes de v1.0 si se decide que son
necesarios para el lanzamiento.

## v0.4 — Gastos ✅ (cerrado funcionalmente 2026-09-14)

Reparto parcial de gastos por plan, balances simplificados con reparto de
transferencias mínimo, "Cerrar cuentas" con confirmación, marcar
transferencias como pagadas (crea `Notification`, sin pantalla propia
todavía). Ver `docs/progress.md` para el detalle y para la deuda de
accesibilidad (VoiceOver/TalkBack) que sigue sin confirmación explícita.

## v0.5 — Chat y Listas (en curso)

- **Chat por plan**: mensajes en tiempo real o con polling simple para
  empezar (Socket.io básico o polling cada pocos segundos es suficiente
  esta fase; no hace falta nada más sofisticado todavía).
- **Listas/checklists por plan**: crear listas, añadir/marcar/eliminar
  elementos.
- **Plantillas de listas**: guardables, editables y gestionables desde
  Perfil → Plantillas de listas, y también creables al vuelo desde una
  lista existente de un plan.

Ver `docs/progress.md` para el plan de implementación detallado (dividido
en bloque Listas+Plantillas y bloque Chat) y las decisiones tomadas con el
usuario.

## v0.6 — Calendario y Tareas de ruta

- **Calendario**: vista mensual navegable (swipe), días con múltiples
  eventos, integrado con los planes. Disponibilidad compartida entre
  amigos ("buscar hueco común"), pendiente desde v0.2.
- **Tareas de ruta**: compartibles con amigos dentro de un plan, con
  checklist propia por usuario, y vista agregada en Inicio.

## v1.0 — Lanzamiento (pulido, push, onboarding)

- **Notificaciones**: centro de notificaciones real, todas clicables
  (llevan a la pantalla/pestaña correspondiente). Conecta con los
  disparadores ya anticipados en fases anteriores (`expense_settled`,
  `new_message`, etc. — ver deuda aplazada en `docs/progress.md`). Push
  con Firebase Cloud Messaging.
- **Onboarding**: primer arranque para una cuenta nueva.
- **Accesibilidad**: repaso completo VoiceOver/TalkBack de **todas** las
  pantallas (no solo la última tocada), WCAG 2.1 AA de principio a fin —
  incluye cerrar la deuda aplazada de fases anteriores.
- **Seguridad**: repaso final de CORS, rate-limits, verificación de
  pertenencia en todos los endpoints, logs sin datos sensibles.
- Rendimiento y limpieza general antes de cualquier release pública.

## Backlog (sin fecha, no implementar sin pedirlo explícitamente)

- Eliminar amigo.
- Enlace de invitación pública a un plan, planes públicos/privados con
  aprobación de solicitudes, invitado sin cuenta vía enlace, gestión de
  permisos de invitados (ver nota en v0.3).
- Mejoras derivadas de uso real una vez haya usuarios probando la app.
- Cualquier idea que surja durante el desarrollo y no encaje en la fase
  activa se anota aquí en lugar de implementarse fuera de orden.
