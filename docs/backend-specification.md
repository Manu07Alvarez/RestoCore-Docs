# Especificación Técnica del Backend (.NET 10) - RestoCore

Este documento reúne la especificación técnica, arquitectura, interfaces, infraestructura y estado de implementación del servicio de backend (`resto-core-back`).

---

## 1. Stack Tecnológico y Principios de Diseño
* **Runtime & Lenguaje:** .NET 10 / C# 13.
* **Paradigma de Arquitectura:** Clean Architecture con desacoplamiento en capas (Domain, Application, Infrastructure, Api).
* **Patrón de Casos de Uso:** Mediador permisivo zero-dependency (`RestoCore.Application/Common/Mediator`) para CQRS de alto rendimiento.
* **Patrón Repositorio & Unit of Work:** Segregación de interfaces de persistencia por Bounded Contexts (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`) y delimitación transaccional atómica con `IUnitOfWork`.
* **Resiliencia ante Concurrencia Optimista:** Reintentos automáticos con retroceso exponencial (*exponential backoff*) y fluctuación aleatoria (*jitter*) ante colisiones `DbUpdateConcurrencyException` en operaciones críticas (ej. alternancia de disponibilidad en cocina).
* **Persistencia:** Entity Framework Core con Npgsql sobre PostgreSQL 16+.
* **Esquemas Híbridos:** Almacenamiento semiestructurado mediante columnas `JSONB` e índices `GIN` para etiquetas dietarias, configuraciones de branding y maquetación de lienzo Canvas (`ADR-0003`, `ADR-0008`).
* **Aislamiento Multi-Tenant:** Filtros globales de consulta en EF Core (`ITenantScopedEntity`) y Middleware de resolución en ASP.NET Core (`TenantResolutionMiddleware`).
* **Autenticación e Identidad:** Emisión y validación de tokens JWT Bearer (`AuthEndpoints`) con claims de identidad (`sub`), contexto de establecimiento (`tenant_id`, `tenant_slug`) y roles (`owner`, `tenant_admin`, `kitchen_staff`, `cook`, `super_admin`).
* **Configuración CORS Estricta:** Restricción de orígenes cruzados vía `CORS_ALLOWED_ORIGINS` con soporte de credenciales y exposición explícita de cabecera `ETag`.
* **Almacenamiento Desacoplado:** SeaweedFS (S3-compatible) mediante URLs pre-firmadas temporales (`ADR-0004`).
* **Seguridad Declarativa:** Validación de reglas desacoplada mediante integración HTTP con Open Policy Agent (OPA) (`ADR-0006`).
* **Generación de QR:** Exportación nativa vectorial (SVG) y rasterizada (PNG) mediante QRCoder.
* **Observabilidad y Telemetría:** OpenTelemetry instrumentado con propagación de contexto W3C, enriquecimiento con `tenant.id`, logging de ejecución HTTP estructurado y visualización OTLP en .NET Aspire Dashboard (`ADR-0005`, `ADR-0006`).
* **Documentación Interactiva:** Swagger UI habilitado en ambiente de desarrollo.

---

## 2. Proyectos del Ecosistema Backend
* **`RestoCore.Domain`:** Entidades (`Tenant`, `Category`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Table`, `MenuPublishJob`), Value Objects (`BrandingConfig`, `LayoutConfig`, `CanvasElement`), contratos e interfaces de alcance tenant.
* **`RestoCore.Application`:** Handlers CQRS totalmente desacoplados de `IApplicationDbContext` que interactúan exclusivamente con repositorios e `IUnitOfWork`. DTOs de respuesta y validadores FluentValidation organizados por features (`Auth`, `Categories`, `MenuItems`, `Kitchen`, `MenuLayout`, `PublicMenu`, `QrCodes`, `Storage`, `Tenants`).
* **`RestoCore.Infrastructure`:** `ApplicationDbContext`, mapeos de EF Core, repositorios concretos (`CatalogRepository`, `KitchenRepository`, `MenuLayoutRepository`, `TenantRepository`), `UnitOfWork` transaccional con manejo de concurrencia, servicio AOT `MenuCompilationService`, purgado CDN `LocalDevelopmentCdnPurgeService`, middleware multi-tenant, cliente OPA, servicio QR, servicio de almacenamiento SeaweedFS y extensiones OTel.
* **`RestoCore.Api`:** Mapeo modular de Minimal APIs (`AuthEndpoints`, `PublicMenuEndpoints`, `AdminMenuLayoutEndpoints`, `AdminCatalogEndpoints`, `AdminTableEndpoints`, `AdminTenantEndpoints`, `KitchenEndpoints`, `StorageEndpoints`, `HealthEndpoints`), middleware de logging estructurado y `GlobalExceptionHandler`.
* **`RestoCore.UnitTests`:** 33 pruebas unitarias superadas (incluyendo resiliencia de concurrencia con reintentos en cocina).
* **`RestoCore.IntegrationTests`:** 11 pruebas de integración con `CustomWebApplicationFactory` y `ContainerizedStackFixture` superadas.
* **`RestoCore.SecurityTests`:** 1 prueba de aislamiento multi-tenant en base de datos superada.

---

## 3. Endpoints Implementados
* `POST /api/v1/auth/login`: Autenticación de credenciales y generación de token JWT firmado.
* `GET /api/v1/auth/me`: Perfil y roles del usuario autenticado en sesión (`BearerAuth`).
* `GET /api/v1/tenants/{tenant_slug}/menu`: Consulta anónima de la carta digital pública con soporte para `If-None-Match` / `ETag` (HTTP 304 Not Modified), `Cache-Control` y objeto de lienzo `layout_config`.
* `GET /r/{tenant_slug}`: Enlace corto de redirección para códigos QR físicos.
* `PUT /api/v1/admin/menu/layout`: Guardado de configuración geométrica de lienzo Canvas en JSONB (`TenantAdminOnly`).
* `POST /api/v1/admin/menu/publish`: Desencadenamiento del pipeline AOT y purgado CDN con retorno HTTP 202 Accepted (`TenantAdminOnly`).
* `POST /api/v1/storage/presigned-upload`: Generación de URLs pre-firmadas temporales para subida de fotos a SeaweedFS (`TenantAdminOnly`).
* `GET /api/v1/admin/categories`: Listado ordenado de categorías del restaurante (`TenantAdminOnly`).
* `GET /api/v1/admin/categories/{id}`: Consulta detallada de una categoría de menú (`TenantAdminOnly`).
* `POST /api/v1/admin/categories`: Alta de categorías (requiere rol `TenantAdminOnly`).
* `PUT /api/v1/admin/categories/{id}`: Modificación completa de una categoría existente (`TenantAdminOnly`).
* `PATCH /api/v1/admin/categories/{id}`: Modificación parcial de atributos de la categoría (`TenantAdminOnly`).
* `DELETE /api/v1/admin/categories/{id}`: Baja de categoría con bloqueo relacional si tiene platos asociados (`TenantAdminOnly`).
* `GET /api/v1/admin/tenant/profile`: Consulta de perfil comercial e información de contacto (nombre, teléfono, dirección, horarios) (`TenantAdminOnly`).
* `PUT /api/v1/admin/tenant/profile`: Modificación completa del perfil comercial y contacto con invalidación CDN (`TenantAdminOnly`).
* `PATCH /api/v1/admin/tenant/profile`: Modificación parcial de datos comerciales o contacto (`TenantAdminOnly`).
* `POST /api/v1/admin/items`: Creación de platos asociados a una categoría única a grandes rasgos (`1:N` vía `category_id`), validando existencia y persistiendo etiquetas dietéticas multifacéticas N:M (`DietaryLabels`: vegano, sin TACC, bebidas con/sin alcohol).
* `PUT /api/v1/admin/items/{id}`: Modificación completa de atributos del plato (precio, categoría, descripción, modificadores y etiquetas dietéticas) con invalidación CDN (`TenantAdminOnly`).
* `PATCH /api/v1/admin/items/{id}`: Modificación parcial de propiedades del plato con reintento concurrente (`TenantAdminOnly`).
* `DELETE /api/v1/admin/items/{id}`: Baja suave de plato (`is_deleted = true`, `deleted_at = UtcNow`) con retención de 7 días, validación de órdenes activas y mensaje amigable (`TenantAdminOnly`).
* `POST /api/v1/admin/items/{id}/restore`: Restauración de plato archivado dentro de la ventana de 7 días (`TenantAdminOnly`).
* `Worker PurgeArchivedDishesWorker`: Tarea programada en segundo plano para purga física definitiva de registros con `deleted_at <= NOW() - INTERVAL '7 days'` y eliminación de imágenes en SeaweedFS.
* `POST /api/v1/admin/items/{id}/modifiers`: Asignación de grupos de modificadores.
* `PUT /api/v1/admin/branding`: Configuración de identidad visual del restaurante.
* `GET /api/v1/admin/tables/{id}/qr`: Generación y descarga de códigos QR para mesas (SVG/PNG).
* `PATCH /api/v1/kitchen/items/{id}/availability`: Alternancia de disponibilidad de productos para cocina con reintento concurrente (`KitchenOnly`).
* `POST /api/v1/admin/tenants`: Aprovisionamiento de nuevas cuentas gastronómicas (`SuperAdminOnly`).
* `POST /api/v1/analytics/collect`: Ingesta anónima de eventos analíticos sin impacto en latencia LCP.
* `GET /api/v1/admin/analytics/dashboard`: Métricas de Nivel 1 (Ingeniería de Menú) y Nivel 2 (distribución horaria/dispositivos).
* `GET /healthz` & `GET /ready`: Monitoreo de disponibilidad del proceso y conexión concurrente con PostgreSQL, Redis, SeaweedFS y OPA.

