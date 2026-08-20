# Especificación de API REST (OpenAPI 3.1 & Seguridad OPA)

Este documento describe la interfaz técnica REST API y las políticas de autorización declarativas para el ecosistema **RestoCore**.

---

## 📄 Contrato de API OpenAPI 3.1 (`specs/openapi.yaml`)

El contrato oficial se especifica en formato OpenAPI 3.1.0 dentro del archivo `specs/openapi.yaml` en la raíz del repositorio.

### Endpoints Principales

1. **Carta QR Pública del Restaurante (Acceso Anónimo):**
   * `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima del menú completo (< 2s LCP), servido desde la CDN perimetral con cabeceras `Cache-Control` e `ETag: {version_hash}`.

2. **Carga Asíncrona de Imágenes (SeaweedFS):**
   * `POST /api/v1/admin/images/presigned-url`: Generación de URLs pre-firmadas temporales para transmitir fotografías directamente a SeaweedFS sin saturar la API principal (`ADR-0004`).

3. **Administración CRUD de Catálogo y Mesas (Protegido `owner` / `tenant_admin`):**
   * `POST /api/v1/admin/menu/categories`: Creación/reordenamiento de categorías.
   * `PUT /api/v1/admin/menu/items`: Creación/edición de platos, modificadores y precios.
   * `POST /api/v1/admin/tables`: Configuración de mesas físicas y generación de `table_token`.

4. **Comandas de Cocina y Salón (Protegido `cook` / `waiter`):**
   * `GET /api/v1/orders`: Lectura de comandas activas para KDS / Mozo.
   * `POST /api/v1/orders`: Emisión de pedidos desde la mesa con respuesta asíncrona HTTP 202 Accepted y procesamiento en cola FIFO (`ADR-0007`).
   * `PATCH /api/v1/orders/{order_id}/status`: Transición de estados de comandas (`En Preparación` -> `Listo`).

---

## 🛡️ Seguridad Declarativa OPA / Rego (`specs/policies/authz.rego`)

Las políticas de autorización están desacopladas del backend y se especifican en sintaxis Rego dentro de `specs/policies/authz.rego` (`ADR-0006`):

### Matriz de Jerarquía de Roles y Visión Limitada

| Rol / Actor | Lectura Pública Menu | CRUD Catálogo & Precios | Gestión Branding & QR | Ver KDS / Comandas | Cambiar Estado Comanda | Emitir Pedido Mesa |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cliente Anónimo** | Autorizado | Denegado | Denegado | Denegado | Denegado | Denegado |
| **Dueño (`owner`)** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
| **Cocinero (`cook`)** | Autorizado | Denegado | Denegado | Autorizado | Autorizado | Denegado |
| **Mozo (`waiter`)** | Autorizado | Denegado | Denegado | Autorizado | Autorizado | Autorizado |
| **SuperAdmin** | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado | Autorizado |
