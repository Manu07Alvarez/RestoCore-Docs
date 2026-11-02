# [PROPUESTA - PENDIENTE DE APROBACION] PRD: Fidelizacion de Clientes, Encuestas de Satisfaccion (NPS) y Promociones

> **Estado del Documento:** Propuesta en Evaluacion (Pendiente de Aprobacion por el Equipo de Ingenieria y Producto)  
> **Clasificacion:** Posible Implementacion Futura (Roadmap Evolutivo) — No forma parte del alcance comprometido actual hasta su ratificacion formal.

Este documento establece las especificaciones funcionales, limites de alcance, restricciones tecnicas y criterios de verificacion para el modulo de **Fidelizacion de Clientes (Customer Loyalty), Encuestas Digitales de Satisfaccion (NPS) y Motor de Promociones** en el ecosistema RestoCore bajo la metodologia Spec-Driven Development (SDD).

---

## 1. Resultados de Negocio (Outcomes)

* **Incremento de la Retencion y Recurrencia de Clientes:** Aumentar la frecuencia de visita y consumo recurrente en un 20% mediante un esquema ligero de acumulacion de puntos y sellos digitales canjeables en futuras visitas.
* **Captura Inmediata de Satisfaccion en Mesa (Intervencion Previa a Salida):** Lograr una tasa de respuesta superior al 30% en encuestas de calidad post-consumo directamente desde la Carta QR, capturando opiniones criticas (calificaciones `<=` 2 estrellas) en menos de 1 segundo para alertar a la gerencia de salon antes de que el cliente abandone el local o publique senalamientos negativos en redes sociales.
* **Garantia de Privacidad sin Almacenamiento de Datos Sensibles (PII):** Implementar la identificacion voluntaria del comensal mediante hashing criptografico robusto HMAC-SHA256 utilizando una sal secreta y aleatoria especifica por tenant (`tenant_salt`) custodiada en Azure Key Vault o HashiCorp Vault, complementada con middleware de redaccion de PII en solicitudes HTTP antes del computo del digest, erradicando por completo el almacenamiento o filtracion de informacion personal identificable en texto plano o logs de auditoria, en estricto cumplimiento de `AGENTS.md`.
* **Dinamizacion de Ventas en Horarios Valle:** Elevar la facturacion en franjas horarias de baja concurrencia mediante un motor de promociones programadas (Happy Hour, descuentos por dia y horario) inyectadas dinamicamente en la Carta QR sin degradar el presupuesto de latencia (< 2s LCP).

---

## 2. Limites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Encuesta de Satisfaccion Post-Consumo en Carta QR:** Formulario interactivo no invasivo que se presenta al comensal en la aplicacion web QR tras cerrarse su comanda o emitirse su preficha, evaluando mediante escala de 1 a 5 estrellas: Calidad de la Comida, Atencion del Mozo y Ambiente del Local, con un campo opcional para sugerencias escritas.
* **Canal Prioritario de Alerta ante Clientes Insatisfechos:** Despacho instantaneo de una notificacion visual y sonora (`CRITICAL_CUSTOMER_FEEDBACK`) al panel de administradores y tabletas de mozos cuando una mesa registra una calificacion general menor o igual a 2 estrellas.
* **Programa de Fidelizacion Liviano (Puntos y Sellos Digitales):** Mecanismo de identificacion opcional donde el cliente introduce su numero de telefono movil, el cual es inmediatamente anonimizado mediante HMAC-SHA256 con clave secreta segregada por tenant (`tenant_salt`) para acumular puntos calculados como porcentaje del total consumido o sellos por visita validada.
* **Catalogo de Recompensas y Beneficios Canjeables:** Configuracion por parte del administrador de un catalogo de premios (ejemplo: "Postre Bonificado a los 500 puntos", "10% de descuento a las 5 visitas"), permitiendo al cliente generar un codigo de canje alfanumerico de uso unico.
* **Motor de Promociones Horarias y Descuentos Programados:** Configuracion de reglas de descuento aplicables por dias de la semana y ventanas horarias (ejemplo: "Martes y Miercoles de 18:00 a 20:00: 2x1 en Cervezas Artesanales" o "20% de descuento en Pizzas"), reflejadas de forma automatica en los precios desplegados en la Carta QR.
* **Panel de Metricas Analiticas de Experiencia (NPS Dashboard):** Visualizacion agregada del Net Promoter Score (NPS), ranking de platos mejor y peor evaluados, desempeno de atencion por sector y analisis evolutivo de tendencias mensuales.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Campanas de Mensajeria Masiva o Spam (SMS / WhatsApp Push):** El sistema no realiza envios proactivos masivos de publicidad directa a telefonos de clientes; se proporcionan webhooks salientes para integraciones con plataformas de marketing externas autorizadas.
* **Monedero Electronico con Recarga Monetaria Anticipada:** No se contempla la custodia de fondos monetarios de comensales (billetera virtual prepaga).
* **Comercializacion de Datos de Consumo a Redes de Anuncios:** Queda terminantemente prohibida la cesion, cruce o venta de perfiles de consumo con intermediarios publicitarios externos.

### Vision de Expansion Futura
* **Segmentacion Automatizada por Habitos de Consumo:** Clasificacion de clientes recurrentes segun frecuencia y ticket promedio para ofrecer recomendaciones personalizadas al escanear la carta.
* **Gamificacion Avanzada:** Desafios gastronomicos y medallas de fidelidad acumulables para clientes habituales.

---

## 3. Restricciones y Asunciones

* **Presupuesto de Rendimiento Inviolable de Carta QR (< 2s LCP):** La incorporacion del modulo de encuestas, banner de fidelizacion y motor de promociones no debe ralentizar la carga de la Carta QR, cuyo First Contentful Paint y Largest Contentful Paint deben mantenerse bajo 2 segundos en redes moviles 3G/4G.
* **Anonimizacion Mandatoria de Identificadores y Proteccion Estricta de PII:** Conforme a las directrices inviolables de `AGENTS.md`, el numero telefonico proporcionado voluntariamente por el cliente para el programa de fidelizacion debe ser procesado de forma unívoca mediante HMAC-SHA256 utilizando una clave/sal criptografica aleatoria de alta entropia segregada por tenant (`tenant_salt`), custodiada en Azure Key Vault o HashiCorp Vault. Queda terminantemente prohibido almacenar identificadores en texto claro en `loyalty_accounts.phone_hash` o utilizar hashes planos sin sal susceptibles a ataques de diccionario o tablas rainbow.
* **Redaccion Obligatoria de PII en Middleware de Logging HTTP:** El middleware de registro de peticiones HTTP en ASP.NET Core debe sanitizar y redactar (`[REDACTED]`) de forma obligatoria el campo telefonico en el cuerpo y encabezados de la solicitud antes de computar el hash y antes de que cualquier middleware de observabilidad o telemetria emita trazas o logs estructurados, impidiendo cualquier fuga de PII en Serilog u OpenTelemetry.
* **Arquitectura de API REST (OpenAPI 3.1):** Las transacciones de envio de feedback, consulta de puntos y creacion de promociones se exponen mediante contratos REST OpenAPI 3.1.
* **Persistencia PostgreSQL con JSONB:** Las encuestas detalladas y atributos de promociones se respaldan en tablas relacionales estructuradas, utilizando columnas JSONB para almacenar metadatos de respuestas compuestas.
* **Observabilidad OpenTelemetry:**
  * Spans dedicados para el registro de encuestas (`feedback.submission_duration_ms`) y canje de recompensas (`loyalty.redemption_processed`).
  * Emision de alertas y logs estructurados con `tenant_id`, `table_id`, `rating_food`, `rating_service`, correlacionados por `trace_id` y `span_id`. Prohibicion absoluta de emitir atributos con datos de contacto del comensal.

---

## 4. Decisiones Previas (ADRs Relacionados)

* **ADR-0001:** Cumplimiento del enfoque Spec-Driven Development y especificacion contractual previa.
* **ADR-0002:** Separacion estricta de repositorios; frontend web QR y panel administrativo consumen endpoints de `resto-core-back`.
* **ADR-0003:** Persistencia en PostgreSQL para el almacenamiento seguro de cuentas de fidelizacion y encuestas.
* **ADR-0005:** Presupuesto de latencia < 2s LCP y caching perimetral en la CDN para la entrega del menu.
* **ADR-0006 (Seguridad):** Autorizacion declarativa con OPA/Rego; endpoints de consulta de puntos publicos y administracion restringida a roles autorizados.
* **ADR-0010:** Snapshots inmutables de comanda; las recompensas y descuentos aplicados se congelan en la comanda sin alterar el catalogo base.
* **ADR-0017:** Gobernanza de telemetria OpenTelemetry y proteccion estricta de privacidad sin PII en trazas y logs estructurados.

---

## 5. Desglose de Tareas Atomicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Disenar el componente modal no intrusivo de Encuesta de Satisfaccion en la Carta QR con evaluacion de estrellas y campos de texto ligero.
* Implementar el widget de Fidelizacion en la Carta QR que permite al comensal consultar su saldo de puntos introduciendo su numero de telefono y visualizando cupones disponibles.
* Desarrollar el panel de Alertas Criticas de Servicio en la aplicacion de mozo y terminal de administracion con reproduccion sonora de aviso ante calificaciones `<=` 2 estrellas.
* Construir la vista de administracion de Recompensas de Fidelizacion (creacion de premios, definicion de puntos requeridos y reglas de vigencia).
* Desarrollar el modulo de configuracion de Promociones Horarias con selector de dias, franjas horarias y platos alcanzados.
* Implementar el Tablero de Control de Experiencia (NPS Dashboard) con graficos de distribucion de puntajes, promedios por area y comentarios recientes.

### Tareas de Backend (`resto-core-back`)
* Disenar las entidades relacionales `CustomerFeedback`, `LoyaltyAccount`, `LoyaltyReward` y `Promotion` en EF Core con particionamiento multi-tenant.
* Implementar el servicio criptografico `PhoneHasherService` utilizando HMAC-SHA256 con claves secretas aleatorias de 256 bits segregadas por tenant (`tenant_salt`), inyectadas de forma segura desde Azure Key Vault o HashiCorp Vault.
* Desarrollar el middleware `PiiRedactionMiddleware` en el pipeline de ASP.NET Core para redactar numeros telefonicos en el cuerpo de peticiones HTTP antes del registro de logs y antes de la emision de spans en OpenTelemetry.
* Implementar endpoints REST en `FeedbackEndpoints.cs` y `LoyaltyEndpoints.cs`:
  * `POST /api/v1/public/{tenantSlug}/feedback`: Recepcion de encuestas de clientes vinculadas a una mesa u orden.
  * `GET /api/v1/admin/feedback/summary`: Consulta de metricas agregadas de satisfaccion y NPS.
  * `POST /api/v1/public/{tenantSlug}/loyalty/balance`: Consulta de saldo de puntos mediante identificador anonimizado por HMAC-SHA256.
  * `POST /api/v1/admin/loyalty/rewards`: Alta y modificacion de premios del catalogo de fidelizacion.
  * `POST /api/v1/public/{tenantSlug}/loyalty/redeem`: Generacion de codigo de canje de recompensa con validacion de saldo.
  * `GET /api/v1/admin/promotions`: Consulta de promociones configuradas.
  * `POST /api/v1/admin/promotions`: Creacion de promociones con delimitacion por dias y horarios.
* Conectar `OrderProcessorWorker` para acreditar automaticamente los puntos calculados a la cuenta de fidelizacion asociada al completarse el cobro de la comanda.
* Implementar difusion de evento WebSocket `CRITICAL_CUSTOMER_FEEDBACK` en `/ws/waiter` cuando se reciba una calificacion deficiente.

---

## 6. Criterios de Verificacion (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ almacenar los identificadores telefonicos de las cuentas de fidelizacion exclusivamente como digests criptograficos HMAC-SHA256 generados mediante una clave o sal secreta unica por tenant (`tenant_salt`) custodiada en Azure Key Vault o HashiCorp Vault, prohibiendo el registro de informacion personal identificable (PII) en texto claro y exigiendo la redaccion del numero telefonico en el middleware de logging HTTP antes de procesar el hash.
* **Event-Driven:** CUANDO un comensal envie una encuesta de satisfaccion con una calificacion promedio menor o igual a 2 estrellas, el sistema DEBERÁ despachar una alerta prioritaria `CRITICAL_CUSTOMER_FEEDBACK` a las terminales activas de mozos y administradores en menos de 500 ms via WebSocket.
* **Event-Driven:** CUANDO se registre el pago y cierre definitivo de una comanda asociada a una cuenta de fidelizacion, el sistema DEBERÁ computar y acreditar los puntos correspondientes de forma atomica en la tabla de cuentas de fidelizacion.
* **State-Driven:** MIENTRAS la hora local del servidor este comprendida dentro de la ventana de una promocion horaria activa, la Carta QR DEBERÁ renderizar de forma automatica el precio con descuento y la etiqueta promocional sin requerir recompilar el archivo estatico en la CDN.
* **Unwanted Behavior:** SI un comensal intenta generar un cupon de canje para un premio de fidelizacion sin contar con el saldo de puntos necesario, ENTONCES el sistema DEBERÁ denegar la solicitud con codigo HTTP 422 Unprocessable Entity especificando los puntos requeridos y los puntos faltantes.
* **Optional Features:** DONDE el restaurante configure la modalidad de "Tarjeta de Sellos Digital", el sistema DEBERÁ contabilizar una visita incrementando en una unidad el casillero de sellos tras verificar que el ticket de consumo alcanzo el monto minimo estipulado en la regla del tenant.

### Escenarios Gherkin

```gherkin
Feature: Encuestas de Satisfaccion, Alertas NPS y Programa de Fidelizacion
  Scenario: Alerta instantanea a gerencia por calificacion critica recibida en mesa
    Given que los comensales de la Mesa 8 han cerrado su comanda
    When el cliente completa la encuesta en su telefono asignando 1 estrella a "Atencion del Mozo" con el comentario "Demasiada espera para la comida"
    Then el endpoint POST /api/v1/public/{tenantSlug}/feedback DEBERÁ registrar la encuesta en PostgreSQL
    And el sistema DEBERÁ emitir de inmediato el evento WebSocket CRITICAL_CUSTOMER_FEEDBACK
    And la pantalla de administracion y el dispositivo del mozo DEBERÁN mostrar una alerta roja con el texto "Alerta Mesa 8: Calificacion 1 estrella - Atencion del Mozo"
    And DEBERÁ emitirse un span en OpenTelemetry con el atributo "feedback.is_critical = true"

  Scenario: Acumulacion automatica de puntos con telefono anonimizado mediante HMAC-SHA256 y tenant_salt
    Given que el restaurante acredita 10 puntos por cada $1000 de consumo
    And la Mesa 5 abona una cuenta total de $25000
    And el tenant posee una clave secreta "tenant_salt" inyectada desde Azure Key Vault
    When el comensal ingresa voluntariamente su numero movil "1123456789" para sumar puntos
    Then el middleware de logging HTTP DEBERÁ redactar el numero telefonico impidiendo que "1123456789" figure en logs estructurados o trazas
    And el backend DEBERÁ aplicar HMAC-SHA256 al numero telefonico utilizando la "tenant_salt" correspondiente
    And DEBERÁ registrar o actualizar la cuenta en loyalty_accounts usando exclusivamente el digest hexadecimal resultante
    And el saldo de puntos DEBERÁ incrementarse en 250 puntos de forma atomica
    And ningun log estructurado ni traza DEBERÁ contener el numero "1123456789" en texto plano ni hashes no salados

  Scenario: Canje exitoso de beneficio con saldo suficiente
    Given que la cuenta de fidelizacion con hash verificado posee 600 puntos acumulados
    And el catalogo de premios ofrece "Postre de la Casa" por 500 puntos
    When el cliente solicita canjear el premio "Postre de la Casa"
    Then el sistema DEBERÁ descontar 500 puntos de su balance dejando un saldo de 100 puntos
    And DEBERÁ generar un cupon alfanumerico de uso unico con vigencia de 30 dias
    And DEBERÁ responder con HTTP 200 OK informando el codigo de canje

  Scenario: Rechazo de canje por saldo de puntos insuficiente
    Given que una cuenta de fidelizacion posee 200 puntos acumulados
    When el comensal solicita canjear un cupon de descuento valorado en 500 puntos
    Then el sistema DEBERÁ rechazar la peticion con codigo HTTP 422 Unprocessable Entity
    And DEBERÁ responder con un mensaje que indique: "Saldo insuficiente: dispones de 200 puntos y se requieren 500 puntos para este premio."
    And el balance de la cuenta DEBERÁ mantenerse inalterado en 200 puntos

  Scenario: Visualizacion automatica de promocion horaria (Happy Hour) en Carta QR
    Given que existe una promocion activa de "Happy Hour 2x1 en Aperitivos" configurada de 19:00 a 21:00 los dias viernes
    When un cliente ingresa a la Carta QR un viernes a las 19:30
    Then la interfaz de la carta DEBERÁ mostrar la categoria "Aperitivos" con la etiqueta promocional destacada
    And DEBERÁ computar el beneficio promocional al momento de agregar los platos al pedido
    And la carga de la vista DEBERÁ completarse en menos de 2 segundos (LCP < 2s)
```
