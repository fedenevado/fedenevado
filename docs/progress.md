# Progreso — Cantixplora

## Pendiente aplazado conscientemente (no es bug, no es "hecho a medias")

- **Recuperación de contraseña — envío de email.** Implementada en código
  de punta a punta (backend: `POST /auth/forgot-password` /
  `POST /auth/reset-password`; mobile: `forgot-password.tsx` /
  `reset-password.tsx`) y verificada funcionando correctamente a nivel de
  lógica — confirmado con logs reales del contenedor de Auth (gotrue) y
  curl contra el backend: la llamada a `resetPasswordForEmail` responde
  `200 {"success":true}` y gotrue procesa la petición
  (`user_recovery_requested`, `status:200`). Lo que no funciona es el
  envío real del email, porque el servicio de Auth self-hosted (Coolify)
  no tiene ningún proveedor SMTP configurado (`GOTRUE_SMTP_HOST` y
  variables relacionadas, vacías). Decisión explícita del usuario
  (2026-09-14): aplazar la configuración de un proveedor SMTP (Resend) a
  más adelante, no es prioritario ahora. **No tratar esto como bloqueante
  en ninguna fase futura del roadmap.** Retomar antes del lanzamiento.
- **Notificación de "nuevo mensaje" en el chat.** El schema ya tiene
  `NotificationType.new_message` previsto, y el patrón ya existe (se usó
  para `expense_settled` en v0.4). Decisión explícita del usuario
  (2026-09-14): no crear esta `Notification` todavía al enviar un mensaje
  — se aplaza a v1.0, cuando se construya el centro de notificaciones de
  verdad, junto con el diseño de cómo se agrupan/marcan como leídas (no
  tiene sentido diseñar eso a ciegas, mensaje a mensaje, sin la pantalla
  real). **No tratar esto como bloqueante en v0.5 ni en fases futuras.**

## v0.5 — Chat y Listas — CERRADO (funcional) 2026-09-15, accesibilidad pendiente

Alcance acordado con el usuario, dividido en dos bloques de trabajo:

**Bloque 1 — Listas + Plantillas**: CRUD de listas y elementos por plan
(crear lista, añadir/marcar/eliminar elemento, eliminar lista con
confirmación), guardar/dejar de guardar una lista como plantilla desde el
propio plan, y gestor de plantillas completo (crear desde cero, editar,
eliminar) accesible desde una nueva pantalla mínima `profile.tsx` (no
existía ninguna pantalla de Perfil todavía). Borrar una plantilla no
afecta a las listas ya creadas a partir de ella (solo desenlaza
`templateId`) — así se comporta el prototipo. `docs/schema.prisma` ya
tenía `List`/`ListItem`/`ListTemplate`/`ListTemplateItem`: **sin cambios
de modelo de datos, sin migración nueva.**

**Bloque 2 — Chat**: mensajes por plan vía REST + polling en el cliente
(~4s, solo con la pestaña en primer plano) — sin Socket.io en esta
pasada, decisión explícita del usuario ("no hace falta WebSockets
sofisticados todavía"). Accesibilidad: los mensajes entrantes se anuncian
con `accessibilityLiveRegion="polite"` (nunca "assertive"), sin
interrumpir lectura en curso — requisito explícito del usuario antes de
cerrar esta fase. Notificación `new_message` aplazada conscientemente
(ver sección al principio de este documento).

Reglas de pertenencia en ambos bloques (mismo criterio que Gastos v0.4):
leer (listas o mensajes) requiere ser participante del plan; escribir
(crear/editar/borrar lista o elemento, enviar mensaje) requiere estar
confirmado (`rsvpStatus: yes`).

### Bloque 1 — Listas + Plantillas: implementado, pendiente de tu prueba en Expo Go

- **Backend**: `apps/backend/src/lists/` (`ListsModule`/`Controller`/`Service`,
  bajo `plans/:planId/lists`) y `apps/backend/src/list-templates/`
  (`ListTemplatesModule`/`Controller`/`Service`, bajo `/list-templates`,
  a nivel de usuario). Endpoints: `GET/POST /plans/:planId/lists`,
  `DELETE /plans/:planId/lists/:listId`, `POST/PATCH/DELETE
  .../lists/:listId/items[/:itemId]`, `POST/DELETE
  .../lists/:listId/template` (guardar/dejar de guardar como plantilla),
  `GET/POST /list-templates`, `PATCH/DELETE /list-templates/:id`. Borrar
  una plantilla desenlaza (`templateId: null`) cualquier lista que la
  usara, sin borrarla — verificado. Si la plantilla enlazada a una lista
  es de otro participante del plan, solo su dueño puede desenlazarla
  (`ForbiddenException`) — caso no cubierto por el prototipo (ahí es
  monousuario), decisión tomada en esta sesión. Tests unitarios
  (`lists.service.spec.ts`, `list-templates.service.spec.ts`) con Prisma
  mockeado.
- **Mobile**: `src/plans/lists-tab.tsx` (nueva pestaña "Listas" en
  `plan/[id].tsx`), `src/app/list-templates.tsx` (gestor completo: crear,
  editar, borrar con confirmación, expandir para ver elementos), y
  `src/app/profile.tsx` — **pantalla nueva, no existía ninguna de Perfil
  todavía** — con un botón "Perfil" en Home y, dentro, la fila "Plantillas
  de listas" que lleva al gestor. Perfil se mantuvo mínimo (nombre + email
  de solo lectura): editar perfil no estaba en el alcance pedido.

Evidencia:
```
$ pnpm --filter backend test
Test Suites: 7 passed, 7 total
Tests:       63 passed, 63 total

$ pnpm --filter backend build
> nest build   (sin errores)

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)
```

Escenario real contra el backend/DB en vivo, con una cuenta QA desechable
(creada y borrada en esta sesión, sin rastro): crear lista vacía, crear
sin título ni plantilla → `400`, añadir 2 elementos, marcar uno hecho,
guardar la lista como plantilla, volver a intentar guardarla → `400` (ya
guardada), crear una segunda lista desde esa plantilla, borrar la lista
original → la plantilla sigue existiendo y la segunda lista sigue intacta,
borrar la plantilla → la segunda lista sigue intacta, solo con
`templateId: null`, borrar un elemento inexistente → `404`. Todo se
comportó como se esperaba.

Nota de proceso: al ejecutar `npx expo lint` puntualmente (para revisar
los archivos nuevos, como en sesiones anteriores) instaló `eslint`/
`eslint-config-expo` en `package.json` pero falló al ejecutar
("Cannot find module 'eslint'", problema de resolución de módulos con
pnpm en este entorno) sin llegar a lintar nada. Revertido por completo
(`package.json`, `pnpm-lock.yaml` resincronizados con `pnpm install`,
`eslint.config.js` generado borrado) — no se comprometió, igual que en
v0.3/v0.4. El `tsc --noEmit` limpio y la revisión manual de hooks
(ningún hook condicional) cubren esta sesión en su lugar.

### Verificado por el usuario en dispositivo real (confirmación explícita, 2026-09-15)

"He probado Chat y Listas en dispositivo real (chat entre dos cuentas,
plantillas de listas gestionables desde Perfil) — todo funciona
correctamente." Cubre el flujo funcional completo de este bloque en Expo
Go. **El flujo funcional de Listas + Plantillas queda cerrado y
verificado end-to-end.**

Al preguntar explícitamente si esto incluía también el checklist de
accesibilidad VoiceOver/TalkBack, el usuario confirmó que **no** — solo
funcional. Queda pendiente, ver "Deuda de accesibilidad arrastrada" al
final de este documento (mismo criterio que v0.4: no marcar como resuelto
sin confirmación explícita).

### Bloque 2 — Chat: implementado, pendiente de tu prueba en Expo Go

- **Backend**: `apps/backend/src/chat/` (`ChatModule`/`Controller`/
  `Service`, bajo `plans/:planId/messages`). `GET` requiere solo ser
  participante del plan (igual que Gastos/Listas); `POST` requiere estar
  confirmado (`rsvpStatus: yes`) y tiene rate-limit propio (20/min) además
  del global. El contenido se recorta en el servidor antes de guardar y
  antes de comprobar que no está vacío. Sin Socket.io en esta pasada —
  decisión ya tomada al planificar este bloque. Tests unitarios
  (`chat.service.spec.ts`) con Prisma mockeado.
- **Mobile**: `src/plans/chat-tab.tsx`, nueva pestaña "Chat" en
  `plan/[id].tsx`. Polling cada 4s mientras la pestaña está montada
  (se detiene sola al cambiar de pestaña, porque el componente se
  desmonta) y además se pausa/reanuda con `AppState` cuando la app pasa a
  segundo plano — para no gastar datos/batería ni chocar con el
  rate-limit sin necesidad. Auto-scroll al final al recibir mensajes.
  **Accesibilidad de mensajes entrantes** (requisito explícito del
  usuario antes de cerrar esta fase): un `Text` con
  `accessibilityLiveRegion="polite"` (nunca "assertive") se actualiza solo
  cuando llegan mensajes nuevos de otra persona (no de una misma, no en la
  carga inicial), así VoiceOver/TalkBack lo anuncia sin interrumpir la
  lectura en curso — pendiente de que el usuario lo confirme con el
  lector de pantalla real, ver checklist abajo.

Evidencia:
```
$ pnpm --filter backend test
Test Suites: 8 passed, 8 total
Tests:       68 passed, 68 total

$ pnpm --filter backend build   → sin errores
$ npx prisma validate           → válido, sin migración
$ cd apps/mobile && npx tsc --noEmit → sin errores
```

**Dos cuentas reales mandándose mensajes entre sí**, tal como pediste —
hecho con dos cuentas QA desechables (creadas y borradas en esta sesión,
sin rastro) contra el backend real: mensaje vacío tras recortar espacios
→ `400`; A envía "Hola B!" → B lo ve con una petición GET (equivalente a
lo que hace el polling); B responde "Hola A, todo listo!" → A ve ambos
mensajes en orden cronológico correcto, con el nombre de quien envía cada
uno. La autorización (solo confirmados envían, cualquier participante
lee) está cubierta por los tests unitarios con Prisma mockeado
(`ForbiddenException` si no confirmado, lectura permitida en `pending`).

Nota de proceso: a mitad de esta verificación, el proceso NestJS de la
sesión tmux dejó de responder con las rutas nuevas (`Cannot POST
/plans/.../messages`, 404) aunque el código compilaba limpio por fuera —
mismo síntoma de caché incremental de TypeScript corrupta que ya apareció
en la sesión anterior (probablemente por el `pnpm install` de esta
sesión). Solución: `rm -rf apps/backend/dist` + reinicio limpio del
proceso en la ventana `backend` de tmux. Tras el reinicio arrancó sin
ningún error y con las rutas de Chat mapeadas correctamente
(`ChatController {/plans/:planId/messages}`); el resto de la verificación
se hizo ya sobre ese proceso limpio.

### Verificado por el usuario en dispositivo real (confirmación explícita, 2026-09-15)

"He probado Chat [...] en dispositivo real (chat entre dos cuentas [...])
— todo funciona correctamente." Cubre el envío/recepción de mensajes
entre dos cuentas reales en Expo Go. **El flujo funcional de Chat queda
cerrado y verificado end-to-end.**

Confirmado explícitamente que esto **no** incluyó el checklist de
accesibilidad VoiceOver/TalkBack — en concreto, sigue sin confirmarse que
un mensaje nuevo se anuncia sin cortar la lectura en curso de otra cosa en
pantalla, que era el requisito explícito del usuario para este bloque.
Ver "Deuda de accesibilidad arrastrada" al final de este documento.

### Cierre de v0.5

Ambos bloques (Listas + Plantillas, y Chat) verificados funcionalmente por
el usuario en dispositivo real el 2026-09-15 (ver secciones de cada
bloque arriba). La accesibilidad VoiceOver/TalkBack de las 4 pantallas
nuevas (`lists-tab.tsx`, `list-templates.tsx`, `profile.tsx`,
`chat-tab.tsx`) queda como deuda pendiente, no bloqueante para seguir con
v0.6, pero sin marcar como resuelta sin confirmación explícita.

## v0.4 — Gastos — CERRADO (funcional) 2026-09-14, accesibilidad pendiente

Alcance acordado con el usuario: Expense/ExpenseSplit con reparto parcial
(selección explícita de participantes), balances por plan con reparto
simplificado (mínimo de transferencias), "Cerrar cuentas" con confirmación
(el prototipo no la tiene — se añadió aquí a propósito, no es una omisión),
marcar transferencia como pagada con notificación, editar/eliminar gastos.
Fuera de alcance: Chat/Listas (v0.5).

Plan de implementación completo (contexto, decisiones de diseño, orden de
construcción): `/root/.claude/plans/swift-prancing-panda.md`.

### Cambio de modelo de datos (aprobado explícitamente por el usuario antes de tocar el schema)

`docs/schema.prisma` no tenía ningún campo para "cuentas cerradas". Se
añadió `PlanFieldConfig.expensesClosed` (booleano, default `false`) — ver
`/root/.claude/plans/swift-prancing-panda.md` para la justificación de por
qué ahí y no en `Plan` directamente. Migración
`20260912174643_add_expenses_closed` generada y aplicada contra la base de
datos real del VPS. `docs/schema.prisma` y `apps/backend/prisma/schema.prisma`
se mantienen idénticos.

### Qué se implementó

- **Backend** (`apps/backend/src/expenses/`): `ExpensesModule`,
  `ExpensesController`, `ExpensesService`, DTOs (`create-expense`,
  `update-expense`, `mark-paid`), tests unitarios
  (`expenses.service.spec.ts`). Endpoints, todos bajo
  `plans/:planId/expenses`: `GET /`, `POST /`, `PATCH /:expenseId`,
  `DELETE /:expenseId`, `GET /balances`, `POST /close-accounts`,
  `POST /reopen-accounts`, `PATCH /settlements/pay`,
  `DELETE /settlements/pay`. Reglas de pertenencia: solo participantes
  confirmados (`rsvpStatus = 'yes'`) gestionan gastos y cierran/reabren
  cuentas; solo las dos personas implicadas en una transferencia concreta
  pueden marcarla/desmarcarla como pagada; con las cuentas cerradas no se
  puede crear/editar/eliminar gastos. Los balances y el reparto
  simplificado se recalculan en cada petición (no se guardan); lo único
  persistido es qué transferencias ya se pagaron (`Payment`), comparando
  también el importe (tolerancia 1 céntimo) para no dar por pagada una
  deuda que cambió tras editar un gasto. El importe del pago lo calcula
  el servidor, nunca se confía en el que mande el cliente. Al marcar una
  transferencia como pagada se crea una `Notification`
  (`type: expense_settled`) para la otra persona — no hay pantalla de
  notificaciones todavía (es v0.9), la evidencia de que se creó se
  recogerá por consulta directa a la base de datos.
- **Mobile**: pestaña "Gastos" nueva en `app/plan/[id].tsx` (junto a
  "Detalles", con pestañas locales) que renderiza
  `src/plans/expenses-tab.tsx`: tarjeta de balance, tarjeta de "Cuentas
  cerradas · Resultado final" con el reparto simplificado y el botón
  marcar/pagado (activo solo para las dos personas implicadas), lista de
  gastos con aviso "(no todos)" cuando no participan todos los
  confirmados, editar/eliminar, formulario de añadir/editar gasto
  (descripción, importe, quién pagó, checklist de reparto), y el botón
  "Cerrar cuentas" con diálogo de confirmación nuevo / "Volver a editar
  gastos" sin confirmación (reabrir no es destructivo). Tipos y métodos
  nuevos en `api/client.ts`.

### Evidencia recogida en esta sesión (VPS, mismo entorno que corre el backend)

```
$ cd apps/backend && npx prisma migrate dev --name add_expenses_closed
Applying migration `20260912174643_add_expenses_closed`
Your database is now in sync with your schema.

$ npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ npx prisma migrate status
2 migrations found in prisma/migrations
Database schema is up to date!

$ pnpm --filter backend test
Test Suites: 5 passed, 5 total
Tests:       38 passed, 38 total

$ pnpm --filter backend build
> nest build   (sin errores)

$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)
```

Nota de proceso: se volvió a usar `expo lint` puntualmente (sin comprometer
`eslint.config.js`, igual que en v0.3) para revisar los archivos nuevos —
no encontró ningún bug nuevo de reglas de hooks esta vez, solo el mismo
patrón ya establecido (`setState` dentro de `useEffect` al cargar datos)
que en el resto del código base. También se subieron a 44×44pt varios
botones/chips de la pestaña Gastos que habían quedado por debajo del
mínimo táctil (revisión de accesibilidad propia antes de pedir la prueba
con lector de pantalla).

### Verificado contra el backend/DB reales en sesión posterior (2026-09-14)

Escenario de extremo a extremo con 3 cuentas desechables creadas y
eliminadas en esta misma sesión (`qa-expenses-a/b/c@example.com`, borradas
de Supabase Auth y de `users`/`friendships` al terminar — no queda rastro):
plan con A de owner, B y C invitados y confirmados (`rsvpStatus: yes`),
gasto de 30€ pagado por A con reparto parcial (solo A y B, C fuera),
balance correcto (`A: +15, B: -15, C: 0`).

- **Autorización de "marcar como pagada"**: C (no implicado en la
  transferencia B→A) recibe `403 Forbidden` con mensaje específico
  ("Solo las personas implicadas en la transferencia pueden marcarla como
  pagada."), tanto antes como después de cerrar cuentas. B (sí implicado)
  recibe `403` distinto antes de cerrar cuentas ("Cierra las cuentas antes
  de marcar transferencias como pagadas.") y `200 OK` con
  `settlement[0].paid: true` después de cerrarlas. **Confirmado.**
- **Notificación al marcar como pagada**: verificado por `psql` contra la
  base de datos real — se creó una fila en `notifications` con
  `type = expense_settled`, `user_id` = A (quien cobró), `actor_id` = B
  (quien pagó), `plan_id` correcto, `read = false`. **Confirmado.**
- Hallazgo menor de esquema (no corregido, fuera de alcance de esta
  sesión): `notifications.plan_id` no tiene FK con cascade — al borrar un
  plan, sus notificaciones no se borran solas (quedan con `plan_id`
  apuntando a un plan que ya no existe). No afecta a v0.4; anotarlo para
  cuando se implemente la pantalla de notificaciones (v0.9) — un enlace
  "ir al plan" desde una notificación así tendría que manejar el caso de
  plan borrado.

### Verificado por el usuario en dispositivo real (confirmación explícita, 2026-09-14)

"He probado v0.4 (Gastos) en dispositivo real con al menos 3 participantes
reales repartiendo gastos, balances correctos, cerrar cuentas y marcar
pagos — todo funciona correctamente." Cubre el flujo funcional completo en
Expo Go. **El flujo funcional de v0.4 queda cerrado y verificado
end-to-end.**

Al preguntar explícitamente si esta prueba incluía también el checklist de
accesibilidad VoiceOver/TalkBack sobre la pestaña Gastos, el usuario
describió solo la prueba funcional (participantes, balances, cerrar
cuentas, marcar pagos) sin mencionar el lector de pantalla — se interpreta
como **no confirmado todavía**, no como un "sí" implícito. Añadido a la
deuda de accesibilidad arrastrada (ver sección al final de este documento),
siguiendo el mismo criterio que ya arrastra la deuda de v0.1: no marcar
como resuelto sin confirmación explícita.

### No verificado todavía (requiere el dispositivo del usuario)

- **Checklist de accesibilidad VoiceOver/TalkBack** sobre la pestaña
  Gastos — sigue pendiente de confirmación explícita (ver arriba). No es
  bloqueante para seguir con v0.5, pero no se debe dar por resuelto sin que
  el usuario lo confirme.

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada: revisado — todo botón
      interactivo de la pestaña Gastos llama a la API real.
- [x] Filtros/estado de UI: no aplica gran cosa aquí (no hay filtros
      nuevos); el formulario de gasto se resetea correctamente tras
      guardar/cancelar.
- [x] **Probado en dispositivo real con Expo Go** — confirmado por el
      usuario (2026-09-14).
- [ ] **Checklist de accesibilidad VoiceOver/TalkBack** — no confirmado
      explícitamente, ver arriba.

## v0.3 — Planes (núcleo) — CERRADO 2026-09-12

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

### Verificado por el usuario (confirmación explícita, 2026-09-12)

Probado en Expo Go en dispositivo real, con dos cuentas: creación de un
plan de cada tipo, invitación de amigo existente, flujo de RSVP completo
(Voy/Tal vez/No voy, incluida la confirmación "¿De verdad no vienes?" con
"Me lo pienso"/"No, no voy"), edición de invitados y eliminación de plan.
**v0.3 queda cerrado y verificado end-to-end.**

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md)

- [x] Sin botones/filas sin acción real conectada: revisado — todo botón
      interactivo en las 3 pantallas nuevas llama a la API real o navega.
- [x] Filtros/estado de UI: `plans.tsx` recarga al recuperar el foco
      (`useFocusEffect`); los filtros de tipo/fecha persisten mientras la
      pantalla está montada (no hay caso de "vuelve y se resetea" dentro de
      la sesión de navegación).
- [x] **Probado en dispositivo real con Expo Go** — confirmado por el
      usuario (2026-09-12).
- [x] **Checklist de accesibilidad VoiceOver/TalkBack** — confirmado por el
      usuario (2026-09-12).

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
- [x] VoiceOver/TalkBack sobre `plans.tsx`, `plan-form.tsx` y `plan/[id].tsx`
      (v0.3) — confirmado por el usuario 2026-09-12.
- [ ] VoiceOver/TalkBack sobre `expenses-tab.tsx` (v0.4) — sigue pendiente;
      la confirmación del usuario 2026-09-14 fue solo de la prueba
      funcional, no mencionó el lector de pantalla.
- [ ] VoiceOver/TalkBack sobre `lists-tab.tsx`, `list-templates.tsx` y
      `profile.tsx` (v0.5) — sigue pendiente; confirmado explícitamente
      por el usuario 2026-09-15 que su prueba fue solo funcional.
- [ ] VoiceOver/TalkBack sobre `chat-tab.tsx` (v0.5) — sigue pendiente,
      incluido el requisito específico de que un mensaje nuevo se anuncie
      (`accessibilityLiveRegion="polite"`) sin cortar la lectura en curso;
      confirmado explícitamente por el usuario 2026-09-15 que su prueba
      fue solo funcional.

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Una sesión = una fase del roadmap — no adelantar v0.3 sin petición explícita.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
