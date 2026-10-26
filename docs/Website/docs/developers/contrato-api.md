# Especificación de API REST (OpenAPI 3.1 & Seguridad OPA)

Este documento describe la interfaz técnica REST API, contratos de datos y políticas de autorización declarativas para el ecosistema **RestoCore**.

---

## Contrato de API OpenAPI 3.1 (`specs/openapi.yaml`)

El contrato oficial se especifica bajo el estándar OpenAPI 3.1.0 dentro del archivo [`specs/openapi.yaml`](file:///R:/Programando/RestoCore/RestoCore-Docs/specs/openapi.yaml) en la raíz del repositorio.

### Endpoints Principales

0. **Autenticación e Identidad (JWT & Credenciales):**
   * `POST /api/v1/auth/login`: Autenticación pública de usuarios (dueños de restaurante, personal de cocina, superadministradores) y emisión de token JWT firmado con claims de identidad, roles (`owner`, `tenant_admin`, `kitchen_staff`, `cook`, `super_admin`) y contexto multi-tenant (`tenant_id`, `tenant_slug`).
   * `GET /api/v1/auth/me`: Consulta protegida mediante `BearerAuth` que retorna los claims, roles y tenant asignado del usuario en sesión.

1. **Carta Digital Pública (Acceso Anónimo & Distribución Perimetral CDN):**
   * `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima del catálogo completo (< 2s LCP), servido desde la red perimetral (CDN) con cabeceras `Cache-Control: public, max-age=3600, s-maxage=86400` y validación condicional `ETag`. Omite automáticamente productos en baja suave. Soporta filtro opcional multietiqueta `dietary_labels` (intersección N:M para alimentos veganos/sin TACC y bebidas con/sin alcohol). Expone datos útiles del restaurante (`phone_number`, `address`, `business_hours`) e incluye el objeto `layout_config` plano optimizado para maquetación en modo lienzo.

2. **Capa de Maquetación de Lienzo Personalizado (Protegido `owner` / `tenant_admin`):**
   * `PUT /api/v1/admin/menu/layout`: Guarda, actualiza o restablece el objeto de configuración visual `layout_config` (coordenadas relativas `x`/`y`, `width`, `height`, `z_index`, `background_url`, `background_color` y bandera `canvas_enabled`).
   * `POST /api/v1/admin/menu/publish`: Desencadena el pipeline asíncrono de compilación Ahead-Of-Time (AOT), compresión de activos en SeaweedFS a WebP/AVIF con variantes `srcset`, generación del artefacto estático y purgado inmediato de la caché perimetral en la CDN (SLA < 3 segundos).

3. **Carga Asíncrona de Imágenes y Fondos (SeaweedFS):**
   * `POST /api/v1/storage/presigned-upload` (y alias `/api/v1/media/presigned-url`): Emisión de URLs temporales pre-firmadas para transmitir fotografías de platos y fondos de lienzo directamente a SeaweedFS sin saturar el servidor de API (`ADR-0004`).

4. **Administración CRUD de Catálogo, Ciclo de Vida y Mesas (Protegido `owner` / `tenant_admin`):**
   * `GET /api/v1/admin/categories`: Listado de categorías del restaurante ordenadas por `sort_order`.
   * `GET /api/v1/admin/categories/{id}`: Consulta detallada de una categoría de menú.
   * `POST /api/v1/admin/categories`: Alta de nuevas categorías como agrupaciones macro a grandes rasgos.
   * `PUT /api/v1/admin/categories/{id}`: Modificación completa de una categoría existente (nombre, descripción, orden y visibilidad).
   * `PATCH /api/v1/admin/categories/{id}`: Modificación parcial de atributos de la categoría.
   * `DELETE /api/v1/admin/categories/{id}`: Baja de categoría con bloqueo relacional (`409 Conflict` si contiene platos asociados activos o archivados) para preservar la integridad referencial (`ON DELETE RESTRICT`).
   * `GET /api/v1/admin/tenant/profile`: Consulta de los datos comerciales y de contacto del restaurante (nombre, teléfono, dirección, horarios).
   * `PUT /api/v1/admin/tenant/profile`: Modificación total de los datos comerciales y de contacto del restaurante (invalida caché CDN).
   * `PATCH /api/v1/admin/tenant/profile`: Modificación parcial de los datos de contacto o nombre del restaurante.
   * `GET /api/v1/admin/permissions`: Consulta del catálogo maestro de privilegios atómicos del sistema (`manage_menu`, `manage_prices`, `read_reports`, `manage_tables`, `read_kitchen_orders`, `manage_roles`, etc.).
   * `GET /api/v1/admin/roles`: Listado de roles del restaurante (roles de sistema y roles personalizados).
   * `POST /api/v1/admin/roles`: Creación de roles personalizados con asignación a medida de privilegios por parte del dueño.
   * `GET /api/v1/admin/roles/{id}`: Detalle de rol y privilegios asociados.
   * `PUT /api/v1/admin/roles/{id}`: Modificación completa de un rol y su conjunto de privilegios.
   * `PATCH /api/v1/admin/roles/{id}`: Modificación parcial de atributos del rol.
   * `DELETE /api/v1/admin/roles/{id}`: Baja de rol personalizado con bloqueo (`409 Conflict` si es un rol de sistema o si tiene colaboradores asignados).
   * `GET /api/v1/admin/staff/{user_id}/roles`: Consulta de roles y privilegios ostentados por un colaborador.
   * `PUT /api/v1/admin/staff/{user_id}/roles`: Asignación o revocación de roles a un miembro del personal del restaurante.
   * `POST /api/v1/admin/items`: Creación de platos asociados a una categoría única (`1:N` vía `category_id`), con asignación múltiple de etiquetas dietéticas N:M (`dietary_labels`: vegano, sin TACC, bebida sin alcohol, etc.) y alérgenos. Retorna `422 Unprocessable Entity` si la categoría no existe en el tenant.
   * `PUT /api/v1/admin/items/{id}`: Modificación total de los datos de un plato existente (precio, categoría, descripción, modificadores y etiquetas dietéticas N:M). Invalida la caché perimetral en la CDN.
   * `PATCH /api/v1/admin/items/{id}`: Modificación parcial de propiedades específicas del plato (disponibilidad, deltas de precio, actualización de etiquetas dietéticas N:M o cambio de categoría).
   * `DELETE /api/v1/admin/items/{id}`: Baja suave de platos (`is_deleted = true`, `deleted_at = UtcNow`) con retención de 7 días respaldada por snapshots inmutables en `OrderItem` (`ADR-0010`). Retorna `200 OK` con `MenuItemArchiveResponse` conteniendo confirmación amigable, ventana de retención (`retention_days: 7`) y fecha de purga física programada. Si existen órdenes abiertas o en preparación en cocina, bloquea con `409 Conflict` y advertencia no técnica.
   * `POST /api/v1/admin/items/{id}/restore`: Reincorporación inmediata de un plato archivado a la carta digital dentro de la ventana de 7 días previa a la purga física.
   * `GET /api/v1/admin/tables/{id}/qr`: Descarga de código QR dinámico para mesas físicas en formato vectorial (SVG) o binario (PNG).

5. **Comandas de Cocina y Salón (Protegido `cook` / `waiter`):**
   * `PATCH /api/v1/kitchen/items/{id}/availability`: Pausa y reanudación inmediata de disponibilidad de stock desde la cocina.
   * `GET /healthz` & `GET /ready`: Monitoreo de vitalidad y verificación concurrente de dependencias externas (PostgreSQL, Redis, SeaweedFS, OPA).

6. **Analítica de Menú e Ingesta de Telemetría (ADR-0011 & ADR-0012):**
   * `POST /api/v1/analytics/collect`: Ingesta anónima y asíncrona de eventos de navegación de comensales (apertura de carta, visualización de plato o interacción con categorías) sin afectar el presupuesto LCP (< 2s).
   * `GET /api/v1/admin/analytics/dashboard`: Consulta protegida (`owner` / `tenant_admin`) de la jerarquía analítica: Tráfico QR (visitas día/mes), platos más vistos, Matriz de Ingeniería de Menú (Estrellas, Caballos de Batalla, Puzzles, Perros) y categorías principales, con desglose de Plan Pro (curva de horas pico y segmentación de dispositivos). La medición de ocupación y rotación de mesas por QR queda pospuesta (`ADR-0012`), reservada para el futuro módulo de Turnos y Recepción (Waitlist).

---

## Seguridad Declarativa OPA / Rego (`specs/policies/authz.rego`)

Las políticas de autorización están desacopladas del backend y se especifican en sintaxis Rego dentro de `specs/policies/authz.rego` (`ADR-0006`):

### Evaluación de Privilegios Dinámicos (Custom RBAC)
El sistema soporta tanto roles base inmutables del sistema (owner, super_admin) como roles dinámicos configurables por el dueño de cada restaurante:
* **Resolución Dinámica:** Para cualquier solicitud protegida, el motor OPA evalúa si la acción requerida (input.action) se encuentra presente dentro del conjunto de privilegios consolidados del usuario (input.action in input.user.permissions), garantizando que los roles personalizados creados por el administrador surtan efecto inmediato sin reiniciar servicios ni modificar código de autorización.

### Matriz de Jerarquía de Roles y Privilegios Base

| Rol / Actor | Lectura Pública Menú | CRUD Catálogo & Precios | Archivar / Restaurar Platos | Gestión Branding & QR | Gestión Lienzo (Canvas) | Publicar Menú & AOT | Crear / Gestionar Roles | Ver KDS / Comandas | Cambiar Stock Cocina |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cliente Anónimo** | Autorizado | Denegado | Denegado | Denegado | Denegado | Denegado | Denegado | Denegado | Denegado |
| **Dueño (owner)** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
| **Rol Personalizado** | Autorizado | Según Privilegio | Según Privilegio | Según Privilegio | Según Privilegio | Según Privilegio | Según Privilegio | Según Privilegio | Según Privilegio |
| **Cocinero (cook)** | Autorizado | Denegado | Denegado | Denegado | Denegado | Denegado | Denegado | Autorizado | Autorizado |
| **Mozo (waiter)** | Autorizado | Denegado | Denegado | Denegado | Denegado | Denegado | Denegado | Autorizado | Denegado |
| **SuperAdmin** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
