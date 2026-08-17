# Especificación de API REST (OpenAPI 3.1)

Los contratos de comunicación cliente-servidor se especifican formalmente en la sintaxis OpenAPI 3.1.

---

## Endpoints Principales

### 1. Lectura de Carta QR Pública
* **Método:** `GET /api/v1/tenants/{tenant_slug}/menu`
* **Parámetros Opciónales:** `table_token={token}`
* **Restricción de Latencia:** Responded en < 500ms desde backend, < 2s LCP en cliente.

### 2. Administración CRUD
* **Método:** `POST /api/v1/admin/menu/categories`
* **Método:** `PUT /api/v1/admin/menu/items`
* **Método:** `POST /api/v1/admin/tables`
* **Método:** `POST /api/v1/admin/images/presigned-url` (Generación de URL pre-firmada para SeaweedFS)
