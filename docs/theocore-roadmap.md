# TheoCore Roadmap

## Objetivo
Convertir TheoCore en un panel operativo robusto, escalable y gobernable, con una base clara para administracion global, agencias, travelers, brains y configuracion tecnica.

## Principios
- No reescribir todo a la vez.
- Priorizar control operativo antes que nuevas pantallas.
- Estandarizar UX, permisos, feedback y acceso a datos.
- Evitar logica duplicada entre TheoCore, agency y traveler.
- Cualquier cambio destructivo debe tener historial, confirmacion y opcion de reversa cuando aplique.

## Estado actual
- TheoCore ya tiene navegacion consistente y modulos CRUD base para Agencias, Travelers globales y Global team.
- Existe integracion con Supabase Auth, tablas de agencias, agency_team, travelers, agency_travelers y ai_assistants.
- Falta endurecer permisos, auditoria, busqueda avanzada, soft delete y dashboard operativo real.

## Arquitectura objetivo
### UI
- Un solo patron visual para todos los modulos CRUD.
- Tablas/listados con filtros, paginacion, seleccion multiple y acciones en lote.
- Modales reutilizables para crear, editar, confirmar y ver historial.
- Toaster global y manejo uniforme de errores.

### Datos
- Tipado fuerte por entidad.
- Hooks por modulo para lectura/escritura.
- Capas separadas:
  - `src/features/theocore/*`
  - `src/lib/supabase/*`
  - `src/lib/validation/*`
  - `src/lib/rbac/*`

### Gobierno
- RBAC real por rol y accion.
- Auditoria para cambios de negocio.
- Soft delete en entidades clave.
- Historial por entidad.

## Fase 1 - Fundacion operativa
### 1. Dashboard real en `/intranet/thecore`
#### Objetivo
Dar visibilidad inmediata del estado del sistema.

#### KPIs minimos
- agencias activas
- agencies inactivas
- travelers totales
- users globales
- brains activos
- invitaciones pendientes
- travelers nuevos en 7 dias
- actividad reciente

#### Entregables
- tarjetas KPI
- bloque de actividad reciente
- bloque de accesos rapidos
- resumen por estado de agencies y team

#### Fuentes de datos
- `agencies`
- `travelers`
- `agency_team`
- `core_users`
- `ai_assistants`
- futura tabla `audit_log`

### 2. Toasts y errores centralizados
#### Objetivo
Eliminar `alert()` y feedback inconsistente.

#### Entregables
- `ToastProvider`
- hook `useToast()`
- convencion de mensajes de exito/error
- fallback de errores de Supabase en formato uniforme

#### Archivos sugeridos
- `src/components/system/ToastProvider.tsx`
- `src/components/system/ToastViewport.tsx`
- `src/lib/errors/normalize-error.ts`

### 3. Validacion fuerte
#### Objetivo
Validar en UI y en capa de escritura.

#### Entregables
- esquemas por entidad
- mensajes por campo
- validacion previa a grabar

#### Entidades prioritarias
- agencies
- travelers
- agency_team
- ai_assistants

#### Recomendacion tecnica
- incorporar `zod`
- crear `src/lib/validation/theocore/*`

### 4. Hooks de modulo
#### Objetivo
Separar la logica de carga y mutacion de las paginas.

#### Entregables
- `useAgencies()`
- `useGlobalTravelers()`
- `useGlobalTeam()`
- `useDashboardMetrics()`

### 5. Tipado de respuestas Supabase
#### Objetivo
Reducir `any`, errores silenciosos y deuda tecnica.

#### Entregables
- tipos por entidad
- tipos de vistas agregadas
- mapeadores de row -> view model

## Fase 2 - Control y gobierno
### 6. RBAC serio
#### Objetivo
Separar accesos de forma real.

#### Roles objetivo
- `TheoCoreOwner`
- `TheoCoreAdmin`
- `TheoCoreAnalyst`
- `AgencyOwner`
- `TeamAgency`

#### Acciones controladas
- ver modulo
- crear
- editar
- activar/desactivar
- eliminar
- exportar
- reasignar
- ver historial

#### Entregables
- matriz de permisos
- helpers de acceso por accion
- guardas en UI
- validacion server-side donde aplique

#### Archivos sugeridos
- `src/lib/rbac/roles.ts`
- `src/lib/rbac/permissions.ts`
- `src/lib/rbac/can.ts`

### 7. Auditoria
#### Objetivo
Registrar cambios criticos del panel admin.

#### Tabla nueva sugerida
`audit_log`
- `id`
- `entity_type`
- `entity_id`
- `action`
- `before_state`
- `after_state`
- `performed_by`
- `performed_at`
- `context`

#### Acciones a registrar
- create
- update
- activate
- deactivate
- archive
- restore
- assign
- unassign
- delete duro si existe

### 8. Soft delete
#### Objetivo
Evitar perdida irreversible de datos de negocio.

#### Campos sugeridos
- `deleted_at`
- `deleted_by`
- `archived_at`
- `archived_by`

#### Entidades prioritarias
- agencies
- travelers
- agency_team
- ai_assistants
- relaciones criticas

### 9. Historial por entidad
#### Objetivo
Poder inspeccionar cambios sin salir del modulo.

#### Entregables
- boton `Historial`
- modal lateral o modal grande
- timeline de eventos desde `audit_log`

### 10. Confirmaciones seguras
#### Objetivo
Endurecer acciones destructivas o sensibles.

#### Casos
- eliminar
- desactivar
- reasignar brains
- merge de travelers
- acciones masivas

## Fase 3 - Escalado operativo
### 11. Busqueda, filtros y paginacion
#### Objetivo
Escalar listas sin degradar UX.

#### Entregables por modulo
- buscador por texto
- filtros por estado/rol/pais/agencia
- ordenacion
- paginacion
- contador total

### 12. Acciones masivas
#### Objetivo
Reducir operacion manual.

#### Acciones objetivo
- activar/desactivar multiples agencies
- exportar CSV
- reasignar brains
- reasignar travelers
- archivar registros seleccionados

### 13. Relaciones mas claras
#### Objetivo
Ver contexto de una entidad sin navegar por cinco pantallas.

#### Ejemplos
- desde agency ver owners, team, travelers y brains
- desde traveler ver agencies asociadas y estado
- desde team ver permisos efectivos y agencia relacionada

## Fase 4 - Mejoras de producto
### 14. Agencias enriquecidas
#### Objetivo
Hacer el listado mas ejecutivo y util.

#### Nuevas columnas sugeridas
- owner principal
- cantidad de empleados
- cantidad de travelers
- cantidad de brains
- ultimo acceso
- ultima actividad

### 15. Travelers globales - duplicados y merge
#### Objetivo
Resolver duplicados por email y telefono.

#### Entregables
- deteccion de duplicados potenciales
- vista de comparacion
- merge basico con confirmacion
- auditoria del merge

### 16. Global team enriquecido
#### Objetivo
Dar mas contexto operativo.

#### Nuevos datos sugeridos
- ultimo login
- invitacion enviada
- invitacion aceptada
- permisos efectivos
- estado de activacion

### 17. Brains maduros
#### Objetivo
Subir el nivel operativo del sistema IA.

#### Entregables
- asignacion por agency desde tabla
- clonar brain
- versionado
- estado publicado/borrador
- historial de cambios

### 18. Configuracion alineada
#### Objetivo
Llevar `menues`, `productos` y `amenities` al mismo patron CRUD ya usado.

#### Entregables
- misma shell visual
- mismo sistema de modal
- mismas acciones de filtro, paginacion e historial

## Fase 5 - Limpieza tecnica y deuda
### 19. Modales reutilizables
#### Objetivo
Sacar formularios grandes de paginas y convertirlos en piezas comunes.

#### Piezas sugeridas
- `EntityFormModal`
- `EntityHistoryModal`
- `EntityConfirmModal`
- `EntityBulkActionBar`

### 20. Limpieza de archivos viejos
#### Objetivo
Reducir ruido y deuda.

#### Tareas
- eliminar componentes reemplazados
- quitar texto corrupto residual
- revisar nombres viejos y rutas legacy
- limpiar helpers sin uso

## Cambios de datos recomendados
### Nuevas tablas
- `audit_log`
- opcional `entity_notes`
- opcional `background_jobs`

### Nuevos campos sugeridos
#### `agencies`
- `deleted_at`
- `deleted_by`
- `last_access_at`
- `last_activity_at`
- `owner_user_id` opcional si se normaliza

#### `travelers`
- `phone`
- `deleted_at`
- `deleted_by`
- `merged_into_traveler_id` opcional

#### `agency_team`
- `invited_at`
- `accepted_at`
- `last_login_at`
- `deleted_at`
- `deleted_by`

#### `ai_assistants`
- `version`
- `parent_brain_id`
- `status`
- `deleted_at`
- `deleted_by`

## Orden recomendado de implementacion
1. Dashboard real
2. Toasts globales
3. Validacion fuerte
4. Hooks y tipado
5. Busqueda, filtros y paginacion
6. RBAC serio
7. Auditoria
8. Soft delete
9. Historial por entidad
10. Acciones masivas
11. Brains versionados
12. Duplicados de travelers
13. Configuracion alineada

## Sprint propuesto
### Sprint 1
- dashboard real
- toasts globales
- validacion agencias/travelers/team
- hooks base de lectura

### Sprint 2
- filtros, busqueda y paginacion
- tipado fuerte
- confirmaciones seguras
- limpieza de `alert()`

### Sprint 3
- RBAC
- auditoria
- soft delete
- historial por entidad

### Sprint 4
- acciones masivas
- columnas enriquecidas de agencies y team
- relaciones cruzadas

### Sprint 5
- brains: asignacion avanzada, clonacion y versionado
- deduplicacion y merge de travelers
- configuracion homogenea

## Criterios de aceptacion
### Dashboard
- carga sin errores
- muestra KPIs reales
- refleja cambios operativos recientes

### CRUD globales
- sin `alert()`
- errores uniformes
- formularios validados
- acciones destructivas confirmadas

### Gobierno
- cada accion sensible queda auditada
- usuarios sin permiso no ven ni ejecutan acciones restringidas
- soft delete reemplaza delete duro en entidades de negocio

## Proximo bloque sugerido
El mejor siguiente bloque para ejecutar sin dispersarnos es:
1. dashboard real
2. toasts globales
3. validacion fuerte
4. buscador + filtros + paginacion

Ese bloque sube valor visible de producto y a la vez prepara el terreno para RBAC, auditoria y soft delete.
