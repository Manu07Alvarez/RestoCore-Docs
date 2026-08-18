# Documento de Requisitos de Producto (PRD): Comanda de Cocina y Procesamiento de Pedidos

Este documento establece las especificaciones funcionales, límites de alcance y criterios de aceptación para el módulo de **Comanda de Cocina y Procesamiento de Pedidos (KDS & Salón)** (Módulo 03 del Playbook de Ingeniería y Fase 3 del Flujo de Trabajo Homologado SDD).

---

## 1. Resultados (Outcomes)
* Permitir la recepción, ordenamiento estricto por llegada (FIFO) y notificación en tiempo real (< 100ms) de los pedidos realizados desde las mesas hacia el sistema de cocina (Kitchen Display System - KDS) y el personal de salón.
* Garantizar la eliminación total de condiciones de carrera y comandas duplicadas en momentos de alta frecuencia de pedidos.

---

## 2. Límites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Emisión de Pedidos desde Mesa:** Envío de comandas asociadas a un `table_token` activo con especificación de platos, modificadores seleccionados y notas especiales.
* **Encolamiento Asíncrono FIFO:** Inserción de comandas en una cola asíncrona que garantiza el procesamiento secuencial en orden estricto de llegada (`ADR-0007`).
* **Pantalla de Cocina (Kitchen Display System - KDS):** Interfaz interactiva para el equipo de cocina que muestra las comandas activas organizadas por tiempo de espera y estado.
* **Gestión de Estados de Comanda:** Transiciones de estado en tiempo real: `En Cola` -> `Recibido` -> `En Preparación` -> `Listo para Servir` -> `Entregado`.
* **Notificaciones Bidireccionales en Tiempo Real:** Actualización instantánea de pantallas vía WebSockets (`ws://`) sin necesidad de refresco manual.

### Funcionalidades Excluidas (Out-of-Scope)
* **Pagos en Línea:** Procesamiento de cobros integrados con pasarelas de pago.
* **Integración con Impresoras Térmicas/Fiscales:** Impresión física directa de comandas en papel (diferido para iteración posterior).

---

## 3. Restricciones y Asunciones
* **Notificación en Tiempo Real (< 100ms):** El tiempo transcurrido desde que se confirma el pedido hasta que se renderiza en la pantalla KDS de cocina no debe superar los 100ms.
* **Garantía Inmutable FIFO:** El trabajador backend debe consumir las comandas respetando el orden cronológico estricto de llegada.
* **Seguridad Multi-Tenant:** La emisión de eventos WebSockets debe estar aislada por Tenant mediante evaluación de políticas OPA/Rego (`ADR-0006`).

---

## 4. Decisiones Previas
* **ADR-0001:** SDD y Docs-as-Code.
* **ADR-0002:** Separación de repositorios.
* **ADR-0003:** Persistencia semiestructurada en PostgreSQL utilizando columnas `JSONB`.
* **ADR-0006:** Autorización declarativa desacoplada con OPA y Rego.
* **ADR-0007:** Procesamiento de pedidos con cola FIFO (Redis Streams) y eventos WebSockets en tiempo real.

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Implementar la vista interactiva de la Pantalla de Cocina (KDS) con tarjetas de comandas ordenadas por cronómetro.
* Desarrollar el gestor de cliente WebSocket con reconexión automática y sincronización de estado.
* Construir la vista de resumen de pedido en el cliente de mesa.

### Tareas de Backend (`resto-core-back`)
* Diseñar el endpoint de emisión de comandas: `POST /api/v1/orders`.
* Desarrollar el productor de cola en Redis Streams y el worker consumidor FIFO.
* Implementar el servidor WebSocket con canales aislados por `tenant_id`.

---

## 6. Criterios de Verificación (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ asignar un identificador correlativo único y una marca de tiempo a cada comanda recibida.
* **Event-Driven:** CUANDO el cliente confirme su pedido en la mesa, el sistema DEBERÁ encolar la solicitud en la cola FIFO del Tenant y retornar código HTTP 202 Accepted.
* **State-Driven:** MIENTRAS la comanda se encuentre en estado `En Preparación`, la pantalla KDS DEBERÁ destacar el tiempo transcurrido con indicadores cromáticos de alerta.
* **Unwanted Behavior:** SI la conexión WebSocket de la cocina se interrumpe, ENTONCES el cliente KDS DEBERÁ intentar reconectarse automáticamente re-sincronizando las comandas activas tras restablecer el canal.

### Escenarios Gherkin

```gherkin
Feature: Comanda de Cocina y Procesamiento de Pedidos en Tiempo Real
  Scenario: Envío y recepción exitosa de comanda en pantalla KDS
    Given que el cliente se encuentra en una mesa con `table_token` activo
    When confirma la comanda con 2 "Hamburguesas Gourmet" (Punto: A Punto)
    Then el backend DEBERÁ encolar el pedido en la cola FIFO de Redis
    And la pantalla KDS de cocina DEBERÁ emitir un sonido de alerta y renderizar la nueva tarjeta en menos de 100ms vía WebSockets

  Scenario: Transición de estado de comanda por el cocinero
    Given que una comanda se encuentra visible en la pantalla KDS con estado "Recibido"
    When el cocinero presiona el botón "Iniciar Preparación"
    Then el sistema DEBERÁ actualizar el estado a "En Preparación"
    And DEBERÁ notificar instantáneamente la actualización al panel del personal de salón
```
