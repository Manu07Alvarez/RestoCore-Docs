# Especificación Técnica del Backend (.NET 10) - RestoCore

Este documento reúne la especificación técnica, arquitectura, interfaces, infraestructura y estado de implementación del servicio de backend (`resto-core-back`).

---

## 1. Stack Tecnológico y Principios de Diseño
* **Runtime & Lenguaje:** .NET 10 / C# 13.
* **Paradigma de Arquitectura:** Clean Architecture con desacoplamiento en capas (Domain, Application, Infrastructure, Api).
* **Patrón de Casos de Uso:** Mediador permisivo zero-dependency (`RestoCore.Application/Common/Mediator`) para CQRS de alto rendimiento.
* **Patrón Repositorio & Unit of Work:** Segregación de interfaces de persistencia por Bounded Contexts (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`, `IUserRepository`, `IOrderRepository`) y delimitación transaccional atómica con `IUnitOfWork`.
* **Resiliencia ante Concurrencia Optimista:** Reintentos automáticos con retroceso exponencial (*exponential backoff*) y fluctuación aleatoria (*jitter*) ante colisiones `DbUpdateConcurrencyException` en operaciones críticas (ej. alternancia de disponibilidad en cocina).
* **Persistencia:** Entity Framework Core con Npgsql sobre PostgreSQL 16+.
* **Esquemas Híbridos:** Almacenamiento semiestructurado mediante columnas `JSONB` e índices `GIN` para etiquetas dietarias, configuraciones de branding y maquetación de lienzo Canvas (`ADR-0003`, `ADR-0008`).
* **Aislamiento Multi-Tenant:** Filtros globales de consulta en EF Core (`ITenantScopedEntity`) y Middleware de resolución en ASP.NET Core (`TenantResolutionMiddleware`).
* **Autenticación e Identidad:** Autenticación contra base de datos PostgreSQL (`User` entity y `LoginCommandHandler`) con hashing criptográfico PBKDF2-HMAC-SHA256 (`IPasswordHasher`, 100.000 iteraciones, comparación en tiempo constante) y emisión de tokens JWT Bearer (`AuthEndpoints`) con claims de identidad (`sub`), contexto de establecimiento (`tenant_id`, `tenant_slug`) y roles (`owner`, `tenant_admin`, `kitchen_staff`, `cook`, `super_admin`).
* **Configuración CORS Estricta:** Restricción de orígenes cruzados vía `CORS_ALLOWED_ORIGINS` con soporte de credenciales y exposición explícita de cabecera `ETag`.
* **Almacenamiento Desacoplado:** SeaweedFS (S3-compatible) mediante URLs pre-firmadas temporales (`ADR-0004`).
* **Seguridad Declarativa:** Validación de reglas desacoplada mediante integración HTTP con Open Policy Agent (OPA) (`ADR-0006`).
* **Generación de QR:** Exportación nativa vectorial (SVG) y rasterizada (PNG) mediante QRCoder.
* **Observabilidad y Telemetría:** OpenTelemetry instrumentado con propagación de contexto W3C, enriquecimiento con `tenant.id`, logging de ejecución HTTP estructurado y visualización OTLP en .NET Aspire Dashboard (`ADR-0005`, `ADR-0006`).
* **Documentación Interactiva:** Swagger UI habilitado en ambiente de desarrollo.

---

## 2. Proyectos del Ecosistema Backend
* **`RestoCore.Domain`:** Entidades (`Tenant`, `User`, `Category`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Table`, `Order`, `OrderItem`, `MenuPublishJob`), Value Objects (`BrandingConfig`, `LayoutConfig`, `CanvasElement`, `OrderItemModifier`), contratos e interfaces de alcance tenant.
* **`RestoCore.Application`:** Handlers CQRS totalmente desacoplados de `IApplicationDbContext` que interactúan exclusivamente con repositorios e `IUnitOfWork`. Interfaces de seguridad (`IPasswordHasher`), DTOs de respuesta y validadores FluentValidation organizados por features (`Auth`, `Categories`, `MenuItems`, `Kitchen`, `MenuLayout`, `Orders`, `PublicMenu`, `QrCodes`, `Storage`, `Tenants`).
* **`RestoCore.Infrastructure`:** `ApplicationDbContext`, mapeos de EF Core, repositorios concretos (`CatalogRepository`, `KitchenRepository`, `MenuLayoutRepository`, `TenantRepository`, `UserRepository`, `OrderRepository`), `UnitOfWork` transaccional con manejo de concurrencia, servicio criptográfico `PasswordHasher` (PBKDF2-HMAC-SHA256), semillero bajo demanda `DatabaseSeeder`, servicio AOT `MenuCompilationService`, purgado CDN `LocalDevelopmentCdnPurgeService`, middleware multi-tenant, cliente OPA, servicio QR, servicio de almacenamiento SeaweedFS y extensiones OTel.
* **`RestoCore.Api`:** Mapeo modular de Minimal APIs (`AuthEndpoints`, `PublicMenuEndpoints`, `PublicOrderEndpoints`, `AdminMenuLayoutEndpoints`, `AdminCatalogEndpoints`, `AdminTableEndpoints`, `AdminTenantEndpoints`, `KitchenEndpoints`, `StorageEndpoints`, `HealthEndpoints`), soporte de ejecución CLI para semillado (`--seed`), middleware de logging estructurado y `GlobalExceptionHandler`.
* **`RestoCore.UnitTests`:** 61+ pruebas unitarias superadas (incluyendo autenticación con `LoginCommandHandlerTests`, `PasswordHasherTests` y resiliencia de concurrencia en cocina).
* **`RestoCore.IntegrationTests`:** 11 pruebas de integración con `CustomWebApplicationFactory` y `ContainerizedStackFixture` superadas.
* **`RestoCore.SecurityTests`:** 1 prueba de aislamiento multi-tenant en base de datos superada.

---

## 3. Endpoints Implementados
* `POST /api/v1/auth/login`: Autenticación de credenciales contra la tabla `users` en PostgreSQL (`LoginCommand` + `IPasswordHasher`) y generación de token JWT firmado.
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
* GET /api/v1/admin/permissions: Consulta de catálogo maestro de privilegios atómicos (TenantAdminOnly).
* GET /api/v1/admin/roles: Listado de roles del restaurante y privilegios (TenantAdminOnly).
* POST /api/v1/admin/roles: Creación de roles personalizados con privilegios dinámicos a medida (OwnerOnly).
* GET /api/v1/admin/roles/{id}: Detalle de rol y privilegios (TenantAdminOnly).
* PUT /api/v1/admin/roles/{id}: Modificación completa de rol y privilegios (OwnerOnly).
* PATCH /api/v1/admin/roles/{id}: Modificación parcial de rol (OwnerOnly).
* DELETE /api/v1/admin/roles/{id}: Eliminación de rol personalizado con validación de colaboradores asociados (OwnerOnly).
* GET /api/v1/admin/staff/{user_id}/roles: Consulta de roles ostentados por un colaborador (TenantAdminOnly).
* PUT /api/v1/admin/staff/{user_id}/roles: Asignación o revocación de roles a miembros del personal (OwnerOnly).
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

---

## 4. Entorno de Desarrollo, Datos Iniciales y Semillado Bajo Demanda (`DatabaseSeeder`)

### 4.1. Ejecución del Semillero Bajo Demanda (`--seed` y `scripts/seed-db.ps1`)
* Al levantar los contenedores (`docker compose -f docker-compose.dev.yml up -d`) o iniciar la API normalmente, el sistema **no** inserta datos de muestra de forma automática.
* El aprovisionamiento de datos de desarrollo se ejecuta **bajo demanda** mediante el argumento CLI `--seed` en `Program.cs` (`DatabaseSeeder.SeedAsync`) o invocando el script de PowerShell `./scripts/seed-db.ps1` (con soporte de `-ForceMigrate` para aplicar migraciones previas).
* La rutina es **100% idempotente**: verifica la existencia previa de cada registro antes de insertarlo o actualizarlo.

### 4.2. Cuentas de Desarrollo Semilladas en PostgreSQL (Tabla `users`)
`DatabaseSeeder` aprovisiona el establecimiento de muestra **El Gato Negro** (`Id = 11111111-1111-1111-1111-111111111111`, `Slug = el-gato-negro`) junto con 4 usuarios en la tabla `users` (contraseñas hasheadas con PBKDF2-HMAC-SHA256):

| Perfil de Acceso | Correo Electrónico | Contraseña en Texto Plano | Nombre (`Name`) | Rol Principal (`PrimaryRole`) | Arreglo de Roles (`Roles`) | Tenant Asociado (`TenantId`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dueño / Administrador Principal** | `admin@bistrogourmet.com` | `admin123` | `Chef Marco` | `owner` | `owner`, `tenant_admin`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` (`el-gato-negro`) |
| **Administrador Local Alternativo** | `admin@restocore.com` | `admin123` | `Administrador Local` | `owner` | `owner`, `tenant_admin`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` (`el-gato-negro`) |
| **Personal de Cocina (KDS)** | `cocina@restocore.com` | `cocina123` | `Cocinero Pablo` | `cook` | `cook`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` (`el-gato-negro`) |
| **SuperAdmin de Plataforma** | `superadmin@restocore.com` | `admin123` | `Super Administrador` | `super_admin` | `super_admin` | `null` (alcance global SaaS) |

* **Firma JWT:** Algoritmo HMAC SHA256 con clave simétrica `RestoCoreSuperSecretDevelopmentKey2026!#*`, Issuer `RestoCore`, Audience `RestoCore`, expiración de 7 días.
* **Catálogo y Mesas Semilladas para `El Gato Negro`:**
  * **3 Categorías:** `Entradas y Tapas` (orden 1), `Platos Principales` (orden 2) y `Postres y Cafetería` (orden 3).
  * **5 Platos:** *Empanadas Salteñas Cortadas a Cuchillo* (\$4.500), *Provoleta Ahumada con Tomates Confitados* (\$8.900), *Ojo de Bife Madurado 400g* (\$22.500, con grupo obligatorio `Punto de Cocción`), *Sorrentinos de Calabaza Asada y Parmesano* (\$14.800) y *Flan Casero Mixto de Campo* (\$6.200).
  * **5 Mesas QR:** Mesas `1` a `5` con tokens `mesa-1-el-gato-negro` a `mesa-5-el-gato-negro`.

### 4.3. Infraestructura Local Contenedorizada (`docker-compose.dev.yml`)
* **PostgreSQL 16:** Puerto `5432` (`restocore_dev`, usuario `postgres`, contraseña `postgres_dev_password`).
* **Redis 7:** Puerto `6379` (caché de menú distribuida e invalidación de versiones).
* **SeaweedFS S3:** Gateway en puerto `8333`, Filer en `8888`, Master en `9333` (claves `any_key` / `any_secret`).
* **Bucket de Imágenes:** Contenedor efímero `create-bucket` auto-aprovisiona el bucket `restocore-images`.
* **Open Policy Agent (OPA):** Puerto `8181` con montaje de `./specs/policies` en `/policies:ro`.
* **.NET Aspire Dashboard:** Puerto Web UI `18888`, puerto OTLP gRPC `4317`.
* **Streamlit Unified Admin:** Puerto Web UI `8501` para administración y consulta directa de PostgreSQL, Redis y SeaweedFS.



