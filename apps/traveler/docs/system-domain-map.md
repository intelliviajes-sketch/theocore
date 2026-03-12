# Mapa Funcional del Sistema

## Objetivo
Definir donde debe vivir cada nueva funcionalidad del sistema para evitar que el crecimiento del producto termine mezclando configuracion global, operacion de agencia y experiencia del traveler.

## Regla principal
Cada funcionalidad nueva entra por dominio de negocio, no por pantalla.

La pregunta correcta no es "en que pagina lo pongo", sino:
- que entidad nace
- quien la administra
- quien la opera
- con que otras entidades se relaciona
- si es configuracion maestra, operacion diaria o salida financiera

## Capas del sistema
### 1. TheoCore
Es la capa central del negocio.

Debe manejar:
- catalogos maestros
- estructura global
- reglas del negocio
- gobierno del sistema
- visibilidad transversal entre agencias

Ejemplos:
- tipos de producto
- categorias
- proveedores globales
- reglas de facturacion
- impuestos
- metodos de cobro
- brains IA
- herramientas disponibles
- configuracion de comisiones

### 2. Agency
Es la capa operativa.

Debe manejar:
- uso diario de entidades ya definidas
- relaciones entre catalogos y casos reales
- ejecucion comercial y administrativa

Ejemplos:
- crear una excursion concreta
- asignar proveedor
- publicar disponibilidad
- registrar reserva
- gestionar equipo
- emitir una factura o comprobante
- hacer seguimiento de viajeros

### 3. Traveler
Es la capa final de experiencia del usuario.

Debe manejar:
- consulta
- planificacion
- conversacion con IA
- seguimiento de viaje
- acceso a reservas o documentos

## Dominios recomendados
Estos son los dominios base sobre los que deberia crecer el sistema:

- agencias
- travelers
- team
- productos
- proveedores
- reservas
- facturacion
- cobros
- comisiones
- brains
- catalogos tecnicos

## Como decidir donde va una funcionalidad
### Si define estructura global
Va en `TheoCore / Configuracion`.

Ejemplos:
- tipo de producto `excursion`, `fullday`, `circuito`
- categoria de proveedor
- estado de factura
- moneda por defecto
- impuesto aplicable

### Si crea un registro real de negocio
Va en `Agency`.

Ejemplos:
- producto comercializable de una agencia
- proveedor asignado a ese producto
- reserva concreta
- factura concreta

### Si afecta experiencia del viajero
Va en `Traveler`.

Ejemplos:
- ver una excursion
- recibir itinerario
- chatear sobre una reserva
- descargar una confirmacion

## Ejemplo completo: producto + proveedor + facturacion
### Producto
#### TheoCore
- define tipos de producto
- define estructura de atributos
- define estados y reglas globales

#### Agency
- crea el producto real
- carga precio
- carga disponibilidad
- asigna proveedor
- decide si se publica o no

### Proveedor
#### TheoCore
- define el modelo de proveedor
- categorias
- campos obligatorios
- reglas globales

#### Agency
- vincula proveedor a producto
- gestiona datos operativos
- controla acuerdos puntuales

### Facturacion
#### TheoCore
- define tipos de documento
- impuestos
- estados
- series o reglas

#### Agency
- emite factura
- registra cobro
- relaciona factura con producto, reserva y traveler

## Relaciones entre dominios
### Producto
Se relaciona con:
- agencia
- proveedor
- reserva
- traveler
- factura

### Proveedor
Se relaciona con:
- agencia
- productos
- facturas
- pagos

### Factura
Se relaciona con:
- agencia
- traveler
- producto o reserva
- proveedor
- cobro

## Ubicacion recomendada en codigo
### App
- `src/app/intranet/thecore/*`
- `src/app/intranet/agency/[id]/*`
- `src/app/traveler/*`

### Hooks
- `src/hooks/theocore/*`
- `src/hooks/agency/*`
- `src/hooks/traveler/*`

### Tipos
- `src/lib/types/agencies.ts`
- `src/lib/types/products.ts`
- `src/lib/types/providers.ts`
- `src/lib/types/billing.ts`

### Servicios
- `src/lib/services/products/*`
- `src/lib/services/providers/*`
- `src/lib/services/billing/*`

### Validacion
- `src/lib/validation/products.ts`
- `src/lib/validation/providers.ts`
- `src/lib/validation/billing.ts`

## Modulos que deberian existir cuando entren nuevas funciones
### TheoCore
- Agencias
- Global travelers
- Global team
- Brain IA
- Configuracion
- Productos
- Proveedores
- Facturacion
- Cobros
- Comisiones

### Agency
- Dashboard de agencia
- Perfil de agencia
- Viajeros registrados
- Team agencia
- Herramientas
- Productos
- Proveedores
- Reservas
- Facturacion
- Cobros

## Regla de actualizacion futura
Cuando entre una nueva funcionalidad, el orden correcto de trabajo debe ser este:

1. definir el dominio
2. definir sus entidades
3. definir relaciones con otros dominios
4. decidir si la parte es maestra o operativa
5. ubicar la UI en TheoCore, Agency o Traveler
6. crear tipos
7. crear hooks
8. crear CRUD o flujo operativo

## Regla practica para este proyecto
Si una pantalla nueva:
- configura estructura, va en `TheoCore`
- usa esa estructura para operar, va en `Agency`
- la consume el cliente final, va en `Traveler`

## Siguiente recomendacion
Antes de agregar `productos`, `proveedores` y `facturacion`, conviene crear tres mapas tecnicos:
- modelo de datos
- flujo operativo entre modulos
- arbol final de carpetas por dominio
