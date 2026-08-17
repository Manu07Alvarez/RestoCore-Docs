# Documento de Requisitos de Producto (PRD): Panel de Administración CRUD para Restaurantes

Este documento establece las especificaciones funcionales, límites de alcance y criterios de aceptación para el módulo de **Administración CRUD del Restaurante** dentro del ecosistema RestoCore (Módulo 02 del Playbook de Ingeniería y Fase 3 del Flujo de Trabajo Homologado SDD).

---

## 1. Resultados (Outcomes)
* Permitir a los administradores de restaurante gestionar autónomamente su oferta gastronómica (categorías, platos, precios, modificadores y disponibilidad) y la configuración de sus mesas físicas con códigos QR.
* Garantizar que las modificaciones realizadas en el panel de administración se propaguen inmediatamente a la Carta QR pública manteniendo el presupuesto de latencia (< 2s LCP).

---

## 2. Límites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Gestión de Menú y Categorías:** Crear, editar, reordenar y ocultar categorías y platos gastronómicos.
* **Gestión de Modificadores:** Configurar grupos de opciones de personalización (ejemplo: punto de cocción, agregados) con deltas de precio y límites de selección mínima/máxima.
* **Gestión de Disponibilidad Instantánea:** Marcar platos o categorías como agotados o inactivos en tiempo real.
* **Gestión de Mesas y Códigos QR:** Crear mesas, asignarlas a sectores/zonas, generar sus tokens de seguridad (`table_token`) y alternar su estado (`active`/`disabled`).
* **Configuración del Tenant:** Actualizar la marca comercial, logo y paleta de colores del restaurante.
* **Carga Asíncrona de Imágenes:** Generación de URLs pre-firmadas para subir fotos de platos y logos directamente a SeaweedFS.

### Funcionalidades Excluidas (Out-of-Scope)
* **Pagos en Línea:** Integración con pasarelas de pago (diferido para iteraciones posteriores).
* **Llamadas a Mozo:** Sistema de solicitud de atención instantánea desde la mesa (diferido).
* **Programas de Fidelidad:** Gestión de puntos, cupones de descuento o promociones avanzadas.
* **Nota de Arquitectura Futura (Cola de Pedidos):** El motor de procesamiento de pedidos en tiempo real con WebSockets y cola FIFO (First-In, First-Out) para prevenir condiciones de carrera se abordará en un PRD/ADR dedicado exclusivamente a la Comanda de Cocina.

---

## 3. Restricciones y Asunciones
* **Seguridad y Autenticación:** Todas las rutas del Panel de Administración (`/api/v1/admin/*`) deberán requerir autenticación JWT/OAuth2 con rol de Administrador de Tenant.
* **Presupuesto de Latencia:** Al guardar un cambio en el catálogo, la actualización del menú en PostgreSQL debe completar en menos de 500ms y forzar la invalidación del caché perimetral en la CDN.
* **Manejo de Archivos:** Queda prohibida la carga directa de archivos multipart al servidor de la API principal. Las imágenes de platos deben subirse mediante URLs pre-firmadas a SeaweedFS.

---

## 4. Decisiones Previas
* **ADR-0001:** Cumplimiento estricto de Spec-Driven Development y Docs-as-Code.
* **ADR-0002:** Separación de repositorios (Frontend `resto-core-front`, Backend `resto-core-back` y Specs `RestoCore-Docs`).
* **ADR-0003:** Persistencia semiestructurada en PostgreSQL utilizando columnas `JSONB` e índices `GIN` para la gestión flexible de categorías, platos y modificadores.

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Implementar formularios de administración para categorías, platos, modificadores y mesas.
* Construir el componente de carga de imágenes integrado con la solicitud de URLs pre-firmadas.
* Desarrollar la vista de gestión de mesas con previsualización y exportación de códigos QR.

### Tareas de Backend (`resto-core-back`)
* Diseñar endpoints REST protegidos: `POST /api/v1/admin/menu/categories`, `PUT /api/v1/admin/menu/items`, `POST /api/v1/admin/tables`, `POST /api/v1/admin/images/presigned-url`.
* Implementar la mutación de estructuras `JSONB` en PostgreSQL para menus y la gestión de tablas.

---

## 6. Criterios de Verificación (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ exigir token JWT válido en el encabezado `Authorization` para todas las solicitudes al módulo de administración.
* **Event-Driven:** CUANDO el administrador solicite subir una imagen de un plato, el sistema DEBERÁ retornar una URL pre-firmada de SeaweedFS con expiración temporal.
* **State-Driven:** MIENTRAS un plato esté marcado como `is_available == false`, el sistema DEBERÁ deshabilitar la opción de selección en la Carta QR pública.
* **Unwanted Behavior:** SI una solicitud intenta modificar un Tenant distinto al autenticado en el token JWT, ENTONCES el sistema DEBERÁ rechazar la operación con código HTTP 403 Forbidden.

### Escenarios Gherkin

```gherkin
Feature: Administración CRUD de Menú y Mesas
  Scenario: Creación exitosa de un nuevo plato con carga de imagen asíncrona
    Given que el administrador está autenticado con un token JWT válido de su tenant
    When envía una solicitud para generar una URL pre-firmada de carga de imagen
    And sube la foto directamente a SeaweedFS
    And registra el plato con su nombre, precio e image_url en el endpoint de administración
    Then el sistema DEBERÁ actualizar la estructura JSONB del menú en PostgreSQL
    And el plato DEBERÁ estar disponible inmediatamente en la Carta QR pública

  Scenario: Inhabilitación de mesa en salón
    Given que el administrador selecciona la "Mesa 04" en el panel de control
    When cambia el estado de la mesa a "disabled"
    Then el sistema DEBERÁ denegar la recepción de nuevas interacciones desde el QR de la "Mesa 04"
```
