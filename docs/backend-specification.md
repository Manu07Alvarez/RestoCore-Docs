# Especificación Técnica del Backend (.NET 10) - RestoCore

Este documento reúne la especificación técnica, arquitectura, interfaces, infraestructura y estado de implementación del servicio de backend (`resto-core-back`).

---

## 1. Stack Tecnológico y Principios de Diseño
* **Runtime & Lenguaje:** .NET 10 / C# 13.
* **Paradigma de Arquitectura:** Clean Architecture con desacoplamiento en capas (Domain, Application, Infrastructure, Api).
* **Patrón de Casos de Uso:** Mediador permisivo zero-dependency (`RestoCore.Application/Common/Mediator`) para CQRS de alto rendimiento.
* **Persistencia:** Entity Framework Core con Npgsql sobre PostgreSQL 16+.
* **Esquemas Híbridos:** Almacenamiento semiestructurado mediante columnas `JSONB` e índices `GIN` para etiquetas dietarias y configuraciones de branding (`ADR-0003`).
* **Aislamiento Multi-Tenant:** Filtros globales de consulta en EF Core (`ITenantScopedEntity`) y Middleware de resolución en ASP.NET Core.
* **Almacenamiento Desacoplado:** SeaweedFS (S3-compatible) mediante URLs pre-firmadas temporales (`ADR-0004`).
* **Seguridad Declarativa:** Validación de reglas desacoplada mediante integración HTTP con Open Policy Agent (OPA) (`ADR-0006`).
* **Generación de QR:** Exportación nativa vectorial (SVG) y rasterizada (PNG) mediante QRCoder.
* **Observabilidad y Telemetría:** OpenTelemetry instrumentado con propagación de contexto W3C, enriquecimiento con `tenant.id` y visualización OTLP en .NET Aspire Dashboard (`ADR-0005`, `ADR-0006`).
* **Documentación Interactiva:** Swagger UI habilitado en ambiente de desarrollo.

---

## 2. Proyectos del Ecosistema Backend
* **`RestoCore.Domain`:** Entidades (`Tenant`, `Category`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Table`), Value Objects (`BrandingConfig`), contratos e interfaces de alcance tenant.
* **`RestoCore.Application`:** Handlers CQRS, DTOs de respuesta y validadores FluentValidation organizados por features (`Categories`, `MenuItems`, `Kitchen`, `PublicMenu`, `QrCodes`, `Storage`, `Tenants`).
* **`RestoCore.Infrastructure`:** `ApplicationDbContext`, mapeos de EF Core, migraciones, middleware multi-tenant, cliente OPA, servicio QR, servicio de almacenamiento SeaweedFS y extensiones de OpenTelemetry.
* **`RestoCore.Api`:** Mapeo modular de Minimal APIs (`PublicMenuEndpoints`, `AdminCatalogEndpoints`, `AdminTableEndpoints`, `AdminTenantEndpoints`, `KitchenEndpoints`, `StorageEndpoints`, `HealthEndpoints`) y `GlobalExceptionHandler`.
* **`RestoCore.UnitTests`:** 18 pruebas unitarias superadas.
* **`RestoCore.IntegrationTests`:** 11 pruebas de integración con `CustomWebApplicationFactory` y `ContainerizedStackFixture` superadas.
* **`RestoCore.SecurityTests`:** 1 prueba de aislamiento multi-tenant en base de datos superada.

---

## 3. Endpoints Implementados
* `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima de la carta digital pública con soporte para `If-None-Match` / `ETag` (HTTP 304 Not Modified) y `Cache-Control`.
* `GET /r/{tenant_slug}`: Enlace corto de redirección para códigos QR físicos.
* `POST /api/v1/storage/presigned-upload`: Generación de URLs pre-firmadas temporales para subida de fotos a SeaweedFS (`TenantAdminOnly`).
* `POST /api/v1/admin/categories`: Alta de categorías (requiere rol `TenantAdminOnly`).
* `POST /api/v1/admin/items`: Creación de platos con precios y etiquetas dietarias JSONB.
* `POST /api/v1/admin/items/{id}/modifiers`: Asignación de grupos de modificadores.
* `PUT /api/v1/admin/branding`: Configuración de identidad visual del restaurante.
* `GET /api/v1/admin/tables/{id}/qr`: Generación y descarga de códigos QR para mesas (SVG/PNG).
* `PATCH /api/v1/kitchen/items/{id}/availability`: Alternancia de disponibilidad de productos para cocina (`KitchenOnly`).
* `POST /api/v1/admin/tenants`: Aprovisionamiento de nuevas cuentas gastronómicas (`SuperAdminOnly`).
* `GET /healthz` & `GET /ready`: Monitoreo de disponibilidad del proceso y conexión concurrente con PostgreSQL, Redis, SeaweedFS y OPA.
