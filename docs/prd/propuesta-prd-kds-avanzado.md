# [PROPUESTA - PENDIENTE DE APROBACION] PRD: Kitchen Display System (KDS) Avanzado y Ruteo Multi-Estacion

> **Estado del Documento:** Propuesta en Evaluacion (Pendiente de Aprobacion por el Equipo de Ingenieria y Producto)  
> **Clasificacion:** Posible Implementacion Futura (Roadmap Evolutivo) — No forma parte del alcance comprometido actual hasta su ratificacion formal.

Este documento establece las especificaciones funcionales, limites de alcance, restricciones tecnicas y criterios de verificacion para el modulo de **Kitchen Display System (KDS) Avanzado y Ruteo Multi-Estacion de Cocina** del ecosistema RestoCore, enmarcado en el flujo de trabajo de Spec-Driven Development (SDD).

---

## 1. Resultados de Negocio (Outcomes)

* **Reduccion del Tiempo Medio de Preparacion y Despacho:** Disminuir en al menos un 25% el tiempo transcurrido desde la recepcion del pedido en el backend hasta su entrega al personal de salon, eliminando los cuellos de botella derivados del uso de comandas fisicas en papel.
* **Erradicacion de Perdidas y Descoordinacion de Comandas:** Lograr un 0% de comandas extraviadas o duplicadas mediante una cola digital centralizada y sincronizada en tiempo real a traves de WebSockets y Redis Streams.
* **Sincronizacion de Entrega por Mesa (Expediter):** Garantizar que todos los platos de una misma mesa se finalicen de forma sincronizada, evitando que platos frios o calientes esperen de forma prolongada en el pasaplatos antes de ser servidos juntos.
* **Visibilidad Operativa y Telemetria de Tiempos de Coccion:** Proporcionar al jefe de cocina y a la administracion metricas exactas sobre el rendimiento de cada puesto de elaboracion (Target Cooking Time vs Actual Prep Time), registrando la latencia de cada transicion de estado en OpenTelemetry.

---

## 2. Limites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Catalogo y Configuracion de Estaciones de Cocina:** Definicion configurable por tenant de multiples puestos de elaboracion (ejemplo: `Parrilla`, `Cocina Caliente`, `Frituras`, `Horno/Pizzas`, `Cocina Fria/Sushi`, `Barra/Bebidas`, `Postres`).
* **Ruteo Automatico Granular por Item:** Al procesar un pedido de salon o QR, el sistema desglosa los items de la comanda y despacha cada plato a la estacion correspondiente segun su parametrizacion en el catalogo.
* **Terminales de Estacion Segregadas:** Interfaz web tactil especializada para cada linea de cocineros, mostrando unicamente los platos asignados a su estacion con sus respectivos modificadores, puntos de coccion y notas especiales del comensal.
* **Terminal Maestra de Despacho (Expediter View):** Interfaz centralizada para el jefe de cocina o despachador que consolida todos los items de la mesa, visualizando el estado de elaboracion en cada estacion y permitiendo la liberacion conjunta de la comanda a salon.
* **Maquina de Estados por Item y Comanda:** Ciclo de vida controlado: `queued` (en cola Redis) -> `received` (persistido y recibido en terminal) -> `preparing` (iniciada elaboracion) -> `ready` (listo en pasaplatos) -> `dispatched` (retirado por mozo) -> `recalled` (recuperado por error).
* **SLA Visual con Cronometros por Codigo de Colores:** Identificacion visual dinamica del tiempo transcurrido respecto al tiempo estimado de preparacion:
  * Verde: Menor a 10 minutos (dentro del tiempo optimo).
  * Amarillo: Entre 10 y 20 minutos (atencion requerida).
  * Rojo titilante: Mayor a 20 minutos o superando el tiempo objetivo (demora critica).
* **Modo Resumen Acumulativo (Summary / All-Day View):** Agrupador en tiempo real de cantidades totales de platos identicos pendientes de preparacion en la estacion (ejemplo: "5x Bife de Chorizo a Punto", "3x Papas Rusticas"), facilitando la produccion en lote.
* **Recuperacion de Comandas (Recall Function):** Capacidad de recuperar a pantalla cualquier comanda despachada por error durante una ventana de gracia de 5 minutos posteriores a su cierre.
* **Soporte de Entrada por Teclado Industrial (Bump Bar) y Pantalla Tactil:** Compatibilidad con eventos de teclado fisico estandar USB para avance de comandas mediante combinaciones numericas de bump bar.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Control Biometrico o Gestion de Asistencia:** El KDS no registra horarios de entrada/salida ni descansos del personal de cocina.
* **Gestion de Compras o Proveedores:** El KDS no emite ordenes de compra ni interactua con proveedores de materias primas.
* **Sensores de Temperatura IoT:** No se contempla telemetria automatica desde equipamiento de coccion fisico (freidoras, hornos).
* **Impresion de Tickets Fiscales:** El KDS gestiona exclusivamente tickets operativos de cocina; la emision tributaria se delega al modulo de facturacion.

### Vision de Expansion Futura
* **Prediccion Dinamica de Tiempos de Preparacion:** Ajuste automatico de tiempos estimados de coccion segun la saturacion de comandas en la estacion.
* **Ruteo Inteligente Basado en Carga:** Derivacion automatica de platos a estaciones secundarias cuando una estacion primaria supera su capacidad maxima configurada.

---

## 3. Restricciones y Asunciones

* **Presupuesto de Latencia de Notificacion (< 500 ms):** El tiempo transcurrido desde la confirmacion de un pedido en el backend hasta su renderizado en las pantallas KDS de cocina debe ser inferior a 500 milisegundos a traves del canal WebSocket.
* **Arquitectura de API:** Consumo exclusivo a traves de endpoints REST bajo especificacion OpenAPI 3.1.
* **Persistencia PostgreSQL, JSONB y Concurrencia Optimista:** El estado granular de cada item dentro de una orden se mantiene en la columna `items_snapshot` en formato `JSONB`, indexada mediante GIN para consultas directas por estado y estacion. Para erradicar la perdida de actualizaciones (*lost updates*) cuando cocineros en distintas estaciones o el despachador interactuan concurrentemente sobre platos de la misma comanda, la persistencia aplica control de concurrencia optimista mediante el atributo de sistema `xmin` (o `RowVersion` en EF Core) combinado con mutaciones atomicas a nivel de base de datos ejecutadas mediante `jsonb_set` en comandos `ExecuteUpdateAsync`.
* **Desacoplamiento Asincrono con Redis Streams:** La ingesta de comandas hacia el KDS se apoya en el pipeline de Redis Streams (`orders:{tenant_slug}`) garantizando orden FIFO y resiliencia ante picos de demanda segun ADR-0007.
* **Observabilidad y Telemetria (OpenTelemetry):**
  * Toda transicion de estado (`received` -> `preparing` -> `ready` -> `dispatched`) debe emitir un span delimitado con atributos `tenant_id`, `station_id`, `order_id`, `item_id`, `prep_duration_seconds` y `sla_breached`.
  * Logs estructurados correlacionados mediante `trace_id` y `span_id`. Prohibido almacenar informacion personal identificable (PII).
* **Resiliencia ante Desconexion mediante Retroceso Exponencial:** Si la terminal KDS pierde conectividad WebSocket, el cliente web debe iniciar reintentos de reconexion automatica gobernados estrictamente por una politica de retroceso exponencial (*exponential backoff* con jitter aleatorio, iniciando en 1 segundo y duplicando hasta un tope maximo de 30 segundos) y reconciliar su estado ejecutando `GET /api/v1/kitchen/orders?station_id={id}&status=active`.

---

## 4. Decisiones Previas (ADRs Relacionados)

* **ADR-0001:** Adopcion estricta de Spec-Driven Development y enfoque Docs-as-Code.
* **ADR-0002:** Separacion estricta de responsabilidades entre frontend, backend y especificaciones.
* **ADR-0003:** Persistencia en PostgreSQL con columnas semiestructuradas JSONB e indices GIN.
* **ADR-0006 (Seguridad):** Autorizacion declarativa mediante politicas OPA/Rego; los endpoints de KDS requieren roles `cook`, `kitchen_staff` o `admin`.
* **ADR-0007:** Procesamiento de pedidos mediante cola FIFO en Redis Streams y difusion por WebSockets.
* **ADR-0010:** Snapshots inmutables de comanda; las modificaciones de catalogo posteriores no alteran los nombres ni modificadores de platos en pantalla de cocina.
* **ADR-0016:** Pipeline behaviors CQRS precompilados en backend .NET 10 para ejecucion sin reflexion dinamica.
* **ADR-0017:** Gobernanza de telemetria OpenTelemetry, separacion estricta de trazas y logs y prohibicion de registros redundantes de inicio/fin de metodo.

---

## 5. Desglose de Tareas Atomicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista de Estacion KDS (Station View) con diseno de alto contraste para visibilidad en entornos de cocina y fuentes de gran tamano.
* Implementar el temporizador visual por tarjeta con actualizacion de color de fondo segun SLA (verde, amarillo, rojo).
* Implementar la vista del Expediter con agrupacion por mesa, checkboxes de items completados y boton maestro de despacho de mesa ("Bump Order").
* Construir el panel superior colapsable de Modo Resumen (Summary View) con conteo agregado de platos por estacion.
* Conectar el cliente WebSocket a la ruta `/ws/kitchen` con algoritmo de reconexion automatica por retroceso exponencial (*exponential backoff* con jitter) y sonido opcional de alerta ante nuevas comandas.
* Mapear atajos de teclado para soporte de bump bars USB (teclas numericas del 1 al 8 para despacho rapido, tecla espacio para scroll, barra invertida para recall).

### Tareas de Backend (`resto-core-back`)
* Diseñar e implementar la entidad relacional `KitchenStation` y el mapeo en EF Core con particionamiento multi-tenant.
* Extender la entidad `MenuItem` incorporando la clave foranea nulable `kitchen_station_id`.
* Configurar mapeo de concurrencia optimista en EF Core sobre la entidad `Order` mediante el token de version `RowVersion` / columna de sistema `xmin` de PostgreSQL, y extender el esquema JSONB en `Order.ItemsSnapshot` incorporando los metadatos de estacion (`station_id`, `station_name`), estado (`item_status`) y marcas de tiempo (`started_at`, `ready_at`, `cook_id`).
* Implementar los endpoints REST en `KitchenEndpoints.cs`:
  * `GET /api/v1/kitchen/stations`: Listar estaciones activas del tenant.
  * `POST /api/v1/kitchen/stations`: Crear nueva estacion de trabajo.
  * `PUT /api/v1/kitchen/stations/{id}`: Actualizar parametros de estacion.
  * `GET /api/v1/kitchen/orders`: Obtener comandas activas filtradas por `station_id` o `status`.
  * `PATCH /api/v1/kitchen/orders/{order_id}/items/{item_id}/status`: Transicionar estado de un item individual aplicando mutaciones atomicas con `jsonb_set` en `ExecuteUpdateAsync` o verificacion de `xmin` para erradicar perdidas de actualizacion concurrentes.
  * `POST /api/v1/kitchen/orders/{order_id}/bump`: Marcar items de la estacion o de la mesa como listos/despachados con proteccion de concurrencia optimista.
  * `POST /api/v1/kitchen/orders/{order_id}/recall`: Reabrir una comanda despachada dentro de la ventana de 5 minutos.
  * `GET /api/v1/kitchen/metrics/throughput`: Metricas de rendimiento de preparacion por estacion.
* Actualizar `OrderProcessorWorker` para que al descolar de Redis Streams evalue las estaciones de los items y despache eventos segregados por estacion a los canales WebSocket correspondientes.
* Instrumentar telemetria OpenTelemetry registrando spans con metricas de preparacion (`kds.prep_time_seconds`) y eventos de cambio de estado.

---

## 6. Criterios de Verificacion (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ registrar la marca de tiempo en formato UTC para cada cambio de estado de los items de la comanda en cocina.
* **Event-Driven:** CUANDO el worker procesador descole un pedido confirmado de Redis Streams, el sistema DEBERÁ rutear de inmediato cada item a la estacion de cocina correspondiente y despachar el evento `ITEM_ROUTED_TO_STATION` via WebSocket en menos de 500 ms.
* **Event-Driven:** CUANDO cocineros en distintas estaciones avancen concurrentemente platos de una misma comanda, el sistema DEBERÁ persistir las mutaciones de forma atomica mediante expresiones `jsonb_set` bajo validacion de version `xmin`, impidiendo la perdida de actualizaciones (*lost updates*) y notificando en tiempo real a la terminal del Expediter.
* **Event-Driven:** CUANDO un cocinero presione la accion de avanzar comanda ("Bump") sobre un plato, el sistema DEBERÁ actualizar su estado a `ready` y notificar de manera instantanea a la terminal del Expediter y al mozo asignado.
* **State-Driven:** MIENTRAS un item permanezca en estado `preparing` y su cronometro supere el tiempo objetivo de preparacion, la terminal KDS DEBERÁ mostrar la tarjeta con borde rojo titilante y registrar un atributo de alerta en el span de OpenTelemetry.
* **Unwanted Behavior:** SI la conexion WebSocket de una terminal KDS se interrumpe, ENTONCES el cliente DEBERÁ iniciar reintentos de reconexion automatica mediante retroceso exponencial (*exponential backoff* con jitter aleatorio, iniciando en 1 segundo y duplicando hasta un maximo de 30 segundos) y sincronizar el estado activo ejecutando `GET /api/v1/kitchen/orders?station_id={id}&status=active`.
* **Unwanted Behavior:** SI un operador intenta recuperar mediante "Recall" una orden despachada hace mas de 5 minutos, ENTONCES el sistema DEBERÁ rechazar la peticion con codigo HTTP 422 Unprocessable Entity indicando que la ventana de recuperacion ha expirado.
* **Optional Features:** DONDE el establecimiento opere con la estacion de Expediter activa, el sistema DEBERÁ bloquear el despacho final de la mesa a salon hasta que todas las estaciones individuales hayan marcado sus respectivos items como `ready`.

### Escenarios Gherkin

```gherkin
Feature: Ruteo y Ciclo de Vida de Comandas en Kitchen Display System (KDS)
  Scenario: Ruteo segregado de pedido multi-estacion
    Given que el tenant "asador-criollo" tiene configuradas las estaciones "Parrilla" y "Cocina Caliente"
    And el plato "Ojo de Bife" esta asignado a la estacion "Parrilla"
    And el plato "Papas Fritas Provenzal" esta asignado a la estacion "Cocina Caliente"
    When entra un nuevo pedido confirmado para la Mesa 4 con 1 "Ojo de Bife" y 1 "Papas Fritas Provenzal"
    Then la pantalla KDS de "Parrilla" DEBERÁ mostrar exclusivamente la tarjeta con "Ojo de Bife" para la Mesa 4
    And la pantalla KDS de "Cocina Caliente" DEBERÁ mostrar exclusivamente la tarjeta con "Papas Fritas Provenzal" para la Mesa 4
    And la pantalla del Expediter DEBERÁ mostrar ambos platos bajo la misma comanda de la Mesa 4 en estado "received"

  Scenario: Avance concurrente de items en la misma comanda con control de concurrencia optimista
    Given que la comanda de la Mesa 4 contiene "Ojo de Bife" en la estacion "Parrilla" y "Papas Fritas Provenzal" en "Cocina Caliente"
    And ambos platos se encuentran inicialmente en estado "received"
    When el cocinero de Parrilla marca "Ojo de Bife" en estado "preparing"
    And de manera simultanea el cocinero de Cocina Caliente avanza "Papas Fritas Provenzal" a estado "ready"
    Then el sistema DEBERÁ persistir ambas mutaciones de forma atomica con jsonb_set bajo validacion de version xmin en PostgreSQL
    And no DEBERÁ producirse perdida de actualizacion ni sobreescritura ciega en items_snapshot
    And la pantalla del Expediter DEBERÁ consolidar en tiempo real "Ojo de Bife" en "preparing" y "Papas Fritas Provenzal" en "ready" en menos de 500 ms

  Scenario: Despacho sincronizado en pantalla del Expediter
    Given que la Mesa 4 tiene "Ojo de Bife" en estado "ready" en Parrilla
    But "Papas Fritas Provenzal" permanece en estado "preparing" en Cocina Caliente
    When el despachador visualiza la comanda en la pantalla del Expediter
    Then el boton de despacho general de la mesa DEBERÁ estar bloqueado
    When la estacion "Cocina Caliente" marca "Papas Fritas Provenzal" como "ready"
    Then el boton de despacho general de la Mesa 4 DEBERÁ habilitarse
    When el despachador presiona "Bump Order" en la pantalla del Expediter
    Then la orden completa DEBERÁ pasar a estado "dispatched"
    And DEBERÁ emitirse una notificacion de platos listos para servir al mozo asignado

  Scenario: Alerta visual y telemetrica por superacion de tiempo de coccion (SLA)
    Given que el plato "Lomo al Champingon" tiene un tiempo objetivo de preparacion de 15 minutos
    And el item se encuentra en estado "preparing" desde hace 16 minutos
    When la terminal KDS renderiza el refresco del cronometro
    Then la tarjeta del item DEBERÁ visualizarse con cabecera en color rojo titilante
    And el sistema DEBERÁ emitir un span de telemetria con el atributo "kds.sla_breached = true"

  Scenario: Recuperacion valida de comanda despachada por error (Recall)
    Given que la comanda de la Mesa 2 fue marcada como "dispatched" hace 2 minutos
    When el operador de la estacion presiona la tecla de recuperacion "Recall"
    Then el sistema DEBERÁ revertir el estado de la comanda a "ready"
    And la tarjeta DEBERÁ volver a posicionarse en la pantalla KDS en su ubicacion previa
    And DEBERÁ emitirse el evento ORDER_RECALLED por el canal WebSocket de la cocina
```
