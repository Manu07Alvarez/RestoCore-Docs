# Especificación de API REST (OpenAPI 3.1 & Seguridad OPA)

Este documento describe la interfaz técnica REST API, contratos de datos y políticas de autorización declarativas para el ecosistema **RestoCore**.

---

## 📄 Contrato de API OpenAPI 3.1 (`specs/openapi.yaml`)

El contrato oficial se especifica bajo el estándar OpenAPI 3.1.0 dentro del archivo [`specs/openapi.yaml`](file:///R:/Programando/RestoCore/RestoCore-Docs/specs/openapi.yaml) en la raíz del repositorio.

### Endpoints Principales

1. **Carta Digital Pública (Acceso Anónimo & Soporte Dual):**
   * `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima del catálogo completo (< 2s LCP), servido desde la CDN perimetral con cabeceras `Cache-Control` e `ETag`. Incluye el objeto opcional `layout_config` que define las coordenadas, capas y fondos del modo lienzo (Canvas Mode).

2. **Capa de Maquetación de Lienzo Personalizado (Protegido `owner` / `tenant_admin`):**
   * `PUT /api/v1/admin/menu/layout`: Guarda, actualiza o restablece el objeto de configuración visual `layout_config` (coordenadas relativas `x`/`y`, `width`, `height`, `z_index`, `background_url`, `background_color` y bandera `canvas_enabled`).

3. **Carga Asíncrona de Imágenes y Fondos (SeaweedFS):**
   * `POST /api/v1/storage/presigned-upload` (y alias `/api/v1/media/presigned-url`): Emisión de URLs temporales pre-firmadas para transmitir fotografías de platos y fondos de lienzo directamente a SeaweedFS sin saturar el servidor de API (`ADR-0004`).

4. **Administración CRUD de Catálogo y Mesas (Protegido `owner` / `tenant_admin`):**
   * `POST /api/v1/admin/categories`: Creación y reordenamiento de categorías.
   * `POST /api/v1/admin/items`: Creación y edición de platos, modificadores y precios con soporte JSONB.
   * `GET /api/v1/admin/tables/{id}/qr`: Descarga de código QR dinámico para mesas físicas en formato vectorial (SVG) o binario (PNG).

5. **Comandas de Cocina y Salón (Protegido `cook` / `waiter`):**
   * `PATCH /api/v1/kitchen/items/{id}/availability`: Pausa y reanudación inmediata de disponibilidad de stock desde la cocina.
   * `GET /healthz` & `GET /ready`: Monitoreo de vitalidad y verificación concurrente de dependencias externas (PostgreSQL, Redis, SeaweedFS, OPA).

---

## 🛡️ Seguridad Declarativa OPA / Rego (`specs/policies/authz.rego`)

Las políticas de autorización están desacopladas del backend y se especifican en sintaxis Rego dentro de `specs/policies/authz.rego` (`ADR-0006`):

### Matriz de Jerarquía de Roles y Visión Limitada

| Rol / Actor | Lectura Pública Menú | CRUD Catálogo & Precios | Gestión Branding & QR | Gestión Lienzo (Canvas) | Ver KDS / Comandas | Cambiar Stock Cocina |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cliente Anónimo** | Autorizado | Denegado | Denegado | Denegado | Denegado | Denegado |
| **Dueño (`owner`)** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
| **Cocinero (`cook`)** | Autorizado | Denegado | Denegado | Denegado | Autorizado | Autorizado |
| **Mozo (`waiter`)** | Autorizado | Denegado | Denegado | Denegado | Autorizado | Denegado |
| **SuperAdmin** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
