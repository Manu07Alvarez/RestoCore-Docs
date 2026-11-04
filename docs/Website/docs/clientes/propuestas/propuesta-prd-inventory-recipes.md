# [PROPUESTA - PENDIENTE DE APROBACION] PRD: Gestion de Inventario, Escandallos y Desactivacion Automatica (Auto-86)

> **Estado del Documento:** Propuesta en Evaluacion (Pendiente de Aprobacion por el Equipo de Ingenieria y Producto)  
> **Clasificacion:** Posible Implementacion Futura (Roadmap Evolutivo) — No forma parte del alcance comprometido actual hasta su ratificacion formal.

Este documento establece las especificaciones funcionales, limites de alcance, restricciones tecnicas y criterios de verificacion para el modulo de **Gestion de Inventario, Fichas Tecnicas / Escandallos y Desactivacion Automatica de Platos Agotados (Auto-86)** en el ecosistema RestoCore bajo la metodologia Spec-Driven Development (SDD).

---

## 1. Resultados de Negocio (Outcomes)

* **Erradicacion de Faltantes Imprevistos y Sobreventas en Servicio (Auto-86):** Prevenir sobreventas mediante prerreserva atomica sincronica en Redis y desactivar automaticamente en menos de 2 segundos de la Carta QR publica cualquier plato o modificador cuando su stock de materia prima critica alcance el saldo cero, impidiendo que los comensales soliciten productos agotados o que el inventario registre saldos negativos.
* **Reduccion de Mermas y Desperdicio de Alimentos:** Disminuir en al menos un 15% el desperdicio de insumos perecederos mediante el control granular de stocks minimos de seguridad, alertas de reposicion temprana y factores de rendimiento tecnico (*yield loss*).
* **Control Exacto del Costo de Alimentos (Food Cost Real):** Calcular en tiempo real el costo unitario teorico de elaboracion de cada plato a partir de su escandallo (Bill of Materials) y el costo ponderado de reposicion de sus ingredientes, visualizando de forma inmediata el margen de contribucion bruto.
* **Alineacion de Compras y Arqueo Fisico:** Proporcionar una trazabilidad inmutable de todos los movimientos de stock (recepcion de mercaderia, bajas por merma o caducidad, y ajustes por auditoria fisica), eliminando discrepancias entre compras y ventas.

---

## 2. Limites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Catalogo Maestro de Insumos y Materias Primas:** Registro y administracion de ingredientes con identificador SKU, descripcion, unidad de medida estandarizada (`g`, `kg`, `ml`, `l`, `unidad`), costo unitario de compra, existencia actual (`current_stock`), stock de seguridad (`safety_stock`) y clasificacion de insumo critico (`is_critical`).
* **Fichas Tecnicas y Escandallos de Platos (Recipe Management):** Definicion de la formula de elaboracion vinculando cada plato y opcion de modificador a una lista de ingredientes con cantidades netas requeridas y porcentaje de merma tecnica esperada (`waste_percentage`).
* **Prerreserva Atomica Sincronica en Redis y Prevencion de Sobreventas:** Verificacion y bloqueo inmediato de materias primas criticas durante el pipeline CQRS de admision de pedidos (`CreateOrderCommand`) mediante un script atomico en Lua o comando `DECRBY`. Si la existencia disponible es insuficiente para satisfacer la comanda entrante, la solicitud es rechazada en forma sincronica con codigo HTTP 409 Conflict o HTTP 422 Unprocessable Entity, impidiendo sobreventas concurrentes y garantizando que el stock jamas caiga a saldos negativos.
* **Deduccion Asincrona y Persistencia en Ledger de PostgreSQL (Inventory Depletion):** Consumo contable automatizado de ingredientes disparado tras la admision de comandas confirmadas, ejecutado mediante un worker en segundo plano (`InventoryDepletionWorker`) via Redis Streams para asentar el libro diario inmutable en PostgreSQL sin penalizar la latencia transaccional del cliente.
* **Logica de Desactivacion Automatica de Carta (Auto-86):** Si un ingrediente marcado como `is_critical` alcanza saldo cero (`current_stock <= 0`) tras la prerreserva atomica, el sistema ejecuta de forma inmediata la conmutacion de disponibilidad (`is_available = false`) para todos los platos vinculados a dicho ingrediente, rechaza cualquier comanda concurrente posterior e invalida selectivamente la cache de la CDN en menos de 2 segundos.
* **Historial Inmutable de Movimientos de Inventario:** Registro auditable de variaciones de stock clasificadas por tipo de movimiento (`purchase_entry`, `sale_depletion`, `waste_spoilage`, `inventory_adjustment`), indicando fecha, usuario responsable, delta de cantidad y costo monetario asociado.
* **Alertas Tempranas de Reposicion de Stock:** Notificacion proactiva en el panel administrativo cuando un insumo perfora su stock minimo de seguridad configurado (`current_stock <= safety_stock`).
* **Calculo y Analisis de Food Cost y Margen:** Indicador porcentual automatico que contrasta el costo sumatorio de ingredientes contra el precio de venta configurado en el catalogo del plato.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Emision y Pago Automatico de Ordenes de Compra a Proveedores:** El sistema no ejecuta transferencias bancarias directas ni envia ordenes de compra automaticas via EDI o email a proveedores externos.
* **Seguimiento Logistico con Sensores IoT / Pesaje Automatico:** No se contempla la lectura en tiempo real de basculas conectadas ni monitoreo de camaras frigorificas.
* **Contabilidad General y Asientos de Libro Diario:** La gestion de inventario se enfoca en existencias y costos de insumos gastronomicos; la contabilidad general de balance patrimonial se delega al ERP contable del restaurante.

### Vision de Expansion Futura
* **Pronostico de Demanda y Sugerencia Inteligente de Compras:** Estimacion automatica de compras requeridas considerando patrones de consumo historicos por dia de la semana y estacionalidad.
* **Transferencias Inter-Sucursales:** Traspaso controlado de stock entre diferentes locales de una misma cadena multi-tenant.

---

## 3. Restricciones y Asunciones

* **Arquitectura de Doble Capa para Proteccion de Latencia y Consistencia:** Para proteger la latencia perimetral y erradicar simultaneamente sobreventas en horarios pico, la admision de pedidos implementa una prerreserva atomica sincronica ultra-rapida (< 5ms) en Redis ejecutada mediante un script Lua / comando `DECRBY` sobre insumos criticos durante el pipeline CQRS. Si la existencia disponible es insuficiente, la orden se rechaza de inmediato con HTTP 409 Conflict o HTTP 422 Unprocessable Entity antes de generar la comanda. Si la prerreserva es exitosa, se emite HTTP 201 Created y se despacha el evento de comanda confirmada a Redis Streams (`inventory:{tenant_slug}`).
* **Asentamiento Asincrono en PostgreSQL (Ledger Inmutable):** El worker en segundo plano `InventoryDepletionWorker` consume los eventos desde Redis Streams y asienta de manera definitiva los movimientos en la tabla `inventory_movements` y actualiza la tabla relacional `ingredients` con precision `DECIMAL(18,4)`. Este desacoplamiento garantiza que el stock nunca caiga en valores negativos (-5) por colisiones de concurrencia en la admision.
* **Presupuesto de Invalidacion de Carta (< 2 segundos):** Cuando se activa la regla Auto-86 por agotamiento de un ingrediente critico (saldo en Redis alcanza cero), el plato conmuta a no disponible y la orden de invalidacion a la CDN perimetral se despacha en menos de 2 segundos, preservando el presupuesto de latencia (< 2s LCP).
* **Persistencia PostgreSQL y Precision Decimal:** Todos los calculos de cantidades y costos monetarios de insumos deben almacenarse con tipo `DECIMAL(18,4)` en PostgreSQL para evitar errores de redondeo acumulado en gramajes pequenos (ejemplo: especias o aceites).
* **Concurrencia y Bloqueos en Horarios Pico:** Las deducciones de stock se ejecutan secuencialmente mediante transacciones atomicas agrupadas por comanda, registrando movimientos en la tabla `inventory_movements` sin bloquear lecturas concurrentes del catalogo.
* **Observabilidad OpenTelemetry:**
  * Spans delimitados para la prerreserva atomica (`inventory.redis_prereservation_duration_ms`), el proceso de deduccion asincrono (`inventory.depletion_duration_seconds`) y generacion de alertas de Auto-86 (`inventory.auto_86_triggered`).
  * Logs estructurados con `tenant_id`, `ingredient_id`, `sku`, `current_stock`, `reservation_status` y correlacionados mediante `trace_id` y `span_id`. Prohibicion estricta de emitir logs de inicio/fin para medicion de duracion.

---

## 4. Decisiones Previas (ADRs Relacionados)

* **ADR-0001:** Enfoque Spec-Driven Development y especificacion previa de contratos.
* **ADR-0002:** Separacion estricta de repositorios; la logica de inventario reside en `resto-core-back` y la administracion en `resto-core-front`.
* **ADR-0003:** Persistencia en PostgreSQL para el modelo relacional de recetas e ingredientes.
* **ADR-0005:** Presupuesto de latencia < 2s LCP y reglas de caching en la CDN.
* **ADR-0007:** Procesamiento asincrono de comandas; el pipeline de inventario se conecta en cascada tras la persistencia exitosa del pedido.
* **ADR-0010:** Snapshots inmutables de comanda; las fluctuaciones de costo de reposicion de ingredientes no alteran los historicos de pedidos pasados.
* **ADR-0017:** Telemetria OpenTelemetry, separacion estricta de trazas y logs y prohibicion de metricas redundantes.

---

## 5. Desglose de Tareas Atomicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista de administracion de Insumos (listado, filtros por categoria, busqueda por SKU, edicion de costos y umbrales de seguridad).
* Desarrollar el editor interactivo de Escandallos / Recetas dentro del formulario de plato, permitiendo seleccionar insumos, especificar gramajes netos y porcentajes de merma.
* Implementar el panel de Alertas de Stock Bajo con indicadores visuales y filtro de insumos criticos.
* Construir el modal de Arqueo Fisico y Registro de Ajustes de Inventario (entradas por compra, bajas por rotura/vencimiento, inventario ciego).
* Desarrollar la vista analitica de Food Cost y Margen de Contribucion con semaforo de rentabilidad (verde: margen > 65%, amarillo: 50-65%, rojo: < 50%).
* Reflejar visualmente en la Carta QR el estado de plato agotado (insignia "Agotado por hoy") cuando el servidor reporte `is_available = false`.

### Tareas de Backend (`resto-core-back`)
* Diseñar las entidades relacionales `Ingredient`, `RecipeItem` e `InventoryMovement` con particionamiento multi-tenant e indices en EF Core.
* Configurar relaciones foraneas: `RecipeItem` vinculado a `MenuItem` y opcionalmente a `ModifierOption`.
* Implementar endpoints REST en `InventoryEndpoints.cs`:
  * `GET /api/v1/admin/inventory/ingredients`: Consulta de catalogo de insumos y niveles de existencia.
  * `POST /api/v1/admin/inventory/ingredients`: Creacion de insumos y configuracion de criticidad.
  * `PUT /api/v1/admin/inventory/ingredients/{id}`: Modificacion de parametros y costo unitario.
  * `GET /api/v1/admin/inventory/recipes/{menu_item_id}`: Consulta de la ficha tecnica de un plato.
  * `PUT /api/v1/admin/inventory/recipes/{menu_item_id}`: Definicion o actualizacion de ingredientes de la receta.
  * `POST /api/v1/admin/inventory/movements`: Registro manual de recepcion de mercaderia, bajas o ajustes.
  * `GET /api/v1/admin/inventory/alerts`: Reporte de insumos por debajo del stock de seguridad.
  * `GET /api/v1/admin/inventory/food-cost`: Calculo agregado de Food Cost y rentabilidad por plato.
* Implementar la validacion sincronica atomica en el pipeline CQRS (`CreateOrderCommandHandler`):
  * Ejecutar prerreserva atomica de insumos criticos en Redis mediante script Lua o comando `DECRBY`.
  * Si el saldo disponible es menor al requerido, abortar la admision retornando HTTP 409 Conflict o HTTP 422 Unprocessable Entity, impidiendo sobreventas concurrentes y quiebres de stock.
* Desarrollar el servicio en segundo plano `InventoryDepletionWorker`:
  * Escuchar eventos `ORDER_PERSISTED` desde Redis Streams.
  * Consolidar la deduccion contable de cantidades brutas (`quantity * (1 + waste_percentage / 100)`) en `ingredients` y `inventory_movements` en PostgreSQL.
  * Garantizar la consistencia del ledger contable asegurando que el stock nunca descienda a saldos negativos (-5) por colisiones en la admision.
  * Si un ingrediente `is_critical` llega a `current_stock <= 0`, invocar `ToggleItemAvailabilityCommand` para marcar los platos afectados como no disponibles y despachar orden de invalidacion a la CDN perimetral.

---

## 6. Criterios de Verificacion (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ registrar cada variacion en el stock de un ingrediente mediante un registro inmutable en la tabla de movimientos de inventario especificando el delta, tipo de transaccion y marca de tiempo UTC.
* **Event-Driven:** CUANDO una comanda es recibida en el pipeline CQRS, el sistema DEBERÁ ejecutar una prerreserva atomica sincronica en Redis mediante script Lua o DECRBY para los insumos criticos antes de persistir la orden y devolver HTTP 201 Created.
* **Event-Driven:** CUANDO el worker procesador confirme la persistencia de una comanda prerreservada, el sistema DEBERÁ consolidar de forma asincrona la deduccion contable en PostgreSQL en `inventory_movements` e `ingredients`.
* **Event-Driven:** CUANDO la existencia de un insumo caiga por debajo de su stock de seguridad configurado (`current_stock <= safety_stock`), el sistema DEBERÁ registrar una alerta en el panel de administracion y emitir un span de advertencia en OpenTelemetry.
* **State-Driven:** MIENTRAS el stock actual de un ingrediente marcado como critico sea menor o igual a cero (`current_stock <= 0`), el sistema DEBERÁ deshabilitar de forma automatica la disponibilidad publica de todos los platos vinculados a dicho ingrediente (Auto-86), rechazar solicitudes concurrentes e invalidar la version de menu en la CDN perimetral en menos de 2 segundos.
* **Unwanted Behavior:** SI el stock disponible en Redis de un insumo critico es inferior a la cantidad demandada por la comanda entrante, ENTONCES el sistema DEBERÁ rechazar la comanda de inmediato retornando HTTP 409 Conflict o HTTP 422 Unprocessable Entity, abortar la prerreserva y prohibir el despacho del pedido a cocina y salon, impidiendo que el stock caiga a valores negativos.
* **Optional Features:** DONDE un ingrediente cuente con porcentaje de merma tecnica configurado (`waste_percentage > 0`), el sistema DEBERÁ calcular el consumo bruto de materia prima adicionando el factor de merma sobre la cantidad neta estipulada en la receta.

### Escenarios Gherkin

```gherkin
Feature: Gestion de Recetas, Deduccion de Stock y Desactivacion Automatica (Auto-86)
  Scenario: Deduccion automatica y atomica de stock por comanda confirmada
    Given que el plato "Hamburguesa Clasica" tiene un escandallo con:
      | Insumo       | Cantidad Neta | Merma |
      | Carne Picada | 200 g         | 5%    |
      | Pan Brioche  | 1 unidad      | 0%    |
    And el stock inicial de "Carne Picada" es de 10000 g
    And el stock inicial de "Pan Brioche" es de 50 unidades
    When entra una comanda confirmada solicitando 2 "Hamburguesa Clasica"
    Then el worker de inventario DEBERÁ descontar 420 g de "Carne Picada" (considerando el 5% de merma)
    And DEBERÁ descontar 2 unidades de "Pan Brioche"
    And los saldos finales DEBERÁN ser 9580 g de "Carne Picada" y 48 unidades de "Pan Brioche"
    And DEBERÁ registrarse un movimiento de tipo "sale_depletion" por cada ingrediente

  Scenario: Activacion automatica de Auto-86 por agotamiento de ingrediente critico
    Given que el ingrediente "Salmon Rosado" esta marcado como critico (is_critical = true)
    And su stock actual es de 300 g
    And el plato "Roll de Salmon" requiere 150 g de "Salmon Rosado"
    When entra una comanda por 2 "Roll de Salmon"
    Then el stock de "Salmon Rosado" DEBERÁ quedar en 0 g
    And el sistema DEBERÁ marcar automaticamente el plato "Roll de Salmon" con is_available = false
    And DEBERÁ emitirse una orden de invalidacion de cache a la CDN perimetral en menos de 2 segundos
    And los clientes que escaneen la Carta QR DEBERÁN visualizar el plato con la etiqueta "Agotado por hoy"

  Scenario: Alerta temprana por perforacion de stock minimo de seguridad
    Given que el insumo "Queso Mozzarella" tiene un stock de seguridad configurado de 5 kg
    And su stock actual es de 5.5 kg
    When una comanda descuenta 1.0 kg de "Queso Mozzarella"
    Then el stock actual DEBERÁ actualizarse a 4.5 kg
    And el sistema DEBERÁ generar una alerta de stock critico en el panel de administracion
    And DEBERÁ emitir un span en OpenTelemetry con el atributo "inventory.safety_stock_breached = true"

  Scenario: Calculo automatico de Food Cost y Margen de Contribucion
    Given que el plato "Pizza Margarita" se vende a un precio base de $8000
    And los costos de sus ingredientes segun receta suman un total de $2000
    When el administrador consulta la ficha tecnica del plato en el panel administrativo
    Then el sistema DEBERÁ calcular un Food Cost del 25% ($2000 / $8000)
    And DEBERÁ reportar un Margen de Contribucion bruto de $6000 (75%) con indicador visual verde

  Scenario: Rechazo sincrono atomico de comanda concurrente por stock insuficiente y erradicacion de sobreventa
    Given que el insumo critico "Lomo Vacuno" tiene un saldo disponible en Redis de 2 unidades
    And el plato "Bife de Lomo" requiere 1 unidad de "Lomo Vacuno"
    When ingresan concurrentemente dos comandas solicitando 2 unidades cada una
    Then el pipeline CQRS DEBERÁ admitir la primera comanda con prerreserva atomica exitosa en Redis y retornar HTTP 201 Created
    And la segunda comanda concurrente DEBERÁ ser rechazada de forma sincronica con HTTP 409 Conflict
    And el stock en Redis y PostgreSQL jamas DEBERÁ caer a valores negativos
    And la orden rechazada no DEBERÁ ser despachada al KDS ni al servicio de cocina
```
