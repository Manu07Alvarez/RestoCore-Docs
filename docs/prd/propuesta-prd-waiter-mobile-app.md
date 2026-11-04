# [PROPUESTA - PENDIENTE DE APROBACION] PRD: Aplicacion Movil para Mozos (Waiter App) y Gestion de Salon

> **Estado del Documento:** Propuesta en Evaluacion (Pendiente de Aprobacion por el Equipo de Ingenieria y Producto)  
> **Clasificacion:** Posible Implementacion Futura (Roadmap Evolutivo) — No forma parte del alcance comprometido actual hasta su ratificacion formal.

Este documento establece las especificaciones funcionales, limites de alcance, restricciones tecnicas y criterios de verificacion para la **Aplicacion Movil para Personal de Salon y Mozos (Waiter Mobile App)** de RestoCore, resolviendo la brecha operativa identificada en el ADR-0012 sobre medicion de ocupacion y rotacion de mesas.

---

## 1. Resultados de Negocio (Outcomes)

* **Resolucion Operativa de la Postergacion de ADR-0012:** Capturar datos fidedignos y verificados de comensales reales sentados (`pax_count`) y tiempos exactos de ocupacion/liberacion de mesas, habilitando el calculo automatico de rotacion de mesas (*Table Turnover Rate*) y rendimiento por asiento disponible (RevPASH) sin recurrir a suposiciones heurísticas sobre el trafico web QR.
* **Reduccion del Tiempo de Espera en Mesa:** Disminuir en un 40% el tiempo transcurrido entre la solicitud de atencion o cuenta por parte del comensal y la respuesta fisica del mozo, mediante alertas en tiempo real despachadas a terminales moviles via WebSockets en menos de 500 ms.
* **Eliminacion de Errores en Toma de Comandas:** Lograr un 0% de comandas ilegibles o incompletas gracias a la validacion interactiva de modificadores obligatorios, guarniciones y puntos de coccion al pie de la mesa.
* **Agilizacion de la Rotacion de Mesas Mediante Cobro Dividido (Split Billing):** Reducir en un 50% el tiempo dedicado al cierre y cobranza de mesas de grupos mediante herramientas automatizadas de particion equitativa o item por item.

---

## 2. Limites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Autenticacion Rapida por Codigo PIN:** Inicio de sesion agil para camareros mediante codigo numerico de 4 digitos asignado por el administrador, emitiendo token JWT con rol `waiter` y asociacion a las mesas del sector correspondiente.
* **Mapa Interactivo de Salon y Estados de Mesa:** Visualizacion dinamica del plano de mesas con codificacion estandarizada de colores:
  * `Libre` (Verde): Mesa desocupada lista para recibir comensales.
  * `Ocupada` (Azul): Mesa abierta con sesion activa y comensales sentados.
  * `Esperando Comida` (Amarillo): Comanda enviada a cocina pendiente de elaboracion.
  * `Comida Servida` (Morado): Platos entregados a los comensales.
  * `Cuenta Pedida` (Naranja): Solicitud de adicion recibida desde la Carta QR o indicada por el mozo.
  * `En Limpieza / Desinfeccion` (Gris): Mesa liberada pendiente de preparacion fisica para el siguiente turno.
* **Apertura Formal de Sesion de Mesa:** Registro obligatorio de la cantidad real de personas sentadas (`pax_count`) y seleccion del mozo responsable al momento de ocupar la mesa.
* **Toma de Comandas al Pie de Mesa con Idempotencia Obligatoria:** Navegacion fluida por catalogo de platos, incorporacion de modificadores obligatorios y opcionales, notas personalizadas y envio directo a cocina (ingesta en Redis Streams) protegido obligatoriamente por el encabezado HTTP `Idempotency-Key` (UUIDv4 generado por el dispositivo), impidiendo la duplicacion de comandas en cocina ante desconexiones o parpadeos de senal Wi-Fi en terrazas y patios.
* **Buzon de Llamados de Servicio desde Carta QR:** Recepcion prioritaria de alertas visuales y sonoras en el dispositivo del mozo cuando un comensal pulsa "Llamar al Mozo" o "Pedir la Cuenta" en su telefono tras escanear el QR.
* **Alertas de Cocina Lista (Order Ready):** Notificacion push/in-app inmediata cuando la terminal KDS de cocina avanza una comanda a estado `ready`, indicando platos y numero de mesa.
* **Division de Cuenta (Split Billing) y Liquidacion de Subcuentas:** Herramienta grafica para dividir la cuenta de una mesa:
  * Particion equitativa en N partes iguales con regla estricta de redondeo de centavos (*penny rounding*): cualquier remanente centesimal indivisible (ejemplo: $0.01 en cuentas divididas entre 3 comensales) se asigna formalmente a la primera subcuenta ($333.34 + $333.33 + $333.33), erradicando bloqueos por saldos huérfanos (*orphan balance deadlocks*) y totalizando con exactitud matemática el 100% del saldo de la mesa.
  * Seleccion manual de platos consumidos por cada comensal generando subcuentas separadas.
  * Cobro y cancelacion independiente de cada subcuenta mediante endpoint dedicado, manteniendo la mesa en estado ocupado hasta liquidar el 100% del total.
* **Cierre y Liberacion de Sesion de Mesa:** Confirmacion de pago y liberacion de la mesa una vez saldadas todas las subcuentas, registrando la marca de tiempo de fin de sesion para metricas analiticas de permanencia.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Pasarela de Cobro Directo con Terminal de Tarjeta Integrada:** La aplicacion registra el metodo de pago seleccionado (Efectivo, Tarjeta de Debito/Credito, Transferencia QR), pero no integra librerias de procesamiento bancario EMV directo en el dispositivo movil.
* **Sistema de Reservas a Mediano Plazo:** No contempla calendario de reservas anticipadas ni recepcion de depositos o senas previas.
* **Liquidacion de Propinas Individuales y Nomina:** El registro de propinas se gestiona de manera agregada; la liquidacion laboral se delega al software contable.

### Vision de Expansion Futura
* **Asignacion Dinamica de Zonas de Salon:** Rebalanceo automatico de mesas entre camareros segun la carga de trabajo en tiempo real.
* **Modo Offline con Sincronizacion Idempotente en Fondo:** Almacenamiento local SQLite para registrar pedidos en areas sin cobertura Wi-Fi y despacho automatico al recuperar enlace.

---

## 3. Restricciones y Asunciones

* **Presupuesto de Latencia de Notificacion (< 500 ms):** Toda alerta generada por el comensal ("Llamar al Mozo") o por la cocina ("Comanda Lista") debe llegar al dispositivo del mozo en menos de 500 ms via WebSocket.
* **Compatibilidad de Dispositivos Moviles:** La aplicacion debe operar de forma fluida en dispositivos moviles inteligentes estandar (Android 10+ e iOS 15+) tanto en formato aplicacion web progresiva (PWA) como aplicacion compilada nativa.
* **Idempotencia Obligatoria en Emision de Comandas:** Todo comando `POST /api/v1/waiter/orders` debe incluir obligatoriamente el encabezado HTTP `Idempotency-Key` con un identificador UUIDv4 generado en el cliente. El backend valida la clave en Redis (`idempotency:{tenant_id}:{key}`) con un tiempo de expiracion de 24 horas. Si se detecta una solicitud repetida debido a caidas de red o reintentos en terrazas, el servidor retorna la respuesta original sin reenviar el pedido a Redis Streams ni generar duplicados en cocina.
* **Consistencia Monetaria en Split Billing (Regla de Centavos Residuales):** En la particion equitativa de cuentas, los calculos se ejecutan sobre valores centesimales exactos en `DECIMAL(18,2)`. Cualquier residuo no divisible (`remanente = total_centavos % cantidad_comensales`) debe asignarse de manera obligatoria e integra a la primera subcuenta. Esta regla previene que discrepancias de redondeo (ejemplo: cuentas de $1000 divididas en tres cuotas de $333.33 que dejan un saldo huerfano de $0.01) impidan el cobro del 100% y bloqueen la liberacion de la mesa.
* **Arquitectura de API REST (OpenAPI 3.1):** Todas las transacciones de negocio (apertura de mesa, comanda, cobro de subcuentas, cierre) se realizan exclusivamente a traves de endpoints REST versionados.
* **Integracion con Redis Streams (ADR-0007):** Los pedidos emitidos por el mozo se encolan en Redis Streams (`orders:{tenant_slug}`) compartiendo la misma cola FIFO que los pedidos QR, garantizando equidad temporal en la entrada a cocina.
* **Persistencia PostgreSQL y Auditoria:** La apertura y cierre de mesas se persiste en la tabla relacional `table_sessions`, permitiendo consultas analiticas de duracion promedio de estancia por mesa y sector.
* **Observabilidad (OpenTelemetry):**
  * Spans dedicados para cada llamado de servicio (`waiter.service_call_duration_seconds`) y transaccion de comanda con atributo `waiter.idempotency_cached`.
  * Trazas y logs correlacionados mediante `trace_id` y `span_id`. Prohibido el almacenamiento de PII.

---

## 4. Decisiones Previas (ADRs Relacionados)

* **ADR-0001:** Adopcion de Spec-Driven Development y especificaciones tecnicas vinculantes.
* **ADR-0002:** Separacion estricta de repositorios; la logica del mozo reside en frontend (`resto-core-front`) y API backend (`resto-core-back`).
* **ADR-0003:** Persistencia en PostgreSQL para sesiones de mesa y llamadas de servicio.
* **ADR-0006 (Seguridad):** Autorizacion declarativa con politicas OPA/Rego; el rol `waiter` esta formalmente autorizado para `read_tables`, `create_order`, `read_orders` y `update_order_status`.
* **ADR-0007:** Procesamiento asincrono de comandas mediante Redis Streams y difusion WebSocket.
* **ADR-0010:** Snapshots inmutables de precios y platos en las lineas de orden creadas por el mozo.
* **ADR-0012:** Postergacion formal del seguimiento de ocupacion por QR y resolucion definitiva mediante intervencion de personal de salon.
* **ADR-0017:** Separacion de logs estructurados y medicion de latencias de atencion mediante trazas OpenTelemetry.

---

## 5. Desglose de Tareas Atomicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la pantalla de acceso rapido por PIN con teclado numerico tactil optimizado para operacion con una sola mano.
* Implementar el mapa interactivo de salon (grid de mesas agrupadas por zona: Interior, Terraza, Barra) con codificacion por colores de estado.
* Construir el modal de apertura de mesa solicitando de forma obligatoria la cantidad de comensales (`pax_count`).
* Implementar el catalogo de toma de comandas rapida con buscador instantaneo, modificadores obligatorios y selector de platos favoritos.
* Desarrollar el modulo de recepcion de alertas sonoras/vibratorias de llamados de clientes y notificaciones de cocina lista con boton de reconocimiento ("Atendido").
* Construir la interfaz de Division de Cuentas (Split Billing) con vista previa de tickets fraccionados.
* Implementar el canal de WebSockets conectado a `/ws/waiter` con reconexion automatica en segundo plano.

### Tareas de Backend (`resto-core-back`)
* Disenar las entidades relacionales `TableSession` y `ServiceCall` con particionamiento multi-tenant e integracion en EF Core DbContext.
* Extender la tabla `tables` agregando el estado operativo actual (`current_status`, `current_session_id`).
* Implementar endpoints REST en `WaiterEndpoints.cs`:
  * `POST /api/v1/waiter/auth/pin-login`: Autenticacion rapida por PIN de 4 digitos y emision de JWT con rol `waiter`.
  * `GET /api/v1/waiter/tables`: Consulta del listado de mesas con su estado operativo y mozo asignado.
  * `POST /api/v1/waiter/tables/{table_id}/open`: Apertura de sesion registrando `pax_count`.
  * `POST /api/v1/waiter/orders`: Emision de comanda desde el dispositivo movil con encabezado obligatorio `Idempotency-Key` (UUIDv4) y encolamiento deduplicado en Redis Streams.
  * `POST /api/v1/public/{tenantSlug}/tables/{table_token}/call-waiter`: Endpoint publico invocado desde la Carta QR por el comensal.
  * `POST /api/v1/waiter/alerts/{alert_id}/acknowledge`: Desactivacion del llamado de servicio.
  * `POST /api/v1/waiter/tables/{table_id}/split-bill`: Calculo de propuesta de division de cuenta aplicando la regla de centavo residual (*penny rounding*) asignado a la primera subcuenta.
  * `POST /api/v1/waiter/tables/{table_id}/sub-bills/{sub_bill_id}/pay`: Asentamiento del pago individual de cada subcuenta y comprobacion de liquidacion acumulada del 100%.
  * `POST /api/v1/waiter/tables/{table_id}/close`: Cierre y liberacion formal de mesa tras confirmar la cancelacion integra de todas las subcuentas.
* Modificar `OrderProcessorWorker` para sincronizar el estado de la mesa (`occupied` -> `waiting_food` -> `food_served`) ante cada transicion de la comanda.
* Implementar difusion de eventos WebSocket en `/ws/waiter` para sincronizacion concurrente entre dispositivos de mozos y administradores.

---

## 6. Criterios de Verificacion (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ asociar de forma univoca cada comanda emitida a la sesion de mesa activa y al mozo autenticado en el dispositivo.
* **Event-Driven:** CUANDO un mozo emita una comanda con el encabezado obligatorio `Idempotency-Key`, el sistema DEBERÁ registrar la orden y, ante reintentos de red con la misma clave desde terrazas o patios, DEBERÁ devolver la respuesta original sin duplicar pedidos en Redis Streams ni en cocina.
* **Event-Driven:** CUANDO un comensal presione el boton "Llamar al Mozo" en la Carta QR, el sistema DEBERÁ despachar una alerta prioritaria al dispositivo del mozo asignado en menos de 500 ms con sonido y vibracion.
* **Event-Driven:** CUANDO la cocina marque todos los items de una comanda como `ready`, el sistema DEBERÁ enviar una notificacion inmediata de platos listos para servir al mozo a cargo de dicha mesa.
* **State-Driven:** MIENTRAS una mesa permanezca en estado `occupied`, el sistema DEBERÁ permitir agregar items adicionales a la comanda manteniendo el calculo actualizado del subtotal acumulado.
* **Unwanted Behavior:** SI un mozo intenta abrir una sesion en una mesa que ya se encuentra en estado `occupied`, ENTONCES el sistema DEBERÁ rechazar la operacion con HTTP 409 Conflict y devolver los detalles de la sesion en curso.
* **Unwanted Behavior:** SI un mozo intenta cerrar una mesa con comandas activas pendientes de elaboracion en cocina sin cancelarlas previamente, ENTONCES el sistema DEBERÁ rechazar el cierre con HTTP 409 Conflict y listar los platos no despachados.
* **Optional Features:** DONDE los comensales soliciten division de cuenta en partes iguales, el sistema DEBERÁ calcular las subcuentas asignando el centavo residual indivisible a la primera subcuenta ($333.34 + $333.33 + $333.33) y DEBERÁ permitir procesar el cobro independiente de cada subcuenta mediante su endpoint dedicado sin liberar la mesa hasta cobrar el 100% del saldo total.

### Escenarios Gherkin

```gherkin
Feature: Operacion de Salon y Atencion de Mesas mediante Waiter Mobile App
  Scenario: Apertura exitosa de mesa con registro de comensales (pax_count)
    Given que el mozo "Carlos" ha iniciado sesion con su PIN en el sector "Terraza"
    And la Mesa 12 se encuentra en estado "Libre" (color verde)
    When el mozo selecciona la Mesa 12 e ingresa 4 comensales
    Then el sistema DEBERÁ registrar una nueva TableSession en PostgreSQL con pax_count = 4
    And el estado de la Mesa 12 DEBERÁ cambiar inmediatamente a "Ocupada" (color azul) en todos los terminales
    And DEBERÁ iniciarse el cronometro de medicion de tiempo de ocupacion de mesa (ADR-0012)

  Scenario: Recepcion de llamado de servicio desde Carta QR
    Given que los comensales de la Mesa 12 estan visualizando la Carta QR en sus telefonos
    When un comensal presiona el boton "Llamar al Mozo" en la interfaz web QR
    Then el endpoint POST /api/v1/public/{tenantSlug}/tables/{table_token}/call-waiter DEBERÁ registrar una ServiceCall
    And el dispositivo movil del mozo "Carlos" DEBERÁ emitir una notificacion sonora y visual en menos de 500 ms
    When el mozo presiona el boton "Atendido" en su pantalla
    Then la alerta DEBERÁ quedar desactivada y registrarse la duracion de respuesta en OpenTelemetry

  Scenario: Emision de comanda al pie de mesa con Idempotency-Key y resiliencia ante cortes Wi-Fi
    Given que la Mesa 12 tiene sesion activa
    When el mozo selecciona el plato "Hamburguesa Criolla"
    And anade la nota especial "Sin cebolla"
    And envia la orden a POST /api/v1/waiter/orders con el encabezado "Idempotency-Key: e4b2d56a-1290-4e3b-9a1c-32b781cd90fa"
    Then el pedido DEBERÁ ser aceptado con HTTP 201 Created y encolarse en Redis Streams en orders:{tenant_slug}
    When el dispositivo sufre un microcorte de enlace Wi-Fi en la terraza y retransmite la peticion con la misma clave de idempotencia
    Then el backend DEBERÁ retornar la respuesta original en cache sin reinsertar eventos duplicados en Redis Streams ni en cocina

  Scenario: Division de cuenta en partes iguales con regla de centavo residual y cobro de subcuentas
    Given que la Mesa 12 posee una cuenta total acumulada de $1000.00 con 3 comensales registrados
    When el mozo solicita dividir la cuenta en 3 partes iguales mediante POST /api/v1/waiter/tables/12/split-bill
    Then el sistema DEBERÁ computar 3 subcuentas aplicando la regla de centavo residual a la primera subcuenta
    And DEBERÁ retornar la Subcuenta 1 por $333.34, la Subcuenta 2 por $333.33 y la Subcuenta 3 por $333.33
    When el mozo asienta el pago sucesivo de cada subcuenta mediante POST /api/v1/waiter/tables/12/sub-bills/{id}/pay
    Then el sistema DEBERÁ constatar el cobro integro del 100% ($1000.00) sin saldos huerfanos y habilitar la liberacion de la mesa

  Scenario: Rechazo de cierre de mesa con platos pendientes en cocina
    Given que la Mesa 12 tiene 1 plato en estado "preparing" en la estacion Parrilla
    When el mozo intenta ejecutar la accion "Cerrar Mesa"
    Then el sistema DEBERÁ responder con HTTP 409 Conflict
    And DEBERÁ presentar un mensaje advirtiendo: "No se puede cerrar la mesa porque hay platos pendientes en elaboracion en cocina."
    And la mesa DEBERÁ mantenerse en estado "Ocupada"
```
