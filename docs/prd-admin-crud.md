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
  * **Modificación Total y Parcial de Platos:** Soportar operaciones de actualización completa (`PUT`) y modificación parcial de atributos (`PATCH`), incluyendo nombre, descripción, precio base, disponibilidad, imagen, modificadores y etiquetas dietéticas.
  * **Relación Estructural 1:N (Platos y Categorías):** Definir una asociación estricta de un plato a una categoría única (`1:N`) mediante clave foránea obligatoria `category_id`. Esta cardinalidad unívoca previene ambigüedades en la navegación y maximiza la eficiencia del caching perimetral en CDN sin la sobrecarga relacional de tablas intermedias.
  * **Etiquetas Dietéticas (`DietaryLabels`):** Retener el catálogo estructurado de etiquetas dietéticas y alérgenos (`celiac_safe`, `vegan`, `vegetarian`, `dairy_free`, `nut_free`, etc.) tanto en contratos de API como en persistencia para informar adecuadamente a los comensales.
* **Política de Baja Suave (Soft Delete) y Ventana de Retención de 7 Días:**
  * Los platos eliminados por el usuario se marcan con fecha de baja (`deleted_at`) y se ocultan inmediatamente de la carta pública.
  * Se establece una ventana de gracia de 7 días (1 semana) donde el plato permanece en estado archivado y puede ser restaurado desde el panel de administración.
  * Al transcurrir los 7 días desde `deleted_at`, un proceso en segundo plano (worker/cron) ejecuta la purga definitiva física del registro en PostgreSQL y la eliminación de los archivos multimedia asociados en SeaweedFS.
* **Gestión de Modificadores:** Configurar grupos de opciones de personalización (ejemplo: punto de cocción, agregados) con deltas de precio y límites de selección mínima/máxima.
* **Gestión de Disponibilidad Instantánea:** Marcar platos o categorías como agotados o inactivos en tiempo real.
* **Gestión de Mesas y Códigos QR:** Crear mesas, asignarlas a sectores/zonas, generar sus tokens de seguridad (`table_token`) y alternar su estado (`active`/`disabled`).
* **Configuración del Tenant:** Actualizar la marca comercial, logo y paleta de colores del restaurante.
* **Carga Asíncrona de Imágenes:** Generación de URLs pre-firmadas para subir fotos de platos y logos directamente a SeaweedFS.

### Funcionalidades Excluidas (Out-of-Scope)
* **Relación N:M entre Platos y Categorías:** Se descarta la pertenencia de un mismo plato a múltiples categorías simultáneas en el MVP para evitar inconsistencias de precios y complejidad innecesaria en la carta QR.
* **Purga Física Inmediata:** Queda prohibida la eliminación destructiva en caliente de platos sin transcurrir los 7 días de retención reglamentarios.
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
* **ADR-0010:** Baja Suave de Platos (Soft Delete), Retención de 7 Días, Snapshots Inmutables en Comandas y Purga Definitiva Programada.

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Implementar formularios de administración para categorías, platos, modificadores y mesas.
* Soportar edición total (`PUT`) y edición rápida de campos individuales (`PATCH`) para platos existentes.
* Construir selector de categoría unívoca (`1:N`) y componentes de selección de etiquetas dietéticas (`DietaryLabels`).
* Desarrollar panel de papelera/recuperación de platos en baja suave con cuenta regresiva de retención de 7 días y acción de restauración.
* Construir el componente de carga de imágenes integrado con la solicitud de URLs pre-firmadas.
* Desarrollar la vista de gestión de mesas con previsualización y exportación de códigos QR.

### Tareas de Backend (`resto-core-back`)
* [x] Diseñar e implementar endpoints REST protegidos: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/admin/categories`, `POST /api/v1/admin/items`, `DELETE /api/v1/admin/items/{id}`, `POST /api/v1/admin/items/{id}/restore`, `GET /api/v1/admin/tables/{id}/qr`, `POST /api/v1/storage/presigned-upload`.
* [ ] Implementar endpoints REST de modificación de platos: `PUT /api/v1/admin/items/{id}` (modificación total) y `PATCH /api/v1/admin/items/{id}` (modificación parcial de atributos).
* [ ] Implementar validación relacional estricta: rechazo con HTTP 422/400 si el `category_id` suministrado no existe o no pertenece al tenant activo.
* [ ] Actualizar flujo de baja suave en `DELETE /api/v1/admin/items/{id}` para registrar `deleted_at = UtcNow` y programar la purga a 7 días.
* [ ] Implementar worker de purga en segundo plano (`PurgeArchivedDishesWorker`) que ejecute `DELETE FROM dishes WHERE is_deleted = true AND deleted_at <= NOW() - INTERVAL '7 days'` y elimine los binarios correspondientes en SeaweedFS.
* [x] Implementar la mutación de estructuras `JSONB` en PostgreSQL para menús, modificadores y la gestión de tablas físicas.
* [x] Implementar el patrón Repositorio segregado (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`) y `IUnitOfWork` con resiliencia ante concurrencia optimista (`DbUpdateConcurrencyException`).

---

## 6. Criterios de Verificación (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ exigir token JWT válido en el encabezado `Authorization` para todas las solicitudes al módulo de administración.
* **Event-Driven:** CUANDO el administrador modifique los atributos de un plato, el sistema DEBERÁ validar y actualizar los datos en el catálogo.
* **Event-Driven:** CUANDO el administrador solicite la eliminación de un plato, el sistema DEBERÁ registrar la marca de tiempo de baja (`deleted_at`), ocultar el plato de la vista pública y programar su purga física para 7 días posteriores.
* **Event-Driven:** CUANDO transcurra el plazo de 7 días desde la baja suave, el sistema DEBERÁ eliminar definitivamente el registro de la base de datos y sus activos en el almacenamiento.
* **State-Driven:** MIENTRAS un plato permanezca en periodo de baja suave (menos de 7 días desde `deleted_at`), el sistema DEBERÁ permitir su restauración desde el panel administrativo.
* **Unwanted Behavior:** SI se intenta asociar un plato a una categoría inexistente o no válida, ENTONCES el sistema DEBERÁ rechazar la operación y retornar un error de validación.
* **State-Driven:** MIENTRAS un plato esté marcado como `is_available == false`, el sistema DEBERÁ deshabilitar la opción de selección en la Carta QR pública.
* **Unwanted Behavior:** SI una solicitud intenta modificar un Tenant distinto al autenticado en el token JWT, ENTONCES el sistema DEBERÁ rechazar la operación con código HTTP 403 Forbidden.

### Escenarios Gherkin

```gherkin
Feature: Administración CRUD de Menú y Ciclo de Vida de Platos
  Scenario: Modificación exitosa de los datos y etiquetas dietéticas de un plato existente
    Given que el administrador está autenticado con un token JWT válido de su tenant
    When envía una solicitud PUT al endpoint del plato con nuevo precio, descripción y dietary_labels ["celiac_safe", "vegan"]
    Then el sistema DEBERÁ validar y actualizar los atributos del plato en PostgreSQL
    And el menú público DEBERÁ reflejar los cambios en menos de 500 milisegundos

  Scenario: Intento de asociar un plato a una categoría inexistente
    Given que el administrador intenta crear o actualizar un plato
    When especifica un "category_id" que no existe en el catálogo del tenant
    Then el sistema DEBERÁ rechazar la operación con código HTTP 422 Unprocessable Entity
    And retornar un mensaje indicando que la categoría especificada no es válida

  Scenario: Retiro de plato con ventana de retención de 7 días
    Given que el administrador solicita archivar el plato "Hamburguesa Clásica" sin comandas activas en cocina
    When envía una solicitud DELETE al endpoint del plato
    Then el sistema DEBERÁ registrar la fecha en "deleted_at" y marcar "is_deleted = true"
    And el plato DEBERÁ ser excluido inmediatamente de la Carta QR pública
    And el sistema DEBERÁ programar su purga física definitiva para 7 días posteriores

  Scenario: Restauración de un plato dentro de la ventana de 7 días
    Given que un plato tiene una fecha "deleted_at" registrada hace 3 días
    When el administrador envía una solicitud POST al endpoint de restauración
    Then el sistema DEBERÁ restablecer "is_deleted = false" y "deleted_at = null"
    And el plato DEBERÁ volver a estar disponible en el panel administrativo y en la carta digital

  Scenario: Purga física definitiva tras vencer el plazo de 7 días
    Given que existen platos con "deleted_at" mayor a 7 días de antigüedad
    When el worker de purga programada ejecuta su ciclo diario
    Then el sistema DEBERÁ eliminar permanentemente los registros de la base de datos
    And solicitar a SeaweedFS la eliminación física de las imágenes asociadas
```
