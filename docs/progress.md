# Progreso — Cantixplora

## v1.0 — Lanzamiento (beta cerrada) — en curso

Alcance acordado con el usuario, dividido en pasos: **A** pulido general de
UX, **B** backend del centro de notificaciones, **C** pantalla mobile de
notificaciones, **D** onboarding (registro + añadir 2-3 amigos guiado).
**Paso E (push real con FCM)** queda aparte, aplazado explícitamente hasta
que el usuario esté listo para salir de Expo Go y montar un development
build con EAS + un proyecto de Firebase real — decisión tomada con el
usuario antes de empezar a programar esta fase (2026-09-15).

### Paso A — Pulido general de UX: hecho

Auditoría hecha con `grep` sobre las 11 pantallas de `apps/mobile/src/app/`
(back buttons, colores de fondo, `KeyboardAvoidingView`, indicadores de
carga). Dos hallazgos concretos, corregidos — nada más se encontró suelto
o inconsistente entre pantallas:

- **Color de fondo con typo**: `list-templates.tsx` usaba `#F5F5F3` en el
  botón "+" de añadir elemento, en vez del `#F5F5F2` que usa el resto de la
  app para ese mismo tono. Corregido.
- **Sin `KeyboardAvoidingView`**: `friends.tsx`, `plan-form.tsx`,
  `plans.tsx` (filtros de fecha) y `list-templates.tsx` tenían `TextInput`
  sin evitar que el teclado tapase contenido (ya lo tenían `login.tsx`,
  `forgot-password.tsx` y `reset-password.tsx`). Añadido en los 4, con
  `behavior="padding"` en iOS, igual que las pantallas de auth.
- Además, en `friends.tsx` el contenido (resultados de búsqueda,
  solicitudes) **no estaba dentro de ningún `ScrollView`** — con una lista
  larga de amigos/solicitudes, las filas de abajo quedarían inalcanzables,
  y el problema se agrava justo con el teclado abierto (los resultados de
  la búsqueda aparecen debajo del propio input). Se envolvió en
  `ScrollView` con `keyboardShouldPersistTaps="handled"` (igual que
  `login.tsx`), y se añadió el mismo prop a los `ScrollView` ya existentes
  de `plan-form.tsx`, `plans.tsx` y `list-templates.tsx` para poder tocar
  filas/botones sin tener que cerrar el teclado primero con un toque
  aparte.

Evidencia:
```
$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled ... (1274 modules) — sin errores
Exported: dist
```

No verificado todavía: prueba visual en Expo Go de estos 4 archivos
(el cambio es de comportamiento del teclado, no se puede confirmar solo
con `tsc`/bundle).

### Paso B — Backend del centro de notificaciones: hecho, probado con tests unitarios

- **Dos disparadores nuevos** (antes solo existía `expense_settled`, de
  v0.4): `plan_invite` en `PlansService` — al crear un plan con invitados y
  al añadir invitados nuevos en `updatePlan` (solo a quien se invita de
  nuevo, no a todo el mundo cada vez que se edita el plan) — y
  `new_expense` en `ExpensesService.createExpense` — a todos los demás
  participantes del plan (no solo a quienes están en el reparto, igual
  criterio que la visibilidad de gastos), nunca a quien creó el gasto.
- `apps/backend/src/notifications/` (`NotificationsModule`/`Controller`/
  `Service`) nuevo, registrado en `app.module.ts`. Endpoints:
  `GET /notifications`, `PATCH /notifications/:id/read`,
  `PATCH /notifications/read-all`. Sin cambios de schema — `Notification`
  ya existía completo desde el scaffold inicial.
- El schema no guarda el texto de la notificación (correcto, cero datos de
  prueba) ni tiene relación directa `actorId → User`: el mensaje a mostrar
  y la pestaña de destino (`detalles`/`gastos`/`chat`, según el tipo) se
  calculan en el backend a partir de `type` + nombre del actor + título del
  plan, con una consulta en lote (no N+1) para resolver actores y planes.
  Cubre los 8 valores de `NotificationType` aunque hoy solo dos los disparan
  código (los otros son fallback defensivo, no invención de comportamiento
  nuevo).
- **Simplificación consciente en `expense_settled`**: el mensaje no incluye
  el importe (`"{actor} marcó un pago como hecho en {plan}"`), porque el
  importe vive en `Payment`, no en `Notification`, y cruzarlos de forma
  fiable habría requerido más que este paso — no es una omisión, es una
  decisión tomada en esta sesión para no ampliar el alcance del Paso B.
- **Gap de schema conocido desde v0.4** (`notifications.plan_id` sin FK con
  cascade): manejado defensivamente sin tocar el schema — si el plan de una
  notificación ya no existe, esa notificación se descarta de la lista (no
  tendría a dónde llevar al tocarla, y toda notificación debe ser
  clicable). Cubierto por test unitario.
- Solo el propietario de una notificación puede marcarla como leída
  (`ForbiddenException` si no) — cubierto por test unitario.

Evidencia:
```
$ pnpm --filter backend test
Test Suites: 10 passed, 10 total
Tests:       89 passed, 89 total   (antes: 79 — +10 de notificaciones)

$ pnpm --filter backend build
> nest build   (sin errores)

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀   (sin migración nueva)
```

### Verificado contra el backend/DB reales en esta sesión (curl)

Escenario de extremo a extremo con 2 cuentas desechables creadas y
eliminadas en esta misma sesión (`qa-notif-a/b@example.com`, borradas de
Supabase Auth vía API admin y de `users`/`friendships`/`notifications` al
terminar — sin rastro): A y B amigas; A crea un plan invitando a B →
notificación `plan_invite` para B ("QA Notif a te invitó a Cena de
prueba", `targetTab: "detalles"`); B confirma RSVP y añade un gasto de 40€
repartido entre las dos → notificación `new_expense` para A ("QA Notif b
añadió un gasto en Cena de prueba", `targetTab: "gastos"`).

- **Solo el destinatario recibe cada notificación**: confirmado — B no
  recibió `new_expense` (fue quien creó el gasto) y A no recibió
  `plan_invite` (fue quien invitó). **Confirmado.**
- **Autorización de "marcar como leída"**: B intenta marcar como leída la
  notificación de A → `403` ("Esta notificación no te pertenece."); A
  marca la suya → `200`, y al volver a listar aparece `read: true`.
  **Confirmado.**
- **Marcar todas como leídas**: B → `200`, su notificación pasa a
  `read: true`. **Confirmado.**
- **Filtrado defensivo del gap de FK sin cascade**: A borra el plan →
  `GET /notifications` de ambas devuelve `[]` inmediatamente (no un error,
  no un objeto con `plan: null`), mientras que por `psql` se confirmó que
  las 2 filas de `notifications` siguen físicamente en la base, huérfanas
  (`plan_id` apuntando a un plan que ya no existe) — el gap sigue ahí tal
  como se documentó en v0.4, pero la API nunca expone una notificación sin
  dónde llevar al tocarla. **Confirmado.**

### Paso C — Mobile: pantalla de notificaciones: implementado, pendiente de tu prueba en Expo Go

- `apps/mobile/src/app/notifications.tsx` nueva: lista de notificaciones
  reales (`api.listNotifications`), "Marcar todas como leídas (N)" solo
  visible si hay alguna sin leer, estado vacío, cada fila **clicable**
  (navega a `/plan/:id?tab=<detalles|gastos|chat>` y marca esa notificación
  como leída) — ninguna fila sin acción, como exige `CLAUDE.md`. El
  indicador de "no leída" nunca es solo color: hay una etiqueta de texto
  ("Nueva") además del borde/punto de color, y el mensaje va en negrita.
- `apps/mobile/src/app/plan/[id].tsx` acepta ahora un query param `tab`
  opcional para abrir directamente en Detalles/Gastos/Chat al llegar desde
  una notificación (antes solo tenía `id`).
- Entrada nueva "Avisos" en la fila de navegación de `home.tsx`, con el
  número de no leídas entre paréntesis cuando hay alguna — la fila de
  navegación se envolvió en un `ScrollView` horizontal para que quepan los
  5 botones sin desbordar en pantallas estrechas (~400px), en vez de
  arriesgarse a que el nuevo botón se corte.
- Nuevos tipos/métodos en `api/client.ts`: `AppNotification`,
  `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
- Accesibilidad incluida ya en esta pasada: `accessibilityLabel` que
  incluye "Nueva" cuando no está leída, roles de botón, 44×44pt.

Evidencia:
```
$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled ... — sin errores
Exported: dist
```

No verificado todavía: prueba visual en Expo Go (abrir notificaciones
reales, tocar una y comprobar que el plan se abre en la pestaña correcta,
marcar todas como leídas).

### Paso D — Onboarding: implementado, pendiente de tu prueba en Expo Go

No hay maqueta de esto en `docs/cantixplora-prototype.jsx` (fase sin
referencia de comportamiento, diseño propuesto y no objetado por el
usuario antes de programar):

- `apps/mobile/src/app/onboarding.tsx` nueva, 2 pasos en un solo archivo
  (mismo patrón que los pasos de `plan-form.tsx`): (1) bienvenida breve con
  el nombre real del usuario; (2) "Añade a tus primeros amigos" —
  reutiliza `api.searchFriends`/`sendFriendRequest`/`acceptFriendRequest`
  (mismo comportamiento que `friends.tsx`: "añadir" envía una solicitud,
  no crea la amistad al instante, porque requiere aceptación mutua) con un
  contador de solicitudes enviadas. **"Saltar" siempre visible en ambos
  pasos** — nunca un muro obligatorio, principio de accesibilidad/UX
  explícito en `CLAUDE.md`.
- **Sin campo nuevo en el schema**: no hay ningún `onboardingCompleted`
  persistido. Se decide solo por el flujo de esta sesión de la app: en
  `login.tsx`, `submit()` marca un estado local `justRegistered` justo
  antes de llamar a `register()` (no a `login()`), y el `<Redirect>` que ya
  existía tras autenticar usa ese estado para mandar a `/onboarding` en vez
  de `/home` solo cuando viene de un registro nuevo. Volver a iniciar
  sesión (o que el token se restaure solo al abrir la app) nunca vuelve a
  mostrar el onboarding.

Evidencia:
```
$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled ... — sin errores
Exported: dist
```

No verificado todavía: prueba visual en Expo Go — registrar una cuenta
nueva de verdad y comprobar que aparece el onboarding (y no al volver a
iniciar sesión con una cuenta existente), que "Saltar" funciona en ambos
pasos, y que enviar/aceptar solicitudes desde ahí deja el mismo estado que
se vería luego en la pantalla Amigos.

### Paso extra — Barra de navegación inferior fija (pedido explícito del usuario, 2026-09-15)

El usuario pidió sustituir la fila de botones de texto (Planes/Amigos/
Perfil/Salir) por una barra de pestañas real y fija, con 5 elementos según
descripción exacta suya (Inicio/Planes/"+" flotante/Amigos con badge/
Perfil con avatar) — **esto revierte explícitamente** la decisión de
"no tocar la navegación" tomada al planificar v0.6 y el Paso C de v1.0 (ver
notas de esos bloques): el usuario tiene autoridad para ampliar el alcance,
y aquí lo hizo con una instrucción muy concreta.

Dos aclaraciones antes de programar (avisadas al usuario, no asumidas en
silencio):
- No llegó ninguna imagen adjunta a esta sesión, solo la descripción en
  texto (bastante precisa, suficiente para implementar).
- El prototipo **no tiene** ningún "Cerrar sesión" (su login no autentica
  de verdad, nunca hubo sesión que cerrar). Sí tiene una pantalla de
  Perfil/Ajustes real con filas "Plantillas de listas", "Notificaciones",
  "Sincronizar calendario", "Cuenta" — pero las 3 últimas están sin
  `onClick` en el prototipo (mismo patrón inerte que "+ Invitar amigos").
  Se colocó "Cerrar sesión" en Perfil (única ubicación razonable, dado que
  ya no hay fila propia para ello), y **no se copiaron** las 3 filas sin
  función real.

**Cambio de arquitectura de navegación**: de `Stack` puro a
`Stack` + grupo `(tabs)` con `Tabs` anidado (patrón estándar de
expo-router — un grupo de ruta no cambia la URL, así que `/home`,
`/plans`, `/friends`, `/profile` siguen siendo las mismas URLs de
siempre, ningún otro archivo tuvo que cambiar sus enlaces):

- `apps/mobile/src/app/(tabs)/_layout.tsx` nuevo: `<Tabs>` con 5
  `<Tabs.Screen>` — Inicio (icono `Home`), Planes (icono `ListChecks`),
  un tab "fantasma" central (`new`) cuyo `tabBarButton` es el botón "+"
  circular naranja (#FF5A3C) elevado (`marginTop: -28`), que intercepta el
  toque (`listeners.tabPress` con `preventDefault`) y navega directamente
  a `/plan-form` en vez de cambiar de pestaña; Amigos (icono `Heart`,
  relleno cuando está activa, con `tabBarBadge` numérico = solicitudes de
  amistad pendientes + notificaciones sin leer, mismo criterio que el
  prototipo); Perfil (avatar circular con las iniciales reales del
  usuario en vez de icono genérico).
- `apps/mobile/src/app/(tabs)/new.tsx`: placeholder inerte (nunca se
  monta de verdad, existe solo porque expo-router exige un archivo físico
  por cada `<Tabs.Screen>`).
- `apps/mobile/src/badges/badge-context.tsx` nuevo: `BadgeProvider` +
  `useBadges()`, monta en `_layout.tsx` raíz (envuelve a `AuthProvider`
  hacia dentro). Expone `amigosBadge` y `refreshBadges()`; se llama desde
  `home.tsx`/`friends.tsx` al cargar y tras aceptar/rechazar una
  solicitud, para que el badge se actualice sin polling.
- **Dependencia nueva**: `lucide-react-native` + `react-native-svg`
  (`npx expo install`, versión resuelta automáticamente por Expo para el
  SDK actual) — mismos iconos que usa el prototipo (Home/ListChecks/
  Heart/Plus), en vez de un sustituto aproximado de otra librería.
  Funcionan en Expo Go sin dev client (son JS + SVG, sin código nativo
  propio).
- **Los 4 archivos existentes se movieron** a `(tabs)/` (mismo nombre,
  misma URL): `home.tsx`, `plans.tsx`, `friends.tsx`, `profile.tsx`. A los
  3 primeros se les quitó el botón "‹ Volver" (ya no tiene sentido en una
  pestaña raíz) y el `paddingTop: 56` fijo se sustituyó por
  `useSafeAreaInsets()` (más correcto que el número fijo que ya traían de
  antes, ahora que no hay una fila de navegación propia ocupando ese
  espacio).
- `home.tsx` perdió también su fila de navegación completa y el estado de
  notificaciones que solo existía para pintar el contador — ese contador
  ahora vive en el badge de la pestaña Amigos vía `BadgeProvider`.
- `friends.tsx` ganó un botón "Avisos" en su cabecera (antes vivía en la
  fila de navegación de Inicio) que navega a `/notifications` — coherente
  con el prototipo, donde el inbox de notificaciones conceptualmente vive
  dentro de Amigos (el badge ya sumaba solicitudes + no leídas ahí).
- `profile.tsx` rediseñado: avatar circular grande con iniciales (76px,
  fondo `#161B2E`), tarjeta con nombre/email, sección "Ajustes" con
  "Plantillas de listas" (la única fila real), y botón "Cerrar sesión"
  (antes en la fila de navegación de Inicio, ahora aquí).

Evidencia:
```
$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled 53725ms node_modules/expo-router/entry.js (3244 modules)
Exported: dist
```
El salto de 1274 a 3244 módulos es esperable (nuevas dependencias:
lucide-react-native, react-native-svg, y el navegador de tabs de React
Navigation que expo-router trae mono-repo pero no se usaba hasta ahora).
Sin errores de bundling — en particular, expo-router valida en tiempo de
build que no haya rutas duplicadas, y no falló, lo que descarta un
conflicto entre `(tabs)/home.tsx` y el `app/index.tsx` que ya existía en
la raíz (ambos podrían haber colisionado en "/" si no se hubiera montado
bien el grupo de ruta).

**No tengo forma de generar una captura de pantalla real en este
entorno** (no hay simulador/emulador con salida visual disponible aquí) —
por eso esta descripción es exhaustiva en vez de una imagen. Lo que sí
puedo confirmar con evidencia real son los comandos de arriba. La
verificación visual (que se vea y se comporte como la captura de
referencia) solo la puedes hacer tú en Expo Go.

### Paso extra 2 — Auditoría completa contra el prototipo, y 3 correcciones (2026-09-16)

A petición del usuario, se hizo una auditoría pantalla a pantalla contra
`docs/cantixplora-prototype.jsx` (Login, detalle de plan, pestaña Planes,
Perfil, Calendario) comparando colores, textos, elementos y comportamiento
sin asumir nada por existir el archivo. Se encontraron varias desviaciones;
el usuario decidió: aplazar "El Plan" (itinerario) a post-v1.0 con nota
explícita en `docs/roadmap.md` (se había quedado fuera de toda fase por
omisión — nunca se anotó pendiente, a diferencia del resto de piezas de
Planes que sí quedaron en backlog); marcar el acceso de invitado sin
cuenta como pendiente en `CLAUDE.md` y `docs/roadmap.md` (no existe
todavía, y sin él un plan público por enlace no se puede abrir de verdad
sin cuenta); y corregir ahora 3 hallazgos concretos.

**2a — Selector de fecha nativo en filtros de Planes**: `(tabs)/plans.tsx`
usaba `TextInput` de texto libre pidiendo "AAAA-MM-DD" a mano. Sustituido
por `PickerField` (el mismo componente que ya usa `plan-form.tsx`), con
selector nativo y `minimumDate` en "Hasta" para no permitir un rango
invertido.

**2b — Cabecera del detalle de plan**: `plan/[id].tsx` tenía una cabecera
plana (solo "‹ Volver" + título) visible únicamente en cierto contexto.
Ahora es una franja de color por tipo de plan (`planTypeColor`), visible
en las 4 pestañas (Detalles/Chat/Listas/Gastos, no solo en Detalles), con
subtítulo de lugar+fecha+hora, badge de RSVP tocable (abre el mismo
`ChangeRsvpModal` de siempre) y un stack de hasta 4 avatares de
confirmados que abre la nueva hoja "Confirmados".

**2c — Enlace de invitación + aprobación de solicitudes (planes
privados)**: al investigar esto salió un hallazgo adicional, confirmado
con el usuario antes de programar — los planes privados no existían de
forma funcional (sin campo `visibility` en los DTOs, sin toggle en
`plan-form.tsx`, y sin ningún punto de entrada real que generase una
`JoinRequest`; en el propio prototipo `joinRequests` es solo dato de
ejemplo hardcodeado). Se amplió el alcance con permiso explícito del
usuario:

- Backend (`apps/backend/src/plans/`): `visibility` en `CreatePlanDto`/
  `UpdatePlanDto` y en `PlanSummary`; `PlansService.getOrCreateInvitation`
  (idempotente, solo-owner), `joinViaInvitationToken` (público → une
  directo; privado → crea `JoinRequest` pendiente + notifica al owner con
  `join_request_received`, tipo que ya estaba anticipado en el schema
  desde v1.0 Paso B pero nunca se disparaba), `listJoinRequests`,
  `approveJoinRequest` (crea participante + notifica
  `join_request_approved`) y `rejectJoinRequest`. Nuevo
  `InvitationsController` (`POST /invitations/:token/join`, con
  `@Throttle` igual que el resto de endpoints sensibles). **Sin
  migración de Prisma** — el modelo (`Invitation`, `JoinRequest`,
  `PlanParticipant.role`, `Plan.visibility`) ya existía completo en
  `docs/schema.prisma` desde el scaffold inicial.
- Mobile: toggle Pública/Privada en `plan-form.tsx`; nuevo
  `guest-list-sheet.tsx` (enlace copiable con `expo-clipboard`, generado
  vía `Linking.createURL()` de `expo-linking` para que funcione tanto en
  Expo Go como en un build futuro; sección de solicitudes pendientes con
  aprobar/rechazar si el plan es privado; lista de confirmados con badges
  ORGANIZADOR/SIN CUENTA); nueva ruta `app/invite/[token].tsx` que
  consume el enlace para un usuario ya autenticado (público → une y
  navega al plan; privado → mensaje de solicitud pendiente). El acceso
  sin cuenta en absoluto (`GuestPlanPreview` del prototipo) sigue fuera
  de alcance, tal como quedó anotado en `docs/roadmap.md`.
- No se implementó "quitar participante" del plan (sí está en el
  prototipo) — no se pidió para este bloque, queda anotado en el propio
  código como ampliación posible si se pide más adelante.

Evidencia:
```
$ pnpm --filter backend prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ pnpm --filter backend test
Test Suites: 10 passed, 10 total
Tests:       102 passed, 102 total
(27 en plans.service.spec.ts, 14 de ellos nuevos para invitación/solicitudes)

$ pnpm --filter backend build
(sin errores)

$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled ... (3251 modules) — sin errores
Exported: dist
```

**No verificado todavía (requiere tu dispositivo, Expo Go)**: crear un
plan privado y comprobar el toggle; copiar el enlace desde "Confirmados"
y abrirlo con otra cuenta — debe aparecer como solicitud pendiente;
aprobarla y comprobar que la persona pasa a participante y le llega la
notificación; repetir con un plan público y comprobar que se une directo;
comprobar visualmente la cabecera de color/RSVP/avatares en las 4
pestañas y el selector de fecha nativo en Planes. Accesibilidad
(VoiceOver/TalkBack) de todo lo nuevo de este bloque tampoco está
confirmada todavía — se suma a la deuda de accesibilidad de más abajo.

## Regla de proceso añadida (decisión del usuario, 2026-09-15)

Al cerrar v0.2, "+ Invitar amigos" y "Buscar hueco común" se dejaron fuera
de alcance con nota explícita en `docs/roadmap.md` (dependían de
Planes/Calendario). Pero al cerrar v0.5 no se dejó ninguna nota explícita
de que `InicioView` del prototipo (que depende de `CalendarView`, aún
inexistente en v0.5) quedaba sin implementar — se omitió en silencio en
vez de anotarse como dependencia pendiente. El usuario pidió que esto no
vuelva a pasar: **añadido un ítem al checklist "Antes de dar por cerrada
cualquier fase" de `CLAUDE.md`** — cualquier pantalla/comportamiento del
prototipo que dependa de una fase futura y por eso no se implemente entera
debe quedar anotado explícitamente aquí como "pendiente, depende de vX.X",
nunca omitido sin más.

## v0.6 — Calendario y Tareas de ruta — CERRADO 2026-09-15

Confirmado por el usuario: "v0.6 cerrado y verificado" (probado en Expo
Go en dispositivo real). La confirmación no mencionó específicamente el
checklist de accesibilidad VoiceOver/TalkBack — siguiendo el mismo
criterio que v0.4/v0.5 (no marcar como resuelta sin confirmación
explícita), se añade a la "Deuda de accesibilidad arrastrada" al final de
este documento en vez de darla por buena.

"Buscar hueco común" y la tarjeta de gasto pendiente siguen aplazadas tal
como se anotó al cerrar cada bloque (ver detalle debajo).

Alcance acordado con el usuario, dividido en 3 bloques: **Bloque 1**
backend de Reminders ("tareas de ruta"), **Bloque 2** componente de
Calendario + `DaySheet` en mobile, **Bloque 3** `InicioView` completo
reemplazando el placeholder de `home.tsx`. Guardando progreso real en este
documento al terminar cada bloque (no solo al final de la fase), para que
si la sesión se corta por contexto largo, la siguiente pueda retomar sin
perder trabajo — como ya pasó en la sesión anterior, que se cortó a mitad
de la planificación.

**Pendiente, depende de fase futura (anotado explícitamente, no omitido en
silencio — ver regla de proceso arriba):**
- **"Buscar hueco común" (disponibilidad compartida entre amigos)**:
  `docs/roadmap.md` lo lista dentro de v0.6, pero el usuario aprobó
  explícitamente solo los 3 bloques de arriba (sin mencionar este). Requiere
  un endpoint nuevo (`GET /friendships/availability?friendIds=...`, con
  cuidado de privacidad: solo ocupado/libre por fecha, nunca qué plan es —
  mismo criterio que `FriendCalendarSheet` del prototipo) que no existe
  todavía. Queda pendiente, depende de que se pida explícitamente (v0.6
  ampliada o v0.7).
- **Tarjeta "Debes X€" (`myPendingExpense`) en Inicio**: necesitaría un
  endpoint agregado nuevo entre todos los planes del usuario (hoy
  `GET /plans/:id/expenses/balances` es por plan, no hay agregado
  cross-plan). No es parte de "Calendario y Tareas de ruta". Queda
  pendiente, depende de que se pida explícitamente.

### Bloque 1 — Backend de Reminders: implementado y probado con tests unitarios

- `apps/backend/src/reminders/` (`RemindersModule`/`Controller`/`Service`,
  DTOs `create-reminder`, `update-reminder`, `reminder-done`,
  `create-reminder-item`, `update-reminder-item`), registrado en
  `app.module.ts`. Usa los modelos `Reminder`/`ReminderShare`/
  `ReminderItem` que ya estaban en `docs/schema.prisma` desde el scaffold
  inicial (sin `planId`: es una entidad de usuario, no de plan). **Sin
  cambios de modelo de datos, sin migración nueva** — confirmado con
  `npx prisma migrate status` → "Database schema is up to date!" (2
  migraciones, ninguna nueva).
- Endpoints: `GET/POST /reminders`, `PATCH/DELETE /reminders/:id`,
  `PATCH /reminders/:id/done`, `POST/PATCH/DELETE
  /reminders/:id/items[/:itemId]`.
- Reglas de pertenencia (decisión tomada en esta sesión, ver
  `reminders.service.ts`): ve una tarea quien es `ownerId` o está en
  `sharedWith` (a cualquier otra persona, 404 en vez de 403, mismo criterio
  de privacidad que `PlansService` con los planes). Solo el propietario
  edita título/fecha/hora, gestiona con quién se comparte (solo amigos con
  amistad `accepted`, mismo check que `PlansService.assertFriends`) y borra
  la tarea. Propietario **o** compartidos: marcar hecha/pendiente y
  gestionar el checklist (añadir/marcar/borrar elementos) — checklist
  colaborativa, mismo criterio que Listas v0.5. Sin notificación al
  compartir (el prototipo no la dispara).

Evidencia:
```
$ pnpm --filter backend test -- reminders
PASS src/reminders/reminders.service.spec.ts
Tests:       11 passed, 11 total

$ pnpm --filter backend test
Test Suites: 9 passed, 9 total
Tests:       79 passed, 79 total

$ pnpm --filter backend build
> nest build   (sin errores)

$ cd apps/backend && npx prisma validate
The schema at prisma/schema.prisma is valid 🚀

$ npx prisma migrate status
2 migrations found in prisma/migrations
Database schema is up to date!
```

### Verificado contra el backend/DB reales en esta sesión (curl)

Escenario de extremo a extremo con 3 cuentas desechables creadas y
eliminadas en esta misma sesión (`qa-reminders-a/b/c@example.com`, borradas
de Supabase Auth vía API admin y de `users`/`friendships` al terminar — sin
rastro): A y B se hacen amigas (`accepted`); A crea una tarea de ruta
("Preparar maletas", con hora y 1 elemento inicial) compartida con B; B la
ve en su propio `GET /reminders` (visibilidad por `sharedWith`, no solo por
`ownerId`).

- **Colaborativo (owner o compartido)**: B marca la tarea como hecha
  (`PATCH /reminders/:id/done`) → `200`; B marca el elemento del checklist
  como hecho → `200`. **Confirmado.**
- **Solo propietario**: B intenta cambiar el título → `403` ("Solo quien
  creó la tarea de ruta puede editarla."); B intenta borrarla → `403`
  (mismo mensaje). **Confirmado.**
- **Compartir solo con amigos aceptados**: A intenta compartir con un UUID
  v4 válido que no es su amigo → `403` ("Solo puedes compartir tareas de
  ruta con amigos existentes."). **Confirmado.**
- **Privacidad (404, no 403, para quien no tiene acceso)**: una tercera
  cuenta QA sin amistad ni comparticiones intenta tocar la tarea →
  `404` ("Tarea de ruta no encontrada."), no revela que existe.
  **Confirmado.**
- A añade un segundo elemento al checklist → `200`, aparece en la
  respuesta. A (propietaria) borra la tarea → `200`; comprobado que ya no
  existe (`404` incluso para ella). **Confirmado** (el borrado en cascada
  de `ReminderItem`/`ReminderShare` ya estaba garantizado por el schema,
  no hizo falta comprobarlo aparte).

Nota de proceso: el proceso NestJS que sirve el puerto 3000 no es el mismo
que las ventanas `nest start --watch` visibles en tmux (esas estaban
inactivas) — es un `node dist/main` que se reinicia solo al cambiar
`dist/` (confirmado indirectamente: `GET /reminders` sin token devolvió
`401`, no `404`, lo que solo pasa si la ruta ya está registrada). No se
tocó ni se reinició ningún proceso manualmente.

### Bloque 2 — Mobile: componente de Calendario + DaySheet: implementado, sin verificar en Expo Go todavía

- `apps/mobile/src/plans/calendar-view.tsx`: grid mensual navegable (botones
  prev/mes/siguiente + swipe táctil con `onTouchStart`/`onTouchEnd`, mismo
  umbral de 45px que el prototipo), días con evento(s) coloreados por tipo
  (multi-evento con puntos por tipo) y punto de "tiene tarea de ruta"
  (relleno si pendiente, hueco si todas hechas). Sin modo "no compacto"
  (lista de planes del mes debajo del grid): no se ha construido porque
  ninguna pantalla lo necesita todavía (no hay pestaña "Calendario"
  separada, solo el grid embebido en Inicio) — evitar código sin usar.
- `apps/mobile/src/plans/day-sheet.tsx`: hoja modal para un día concreto —
  planes de ese día (tap → `onOpenPlan`), tareas de ruta de ese día
  (checkbox marcar hecha/pendiente, tap para editar), formulario
  crear/editar tarea (título, hora opcional vía `PickerField`, compartir
  con amigos — deshabilitado si quien ve no es el propietario, igual que el
  backend), checklist con añadir/marcar/borrar elemento, borrar tarea con
  confirmación. Botones "+ Evento" (llama a `onAddEvent(date)`) y
  "+ Tarea".
- `apps/mobile/src/app/plan-form.tsx`: acepta ahora `initialDate` e
  `initialInvitedIds` (query params) para precargar fecha/amigos al crear
  un plan desde el Calendario — antes solo soportaba `id` para editar.
- Nuevos tipos y métodos en `api/client.ts` para Reminders (`Reminder`,
  `ReminderItem`, `ReminderShare`, `ReminderInput`, `listReminders`,
  `createReminder`, `updateReminder`, `deleteReminder`, `setReminderDone`,
  `addReminderItem`, `updateReminderItem`, `deleteReminderItem`).
- Accesibilidad ya incluida en esta pasada (no aplazada): `accessibilityLabel`
  descriptivo en cada celda del calendario (día + qué hay ese día),
  checkboxes con `accessibilityRole="checkbox"` + `accessibilityState`,
  áreas táctiles ≥44pt en celdas/botones.

**Importante — todavía no es visible en la app:** estos dos componentes
(`CalendarView`, `DaySheet`) no están conectados a ninguna pantalla
todavía — ese cableado es el Bloque 3 (`InicioView`). Hasta que se
complete el Bloque 3, la app seguirá viéndose igual que ahora en Expo Go;
eso es lo esperado, no un fallo. Verificado con
`cd apps/mobile && npx tsc --noEmit` → sin errores de tipos, pero sin
prueba visual todavía porque no hay dónde montarlos.

### Bloque 3 — Mobile: InicioView completo: implementado, pendiente de tu prueba en Expo Go

- `apps/mobile/src/app/home.tsx` **reescrito por completo** — ya no es el
  placeholder de v0.1 ("Hola, {nombre}" + 4 botones). Ahora carga
  `api.listPlans` + `api.listReminders` + `api.listFriends` reales (nada de
  `userId === "me"` ni datos fijos del prototipo) y muestra: estado vacío
  ("Aún no tienes planes" + "+ Crear tu primer plan") cuando no hay ni
  planes visibles ni tareas de ruta; "Tu próximo plan" (si no es hoy);
  `CalendarView` embebido con `onSelectDay` → abre `DaySheet`; sección
  "Hoy" (planes + tareas de ruta con checkbox, o los botones "+ Evento"/
  "+ Tarea" si no hay nada); "Tus tareas de ruta" (próximas 4 sin hacer);
  "Próximamente" (siguientes planes); enlace "Ver todos los planes →".
  Los botones Planes/Amigos/Perfil/Salir que ya existían se mantienen como
  una fila superior compacta (no se ha tocado la arquitectura de
  navegación — sigue sin tab bar persistente, fuera de alcance de esta
  fase, ver plan acordado).
- Todas las mutaciones de tareas de ruta (crear, editar, borrar, marcar
  hecha, checklist) llaman a la API real y recargan `plans`+`reminders`+
  `friends` (`loadAll`), tanto desde las filas de Inicio como desde dentro
  del `DaySheet`.
- Accesibilidad incluida ya en esta pasada: `accessibilityLabel` en cada
  fila/botón, checkboxes con `accessibilityRole="checkbox"` +
  `accessibilityState`, error con `accessibilityLiveRegion="polite"`,
  áreas táctiles ≥44pt.

Evidencia:
```
$ cd apps/mobile && npx tsc --noEmit -p tsconfig.json
(sin salida — sin errores de tipos)

$ npx expo export --platform android
Android Bundled 47939ms node_modules/expo-router/entry.js (1274 modules)
Exported: dist
```
El bundle de Metro/Hermes completo (1274 módulos, incluye `home.tsx`,
`calendar-view.tsx`, `day-sheet.tsx`, `plan-form.tsx` y `client.ts`
actualizados) se generó sin errores — más fuerte que solo `tsc`, porque
también valida resolución de módulos y APIs de React Native en tiempo de
bundle. `dist/` no se comprometió (ya está en `.gitignore`).

### No verificado todavía (requiere tu dispositivo)

- **Prueba real en Expo Go**: navegar el calendario (mes anterior/
  siguiente y swipe), tocar un día con/sin planes/tareas, crear una tarea
  de ruta con checklist y compartida con un amigo, marcarla hecha desde
  Inicio y desde el DaySheet, editarla, borrarla, crear un evento desde
  "+ Evento" del DaySheet y comprobar que llega con la fecha ya
  preseleccionada al formulario de plan.
- **Checklist de accesibilidad VoiceOver/TalkBack** sobre `home.tsx`,
  `calendar-view.tsx` y `day-sheet.tsx` — no confirmado explícitamente
  todavía (mismo criterio que el resto de fases: no se marca como
  resuelto sin que tú lo confirmes).
- Petición real contra el backend/DB en vivo (curl) del Bloque 1
  (Reminders) — sigue pendiente, ver nota en ese bloque.

### Checklist "antes de dar por cerrada la fase" (CLAUDE.md) — estado parcial

- [x] Sin botones/filas sin acción real conectada: revisado — todo botón
      interactivo de `home.tsx`/`day-sheet.tsx`/`calendar-view.tsx` llama a
      la API real o navega.
- [ ] Filtros/estado de UI persistente: no verificado todavía en uso real
      (p. ej. que el mes navegado en el calendario no se pierda de forma
      rara al abrir/cerrar el `DaySheet` — debería persistir porque
      `CalendarView` no se desmonta, pero falta confirmarlo en dispositivo).
- [ ] Checklist de accesibilidad VoiceOver/TalkBack — no confirmado.
- [ ] Probado en dispositivo real con Expo Go — no confirmado.
- [x] Dependencias de fase futura anotadas explícitamente, no omitidas en
      silencio — ver "Pendiente, depende de fase futura" al principio de
      esta sección de v0.6 (disponibilidad compartida y tarjeta de gasto
      pendiente).

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
- [ ] VoiceOver/TalkBack sobre `home.tsx`, `calendar-view.tsx` y
      `day-sheet.tsx` (v0.6) — sigue pendiente; el usuario confirmó
      "v0.6 cerrado y verificado" (2026-09-15) sin mencionar el lector de
      pantalla, mismo criterio que las fases anteriores.
- [ ] VoiceOver/TalkBack sobre la cabecera nueva de `plan/[id].tsx` y
      sobre `guest-list-sheet.tsx`/`invite/[token].tsx` (auditoría v1.0,
      2026-09-16) — sin confirmar todavía, no se ha probado en dispositivo.

## Reglas que siguen aplicando (de CLAUDE.md, no repetir el resto aquí)

- Una sesión = una fase del roadmap — no adelantar v0.3 sin petición explícita.
- Evidencia real, no promesas — pegar salidas de comandos/curl.
- Seguridad: CORS explícito, rate-limit en auth, IDs UUID, nunca loguear contraseñas.
- Accesibilidad WCAG 2.1 AA en cualquier pantalla nueva.
