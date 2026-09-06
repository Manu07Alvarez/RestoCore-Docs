# Especificación Técnica del Backend (.NET 10) - RestoCore

Este documento reúne la especificación técnica, arquitectura, interfaces y estado de implementación del servicio de backend (`resto-core-back`).

---

## 1. Stack Tecnológico y Principios de Diseño
* **Runtime & Lenguaje:** .NET 10 / C# 13.
* **Paradigma de Arquitectura:** Clean Architecture con desacoplamiento en capas (Domain, Application, Infrastructure, Api).
* **Patrón de Mediación:** MediatR (CQRS) separando comandos de mutación y consultas optimizadas.
* **Persistencia:** Entity Framework Core con Npgsql sobre PostgreSQL 16+.
* **Esquemas Híbridos:** Almacenamiento semiestructurado mediante columnas `JSONB` e índices `GIN` para etiquetas dietarias y configuraciones de branding (`ADR-0003`).
* **Aislamiento Multi-Tenant:** Filtros globales de consulta en EF Core (`ITenantScopedEntity`) y Middleware de resolución en ASP.NET Core.
* **Seguridad Declarativa:** Validación de reglas desacoplada mediante integración HTTP con Open Policy Agent (OPA) (`ADR-0006`).
* **Generación de QR:** Exportación nativa vectorial (SVG) y rasterizada (PNG) mediante QRCoder.
* **Observabilidad:** OpenTelemetry instrumentado con propagación de contexto W3C y enriquecimiento con `tenant.id`.

---

## 2. Proyectos del Ecosistema Backend
* **`RestoCore.Domain`:** Entidades (`Tenant`, `Category`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Table`), Value Objects (`BrandingConfig`), contratos e interfaces de alcance tenant.
* **`RestoCore.Application`:** Handlers CQRS, DTOs de respuesta y validadores FluentValidation organizados por features (`Categories`, `MenuItems`, `Kitchen`, `PublicMenu`, `QrCodes`, `Tenants`).
* **`RestoCore.Infrastructure`:** `ApplicationDbContext`, mapeos de EF Core, migraciones, middleware multi-tenant, cliente OPA, servicio QR y extensiones de OpenTelemetry.
* **`RestoCore.Api`:** Mapeo modular de Minimal APIs (`PublicMenuEndpoints`, `AdminCatalogEndpoints`, `AdminTableEndpoints`, `AdminTenantEndpoints`, `KitchenEndpoints`, `HealthEndpoints`) y `GlobalExceptionHandler`.
* **`RestoCore.UnitTests`:** Suite de pruebas unitarias automatizadas (18 tests superados exitosamente).

---

## 3. Endpoints Implementados
* `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima de la carta digital pública con soporte para `If-None-Match` / `ETag` (HTTP 304 Not Modified) y `Cache-Control`.
* `GET /r/{tenant_slug}`: Enlace corto de redirección para códigos QR físicos.
* `POST /api/v1/admin/categories`: Alta de categorías (requiere rol `TenantAdminOnly`).
* `POST /api/v1/admin/items`: Creación de platos con precios y etiquetas dietarias.
* `POST /api/v1/admin/items/{id}/modifiers`: Asignación de grupos de modificadores.
* `PUT /api/v1/admin/branding`: Configuración de identidad visual del restaurante.
* `GET /api/v1/admin/tables/{id}/qr`: Generación y descarga de códigos QR para mesas (SVG/PNG).
* `PATCH /api/v1/kitchen/items/{id}/availability`: Alternancia de disponibilidad de productos para cocina (`KitchenOnly`).
* `POST /api/v1/admin/tenants`: Aprovisionamiento de nuevas cuentas gastronómicas (`SuperAdminOnly`).
* `GET /healthz` & `GET /ready`: Monitoreo de disponibilidad del proceso y conexión con base de datos.
