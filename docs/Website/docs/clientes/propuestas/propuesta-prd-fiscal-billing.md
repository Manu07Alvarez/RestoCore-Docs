# [PROPUESTA - PENDIENTE DE APROBACION] PRD: Facturacion Electronica, Adaptadores Fiscales e Impresion ESC/POS

> **Estado del Documento:** Propuesta en Evaluacion (Pendiente de Aprobacion por el Equipo de Ingenieria y Producto)  
> **Clasificacion:** Posible Implementacion Futura (Roadmap Evolutivo) — No forma parte del alcance comprometido actual hasta su ratificacion formal.

Este documento establece las especificaciones funcionales, limites de alcance, restricciones tecnicas y criterios de verificacion para el modulo de **Facturacion Electronica, Adaptadores Fiscales e Integracion de Impresion Comandataria (ESC/POS)** en el ecosistema RestoCore bajo la metodologia Spec-Driven Development (SDD).

---

## 1. Resultados de Negocio (Outcomes)

* **Cumplimiento Tributario Legal Automatizado:** Garantizar la emision valida de comprobantes fiscales electronicos homologados (Facturas A, B, C y Notas de Credito) ante organismos recaudadores oficiales (ejemplo: AFIP WSFE en Argentina, SAT en Mexico, SII en Chile, DIAN en Colombia) en un tiempo inferior a 3 segundos por comprobante.
* **Erradicacion de Doble Carga Operativa:** Eliminar la duplicidad de ingreso manual entre el sistema de pedidos de salon y terminales fiscales fisicas independientes, asegurando que cada comanda cerrada genere su correspondiente registro legal de manera automatica.
* **Acceso Digital al Comprobante Fiscal desde Carta QR:** Permitir al comensal consultar, visualizar y descargar la factura oficial en formato PDF con codigo QR fiscal regulatorio incrustado directamente desde su dispositivo movil, reduciendo el gasto de papel termico en un 60%.
* **Simplificacion de la Gestion Contable e Impositiva:** Proveer reportes consolidados del Libro de IVA Ventas y regimenes de informacion en formatos estandarizados (CSV y Excel) exportables con un solo clic para el profesional contable del establecimiento.

---

## 2. Limites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Arquitectura de Adaptadores Fiscales Desacoplados (`IFiscalBillingAdapter`):** Patron de puertos y adaptadores que aisla la logica central de pedidos de las regulaciones tributarias locales, soportando implementaciones intercambiables por tenant segun su jurisdiccion impositiva.
* **Emision de Comprobantes Fiscales Homologados:**
  * Factura B y Factura C a Consumidor Final (con discriminacion automatica segun monto umbral sin requerir identificacion obligatoria hasta el limite legal).
  * Factura A con apertura formal de base imponible, alicuotas diferenciales de IVA (21%, 10.5%) y percepciones para clientes inscriptos con CUIT/RUT valido.
  * Notas de Credito vinculadas formalmente al comprobante original para anulaciones totales o devoluciones parciales de pedidos.
* **Integracion con Servicios Web Fiscales (Cloud Billing):** Comunicacion segura y autenticada con los servidores tributarios (ejemplo: AFIP WSFE / WSMTXCA en Argentina utilizando certificados digitales X.509 y gestion automatizada de tokens de acceso TRA).
* **Impresion Comandataria y Fiscal Local (Protocolos ESC/POS):** Despacho directo de tickets a impresoras termicas conectadas en red local (protocolos Epson ESC/POS, Star y controladores fiscales hardware Hasar/Epson) mediante un agente local liviano (`RestoCore.FiscalAgent`).
* **Generacion de Documentos Oficiales en PDF con QR Regulatorio:** Renderizado del comprobante electronico cumpliendo con los disenos y requisitos oficiales de las agencias impositivas, incluyendo codigo de autorizacion electronica (CAE), fecha de vencimiento y codigo QR tributario estandarizado.
* **Exportacion de Libro de IVA Ventas:** Generador de reportes consolidados por rango de fechas fiscales con totales netos gravados, importes de IVA discriminados por alicuota y totales exentos.
* **Resguardo y Contingencia Fiscal Homologada (Cola Offline Resiliente):** Soporte formal ante indisponibilidad temporal de servidores externos tributarios distinguiendo dos mecanismos de cumplimiento legal estricto:
  * Regimen de Contingencia Electronica Homologada (AFIP CAEA u organismo equivalente): Emision autorizada mediante lote de Comprobantes de Autorizacion Electronica Anticipada (CAEA) con rendicion informativa posterior.
  * Emision de Comprobante de Control Interno (Ticket No Fiscal) y Respaldo Manual Oficial (CAI): Emision de ticket de control interno para el comensal sin valor fiscal formal, registro de numero de factura preimpresa de talonario manual de contingencia con CAI, y encolamiento en estado `pending_contingency` procesado en segundo plano por `FiscalContingencyWorker` para regularizacion electronica al reanudarse la red.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Presentacion y Liquidacion de Declaraciones Juradas Impositivas Generales:** El modulo genera los reportes de ventas del restaurante, pero no confecciona ni presenta declaraciones patrimoniales, de ingresos brutos o de ganancias ante el fisco.
* **Liquidacion de Sueldos y Cargas Sociales:** Las remuneraciones laborales del personal se gestionan externamente.
* **Gestion Cambiaria en Multiples Monedas Internacionales:** El calculo fiscal opera estrictamente en la moneda de curso legal del pais correspondiente al tenant.

### Vision de Expansion Futura
* **Homologacion con Controladores Fiscales de Nueva Generacion Hardware Offline:** Integracion directa con impresoras de caja de almacenamiento criptografico autonomo de firmas fiscales.
* **Integracion con Nuevas Jurisdicciones:** Desarrollo de adaptadores adicionales para Factura Electronica en Colombia (DIAN), Peru (SUNAT) y Espana (TicketBAI).

---

## 3. Restricciones y Asunciones

* **Presupuesto de Tiempo de Emision Fiscal (< 3 segundos):** La solicitud de autorizacion electronica al organismo fiscal, la persistencia del comprobante legal y la respuesta al operador no deben exceder los 3 segundos de duracion total bajo condiciones normales de red.
* **Marco Legal y Cumplimiento Normativo en Contingencia:** Queda estrictamente prohibido asignar correlatividad legal definitiva o generar comprobantes apocrifos sin CAE cuando el servicio externo este caido. La continuidad del negocio en salon ante contingencias se rige bajo dos vias legales conformes a la normativa tributaria (RG AFIP 1415/4291 y concordantes):
  1. *Regimen CAEA:* Emision electronica utilizando el codigo de autorizacion anticipada otorgado por AFIP para el periodo quincenal en curso.
  2. *Comprobante de Control Interno + Talonario Manual con CAI:* Si no se dispone de CAEA, el sistema emite un ticket impreso de control interno no fiscal para la mesa, habilita al cajero a emitir la factura manual de talonario oficial preimpreso con CAI, y coloca la transaccion en la cola `pending_contingency` para regularizacion asincrona automatizada mediante `FiscalContingencyWorker`.
* **Arquitectura de API REST (OpenAPI 3.1):** Todos los servicios de facturacion se consumen exclusivamente mediante contratos REST versionados.
* **Inviolabilidad de la Correlatividad Secuencial:** El sistema debe garantizar de forma estricta e ininterrumpida la correlatividad numerica por cada tipo de comprobante y punto de venta fiscal activo (`point_of_sale` + `legal_number`), prohibiendo huecos numericos o sobrescrituras.
* **Seguridad de Certificados Digitales (X.509):** Las claves privadas y certificados fiscales deben custodiarse de forma cifrada mediante referencias seguras de boveda (`certificate_vault_ref`), prohibiendo el almacenamiento de llaves privadas en texto plano en la base de datos o en repositorios de codigo.
* **Observabilidad OpenTelemetry:**
  * Spans delimitados para las llamadas remotas a las agencias fiscales (`fiscal.afip_request_duration_ms`) y reintentos de contingencia (`fiscal.contingency_retry_duration_seconds`).
  * Trazas y logs correlacionados mediante `trace_id` y `span_id`. Prohibicion de registrar datos sensibles o bancarios en texto claro.

---

## 4. Decisiones Previas (ADRs Relacionados)

* **ADR-0001:** Adopcion de Spec-Driven Development y enfoque Docs-as-Code.
* **ADR-0002:** Separacion estricta de responsabilidades entre frontend, backend y especificaciones.
* **ADR-0003:** Persistencia en PostgreSQL para el registro inmutable de facturas y configuraciones fiscales.
* **ADR-0006 (Seguridad):** Autorizacion declarativa con politicas OPA/Rego; la emision de facturas requiere privilegios de rol `cashier`, `waiter` o `admin`.
* **ADR-0010:** Snapshots inmutables de comanda; la emision de factura toma de forma estricta los precios congelados en `items_snapshot` garantizando coherencia historica contable.
* **ADR-0016:** Ejecucion optimizada en CQRS sin reflexion dinamica para comandos transaccionales criticos.
* **ADR-0017:** Telemetria OpenTelemetry, separacion estricta de trazas y logs y auditoria de excepciones operativas.

---

## 5. Desglose de Tareas Atomicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista de Cobro y Facturacion en el punto de venta de salon, permitiendo seleccionar el tipo de comprobante (Consumidor Final o Factura A) e ingresar CUIT/RUT con validacion de digito verificador.
* Integrar el visor de Factura Electronica en la Carta QR que permite al comensal descargar su PDF o reenviarlo digitalmente.
* Construir la pantalla de Configuracion Fiscal en el panel administrativo (ingreso de CUIT, razon social, condicion de IVA, punto de venta y carga protegida de certificado digital).
* Desarrollar el modulo de Reportes Impositivos con filtros de periodo fiscal y botones de exportacion de Libro de IVA Ventas a CSV y Excel.
* Implementar el panel de estado de impresoras termicas de salon y estado de conexion del agente local de impresion.

### Tareas de Backend (`resto-core-back`)
* Disenar las entidades relacionales `FiscalConfig` e `Invoice` con particionamiento multi-tenant e indices unicos en PostgreSQL (`tenant_id, invoice_type, point_of_sale, legal_number`).
* Disenar la interfaz abstracta `IFiscalBillingAdapter` en `RestoCore.Application/Common/Interfaces`:
  * `IssueInvoiceAsync(FiscalInvoiceRequest request, CancellationToken ct)`
  * `IssueCreditNoteAsync(CreditNoteRequest request, CancellationToken ct)`
  * `CheckStatusAsync(CancellationToken ct)`
* Implementar adaptadores en `RestoCore.Infrastructure/Fiscal`:
  * `AfipWsfeBillingAdapter`: Comunicacion con Web Service de AFIP (WSAA para autenticacion y WSFE para autorizacion de comprobantes).
  * `EscPosLocalPrintAdapter`: Formateo de comandos de impresion ESC/POS y despacho por socket TCP a impresoras de red.
  * `MockFiscalBillingAdapter`: Implementacion en memoria para desarrollo local y pruebas unitarias aisladas.
* Implementar endpoints REST en `BillingEndpoints.cs`:
  * `POST /api/v1/billing/invoices`: Emision de factura para una orden o sesion de mesa cerrada.
  * `GET /api/v1/billing/invoices/{id}`: Consulta de datos fiscales y autorizacion CAE.
  * `GET /api/v1/billing/invoices/{id}/pdf`: Descarga del documento PDF oficial.
  * `POST /api/v1/billing/invoices/{id}/credit-note`: Emision de nota de credito fiscal.
  * `POST /api/v1/billing/invoices/contingency/manual`: Registro de respaldo de comprobante manual oficial emitido con CAI ante caida de servicio.
  * `GET /api/v1/billing/contingency/queue`: Consulta de comprobantes encolados en estado `pending_contingency`.
  * `PUT /api/v1/admin/billing/config`: Actualizacion de credenciales y punto de venta fiscal.
  * `GET /api/v1/admin/billing/reports/vat-sales`: Generacion consolidada de Libro de IVA Ventas.
  * `GET /api/v1/public/{tenantSlug}/orders/{order_id}/receipt`: Consulta publica del comprobante desde la Carta QR.
* Desarrollar el servicio en segundo plano `FiscalContingencyWorker`:
  * Inspeccionar periodicamente la tabla `invoices` filtrando comprobantes en estado `pending_contingency`.
  * Monitorear la disponibilidad de los servidores de la agencia tributaria invocando `CheckStatusAsync`.
  * Ejecutar reintentos de emision electronica aplicando retroceso exponencial con jitter aleatorio para prevenir tormentas de peticiones.
  * Al autorizarse el CAE definitivo, actualizar el estado de la factura a `issued`, registrar fecha de regularizacion y generar el PDF final.
  * Proveer soporte para la consolidacion informativa del regimen CAEA.
* Desarrollar el generador de PDF fiscal oficial incorporando el codigo QR estandarizado segun las especificaciones tecnicas de la agencia tributaria.

---

## 6. Criterios de Verificacion (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ garantizar la correlatividad numerica estrictamente secuencial y ascendente para cada combinacion de tipo de comprobante y punto de venta habilitado en el tenant.
* **Event-Driven:** CUANDO el cajero confirme la facturacion de una comanda, el sistema DEBERÁ comunicarse con el adaptador fiscal configurado, solicitar el Codigo de Autorizacion Electronico (CAE) y persistir el comprobante legal en menos de 3 segundos.
* **Event-Driven:** CUANDO una factura electronica sea emitida satisfactoriamente por el organismo fiscal, el sistema DEBERÁ generar de inmediato el documento en formato PDF conteniendo el codigo QR oficial y asociarlo a la comanda para visualizacion en la Carta QR.
* **State-Driven:** MIENTRAS el servicio del organismo tributario externo presente una caida o indisponibilidad temporal, el sistema DEBERÁ emitir un comprobante de control interno sin valor fiscal para el cliente en salon, admitir el registro de factura manual oficial con CAI o aplicar autorizacion CAEA, encolando el comprobante en estado `pending_contingency` para reintento automatico por `FiscalContingencyWorker` sin bloquear el cobro ni la liberacion fisica de la mesa.
* **Unwanted Behavior:** SI el organismo fiscal rechaza la emision debido a un CUIT inexistente o discrepancias impositivas en el calculo de alicuotas, ENTONCES el sistema DEBERÁ abortar la transaccion legal, registrar el codigo de error oficial y notificar al operador con un mensaje claro y no tecnico.
* **Optional Features:** DONDE el establecimiento posea impresoras termicas de red configuradas para comanda o caja, el sistema DEBERÁ despachar el ticket formateado en lenguaje de comandos ESC/POS al completarse la confirmacion del cobro.

### Escenarios Gherkin

```gherkin
Feature: Emision de Comprobantes Fiscales Electronicos y Adaptadores Tributarios
  Scenario: Emision exitosa de Factura B a Consumidor Final
    Given que la Mesa 3 tiene una comanda cerrada por un total de $15000
    And el tenant "bistrot-paris" tiene configurado el adaptador fiscal "AfipWsfeBillingAdapter" con punto de venta 1
    When el operador selecciona "Factura B a Consumidor Final" y confirma la emision
    Then el adaptador fiscal DEBERÁ comunicarse con el Web Service de AFIP
    And DEBERÁ obtener un CAE valido con su fecha de vencimiento
    And el numero legal de la factura DEBERÁ incrementarse secuencialmente sin huecos
    And el tiempo de emision total DEBERÁ ser inferior a 3 segundos
    And el comprobante DEBERÁ quedar disponible para consulta en formato PDF con codigo QR oficial

  Scenario: Emision de Factura A con CUIT discriminando alicuotas de IVA
    Given que un cliente solicita Factura A proporcionando el CUIT "30-71234567-9" correspondiente a un Responsable Inscripto
    And el importe total consumido es de $24200 (compuesto por $20000 netos gravados al 21% de IVA y $4200 de impuesto)
    When el cajero emite la Factura A
    Then el sistema DEBERÁ validar el formato del CUIT
    And el registro fiscal DEBERÁ persistir la base neta de $20000 y el monto de IVA de $4200 de forma discriminada
    And el PDF generado DEBERÁ detallar la alicuota del 21% y los datos tributarios del cliente

  Scenario: Contingencia legal ante caida temporal de servidores de la agencia tributaria
    Given que los servidores externos de AFIP se encuentran fuera de linea y no responden en 3 segundos
    When el operador solicita emitir una Factura B para cerrar una mesa
    Then el adaptador fiscal DEBERÁ capturar el tiempo de espera (timeout)
    And el sistema DEBERÁ registrar el comprobante en estado "pending_contingency"
    And DEBERÁ imprimir un comprobante de control interno sin valor fiscal advirtiendo que no reemplaza a la factura legal
    And DEBERÁ habilitar el registro opcional del numero de factura manual preimpresa de contingencia con CAI
    And DEBERÁ permitir continuar con el cobro y la liberacion operativa de la mesa en salon
    And el servicio FiscalContingencyWorker DEBERÁ reintentar en segundo plano la transmision al restaurarse el enlace externo

  Scenario: Emision de Nota de Credito por devolucion de comanda
    Given que la Factura B numero 0001-00004520 fue emitida previamente por $12000
    When el administrador autoriza la anulacion total de la orden y solicita emitir la Nota de Credito correspondiente
    Then el sistema DEBERÁ invocar el metodo IssueCreditNoteAsync del adaptador fiscal
    And DEBERÁ asociar la Nota de Credito a la Factura B original de referencia
    And DEBERÁ registrar el comprobante de anulacion en PostgreSQL afectando negativamente el reporte de ventas

  Scenario: Despacho de impresion termica de comanda via protocolo ESC/POS
    Given que el establecimiento dispone de una impresora termica en la barra configurada con IP "192.168.1.200:9100"
    When una comanda de bebidas es confirmada por el mozo
    Then el adaptador EscPosLocalPrintAdapter DEBERÁ generar la secuencia de bytes ESC/POS
    And DEBERÁ despachar los comandos de corte de papel y formato al socket TCP de la impresora en menos de 1 segundo
```
