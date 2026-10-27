# Arquitectura y Especificación del Backend (.NET 10)

Este documento detalla la arquitectura de software, componentes modulares, modelo de datos, suite de pruebas y estado de desarrollo del repositorio de backend de la plataforma: **`resto-core-back`**.

---

## 1. Visión General y Stack Tecnológico

El backend de RestoCore es un servicio modular diseñado bajo los principios de **Clean Architecture** (Arquitectura Limpia) y el patrón **CQRS** (Command Query Responsibility Segregation). Proporciona la lógica de negocio, persistencia relacional con capacidades semiestructuradas, resolución multi-tenant, contratos REST, almacenamiento de objetos desacoplado y telemetría en tiempo real.

### Stack Tecnológico Base
* **Lenguaje y Runtime:** C# 13 sobre .NET 10 SDK.
* **Framework Web:** ASP.NET Core Minimal APIs con mapeo modular de endpoints.
* **Patrón de Casos de Uso:** Mediador CQRS permisivo de cero dependencias (*Zero-Dependency Mediator* en `RestoCore.Application/Common/Mediator`), desacoplado de bibliotecas externas para maximizar rendimiento y velocidad de resolución.
* **Patrón Repositorio y Unidad de Trabajo (Unit of Work):** Persistencia encapsulada mediante interfaces segregadas por Bounded Contexts (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`, `IOrderRepository`, `IUserRepository`) y delimitación atómica de transacciones con `IUnitOfWork`.
* **Resiliencia ante Concurrencia Optimista:** Manejo explícito de colisiones transaccionales (`DbUpdateConcurrencyException`) mediante reintentos con retroceso exponencial (*exponential backoff*) y fluctuación aleatoria (*jitter*) en operaciones operativas de cocina.
* **Validación:** FluentValidation integrado en la canalización de comandos de aplicación.
* **Capa de Persistencia:** Entity Framework Core con el proveedor `Npgsql.EntityFrameworkCore.PostgreSQL`.
* **Motor de Base de Datos:** PostgreSQL 16+ con particionamiento lógico multi-tenant, columnas `JSONB` e índices `GIN` (`ADR-0003`).
* **Autenticación e Identidad Persistida:** Autenticación respaldada en PostgreSQL mediante la entidad `User` (tabla `users`), hashing criptográfico de contraseñas con **PBKDF2-HMAC-SHA256** (`IPasswordHasher`, 100.000 iteraciones, salt aleatorio de 16 bytes y comparación en tiempo constante `CryptographicOperations.FixedTimeEquals`) y emisión de tokens JWT Bearer (`AuthEndpoints` / `LoginCommand`) con claims de usuario (`sub`), contexto del restaurante (`tenant_id`, `tenant_slug`) y roles (`owner`, `tenant_admin`, `kitchen_staff`, `cook`, `super_admin`).
* **Semillero de Base de Datos Bajo Demanda (On-Demand Seeding):** Utilitario idempotente `DatabaseSeeder` ejecutable exclusivamente por línea de comandos (`--seed` o `./scripts/seed-db.ps1`) sin contaminar el arranque web ni mantener credenciales cableadas en código.
* **Seguridad y Autorización:** Autorización declarativa evaluada contra Open Policy Agent (OPA / Rego) (`ADR-0006`).
* **Control de Acceso de Origen Cruzado (CORS):** Política estricta basada en orígenes configurables (`CORS_ALLOWED_ORIGINS`), con soporte de credenciales y exposición de la cabecera `ETag`.
* **Almacenamiento Desacoplado de Objetos:** SeaweedFS (S3-compatible) mediante generación de URLs pre-firmadas temporales (`ADR-0004`).
* **Generación de Códigos QR:** Servicio nativo con exportación vectorial SVG y binaria PNG mediante QRCoder.
* **Observabilidad y Telemetría:** OpenTelemetry instrumentado para trazado distribuido (W3C Trace Context), métricas, logging de ejecución HTTP estructurado y logs OTLP con visualización en tiempo real vía **.NET Aspire Dashboard** (`ADR-0005`, `ADR-0006`).
* **Documentación Interactiva:** Swagger UI / OpenAPI 3.1 integrado para desarrollo local.
* **Validación de Carga y Rendimiento:** Suite automatizada de pruebas de estrés con **k6**.

---

## 2. Estructura de Capas del Sistema (`src/`)

El código fuente se desacopla en cuatro proyectos con dependencias unidireccionales hacia el núcleo de dominio:

```mermaid
graph TD
    API[RestoCore.Api - Minimal APIs & Middlewares] --> APP[RestoCore.Application - Casos de Uso CQRS]
    INFRA[RestoCore.Infrastructure - Persistencia, Identity, OPA, SeaweedFS, QR, OTel] --> APP
    APP --> DOM[RestoCore.Domain - Entidades y Value Objects]
    INFRA --> DOM
    API --> INFRA
```

### 2.1. `RestoCore.Domain` (Capa de Dominio)
Contiene las entidades del negocio, invariantes y reglas de dominio puras sin dependencias externas:
* **`Tenant`:** Representa un establecimiento gastronómico. Contiene nombre, slug único, estado activo, datos de contacto comercial (`PhoneNumber`, `Address`, `BusinessHours`), el Value Object `BrandingConfig` y la propiedad `LayoutConfig?` para la configuración de maquetación visual libre.
* **`User`:** Representa una identidad de usuario autenticada en la plataforma (`BaseEntity`). Contiene correo electrónico único (`Email`), nombre completo (`Name`), hash criptográfico de contraseña (`PasswordHash`), rol principal (`PrimaryRole`), arreglo de roles asignados (`Roles: string[]`), asociación opcional a un restaurante (`TenantId: Guid?`, nulo para administradores globales de plataforma) e indicador de estado activo (`IsActive: bool`).
* **`LayoutConfig` (Value Object):** Estructura inmutable persistida como `JSONB` que almacena el estado del lienzo (`IsEnabled`), URL de imagen de fondo (`BackgroundUrl`), color hexadecimal de fondo (`BackgroundColor`) y la lista de elementos gráficos (`Elements`).
* **`CanvasElement` (Value Object):** Representa la posición geométrica y capa de un plato o elemento en el lienzo: identificador de plato (`ItemId`), coordenadas relativas (`PosX`, `PosY` entre 0 y 100), dimensiones relativas (`Width`, `Height`), índice de profundidad (`ZIndex`) y estilos adicionales (`CustomStyles`).
* **`MenuPublishJob`:** Entidad de dominio (`ITenantScopedEntity`) que registra y audita las ejecuciones del pipeline asíncrono de compilación Ahead-Of-Time (AOT): identificador único (`Id`), tenant asociado (`TenantId`), estado del trabajo (`Status`: Queued, Processing, Completed, Failed), hash criptográfico generado (`VersionHash`), cantidad de activos procesados (`AssetsProcessed`), duración total en milisegundos (`DurationMs`), mensaje de error (`ErrorMessage`), fecha de inicio (`CreatedAtUtc`) y fecha de finalización (`CompletedAtUtc`).
* **`Category`:** Clasificador macro de productos en la carta como definición a grandes rasgos (`ITenantScopedEntity`). Soporta ordenamiento posicional (`DisplayOrder`), descripción, control de visibilidad (`IsActive`) y relación 1:N como entidad principal de una colección de platos (`ICollection<MenuItem> MenuItems`).
* **`MenuItem`:** Plato o producto comercializable (`ITenantScopedEntity`). Pertenece obligatoriamente a una única categoría a grandes rasgos (`CategoryId: Guid`, asociación 1:N). Almacena nombre, descripción, precio base (`BasePrice`), imagen, estado de disponibilidad (`IsAvailable`), orden posicional (`DisplayOrder`), alérgenos (`Allergens: string[]`) y etiquetas dietéticas multifacéticas asociadas bajo relación N:M (`DietaryLabels: string[]` indexadas con GIN, soportando alimentos veganos y sin TACC concurrentes, y bebidas con o sin alcohol). Implementa banderas de ciclo de vida para baja suave (`IsDeleted: bool = false`, `DeletedAt: DateTimeOffset? = null`) con periodo de retención de 7 días (`ADR-0010`).
* **`Order` & `OrderItem`:** Entidades de comanda gastronómica y líneas de pedido histórico. `OrderItem` está desacoplada de mutaciones de catálogo mediante clave foránea nulable (`MenuItemId: Guid?` con regla `ON DELETE SET NULL`) y snapshots inmutables: `ItemNameSnapshot: string`, `UnitPriceSnapshot: decimal` y `SelectedModifiers: string` (`ADR-0010`).
* **`ModifierGroup` & `ModifierOption`:** Agrupadores de adicionales y modificaciones con reglas de selección mínima y máxima (`MinSelection`, `MaxSelection`) y deltas de precio (`PriceDelta`).
* **`Table`:** Identificador de mesa física en el salón. Contiene número de mesa, token de seguridad (`Token`) y estado activo.
* **`ITenantScopedEntity`:** Interfaz contractual que garantiza que toda entidad de negocio contenga un `TenantId: Guid` para el particionamiento multi-tenant obligatorio.

### 2.2. `RestoCore.Application` (Capa de Aplicación)
Implementa los casos de uso del sistema organizados por características funcionales (*Feature Folders*):
* **Mediador Permisivo Zero-Dependency (`Common/Mediator`):** Implementación nativa de `IMediator`, `IRequest<TResponse>`, `IRequestHandler<TRequest, TResponse>` y `ISender`, eliminando la sobrecarga de dependencias de terceros.
* **Desacoplamiento Estricto de Persistencia:** Todos los handlers CQRS en la capa de Aplicación han sido desacoplados de `IApplicationDbContext`. La interacción con la base de datos se realiza exclusivamente a través de interfaces de repositorios segregadas (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`, `IOrderRepository`, `IUserRepository`), el servicio `IPasswordHasher` y la delimitación transaccional con `IUnitOfWork`.
* **`Features/Auth`:**
  * **`LoginCommand` & `LoginCommandHandler`:** Valida las credenciales de acceso consultando `IUserRepository.GetUserByEmailWithTenantAsync`, verifica que la cuenta se encuentre activa (`IsActive`) y comprueba criptográficamente el hash PBKDF2 mediante `IPasswordHasher.VerifyPassword`. Si la validación falla, lanza `UnauthorizedAccessException` (traducido a `HTTP 401 Unauthorized`).
* **`Features/PublicMenu`:** Consulta optimizada de la carta digital mediante `GetPublicMenuQuery`. Implementa:
  * **Depuración Automática de Platos Huérfanos (*Orphan Dish Pruning*):** Si un plato posicionado en el lienzo es eliminado del catálogo o marcado como no disponible en cocina, el query omite dicho elemento del árbol geométrico sin corromper el renderizado del lienzo.
  * **Exclusión Estricta de Baja Suave:** Omisión automática de todo ítem con `IsDeleted == true` o `DeletedAt != null`.
  * **Caché y Validación Condicional:** Cabecera HTTP `Cache-Control: public, max-age=3600, s-maxage=86400` y evaluación de `If-None-Match` retornando HTTP 304 Not Modified ante coincidencia de ETag.
* **`Features/MenuLayout`:** Casos de uso de maquetación y compilación de lienzo:
  * **`UpdateMenuLayoutCommand`:** Persiste o deshabilita la disposición geométrica del lienzo libre en la columna `JSONB` del Tenant. Incluye validación exhaustiva con FluentValidation (`UpdateMenuLayoutValidator`) para verificar que las coordenadas y dimensiones relativas se ubiquen en el rango porcentual válido (0 a 100). Sincroniza la invalidación de la clave de caché del menú en Redis.
  * **`PublishMenuCommand`:** Registra un `MenuPublishJob`, inicia el pipeline asíncrono de compilación AOT mediante `IMenuCompilationService`, desencadena la invalidación perimetral a través de `ICdnPurgeService` y retorna HTTP 202 Accepted.
* **`Features/Storage`:** Comando `GeneratePresignedUploadCommand` para la emisión de URLs pre-firmadas hacia SeaweedFS, con validación de extensiones permitidas (`.jpg`, `.jpeg`, `.png`, `.webp`) y límite de tamaño de 5 MB.
* **`Features/Categories`:** Comandos y consultas para ABMC completo de categorías (`CreateCategoryCommand`, `UpdateCategoryCommand`, `PatchCategoryCommand`, `DeleteCategoryCommand`, `GetCategoriesQuery`, `GetCategoryByIdQuery`) con bloqueo relacional (`HTTP 409 Conflict`) si existen platos asociados.
* **`Features/MenuItems`:** Casos de uso de gestión del catálogo de platos:
  * `CreateMenuItemCommand`: Alta de plato con asociación obligatoria a categoría 1:N (`CategoryId`), validación de existencia y preservación de `DietaryLabels` y `Allergens`.
  * `UpdateMenuItemCommand`: Modificación total de los datos del plato (`PUT /api/v1/admin/items/{id}`), validación de pertenencia categórica e invalidación de caché CDN.
  * `PatchMenuItemCommand`: Modificación parcial de campos (`PATCH /api/v1/admin/items/{id}`) con concurrencia optimista.
  * `SoftDeleteMenuItemCommand`: Baja suave (`is_deleted = true`, `deleted_at = UtcNow`) tras verificar ausencia de pedidos activos en cocina, retornando confirmación no técnica amigable y ventana de retención de 7 días (`ADR-0010`).
  * `RestoreMenuItemCommand`: Reactivación del plato si la solicitud se produce dentro del periodo de retención de 7 días.
* **`Features/Kitchen`:** Comandos operativos inmediatos como la alternancia de disponibilidad de stock (`ToggleItemAvailabilityCommand`), delegando en `IKitchenRepository` para reintentos transparentes ante colisiones concurrentes.
* **`Features/Orders`:** Comando `SubmitOrderCommand` para ingesta asíncrona de comandas con encolamiento FIFO en Redis Streams.
* **`Features/QrCodes`:** Consulta y renderizado dinámico de códigos QR para mesas físicas (`GetTableQrQuery`).
* **`Features/Tenants`:** Aprovisionamiento de nuevas cuentas (`ProvisionTenantCommand`), gestión de perfil comercial y contacto (`GetTenantProfileQuery`, `UpdateTenantProfileCommand`, `PatchTenantProfileCommand`) y personalización de marca (`UpdateBrandingCommand`).

### 2.3. `RestoCore.Infrastructure` (Capa de Infraestructura)
Provee la implementación concreta de servicios externos, criptografía y persistencia:
* **Persistencia (`ApplicationDbContext`):**
  * Global Query Filters a nivel modelo (`builder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantContext.CurrentTenantId)`), blindando el aislamiento multi-tenant y filtrando automáticamente platos en baja suave (`!e.IsDeleted`).
  * Mapeo de `User` en `UserConfiguration` (tabla `users`, índice único `IX_users_Email`, columna `Roles` como `text[]` en PostgreSQL y clave foránea opcional a `tenants`).
  * Mapeo de `LayoutConfig` como columna `JSONB` en `TenantConfiguration`.
  * Configuración `MenuPublishJobConfiguration` con índices compuestos por `TenantId` y `Status`.
  * **Invalidación de Caché Post-Commit:** Detección de mutaciones en entidades del menú durante `SaveChangesAsync()` e invalidación atómica de la caché en memoria y Redis una vez confirmada la transacción en PostgreSQL.
* **Criptografía e Identidad (`Identity/PasswordHasher.cs`):**
  * Implementa `IPasswordHasher` utilizando **PBKDF2-HMAC-SHA256** (`Rfc2898DeriveBytes.Pbkdf2`) con 100.000 iteraciones, salt criptográfico de 16 bytes (`RandomNumberGenerator.GetBytes`), clave derivada de 32 bytes, formato versionado `v1$100000$<salt_base64>$<hash_base64>` y validación inmune a ataques de temporización (`CryptographicOperations.FixedTimeEquals`).
* **Semillero Bajo Demanda (`Persistence/Seed/DatabaseSeeder.cs`):**
  * Asegura la compatibilidad del esquema relacional (`EnsureCreatedAsync` y sentencias DDL idempotentes `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS users`) y siembra de forma idempotente el tenant base, cuentas de usuario con hashes PBKDF2, categorías, platos con modificadores y mesas QR.
* **Patrón Repositorio y Unit of Work (`Persistence/Repositories/` & `UnitOfWork.cs`):**
  * `UserRepository`: Consulta de usuarios por correo electrónico (`GetUserByEmailWithTenantAsync` con `IgnoreQueryFilters()` e `Include(u => u.Tenant)`) y alta de usuarios.
  * `CatalogRepository`: Operaciones sobre categorías, platos, verificación de platos asociados a categoría, grupos de modificadores y consulta del catálogo completo de tenant.
  * `KitchenRepository`: Implementa `UpdateItemAvailabilityWithRetryAsync` con manejo de `DbUpdateConcurrencyException`, separación de ChangeTracker (`EntityState.Detached`) y retroceso exponencial con fluctuación aleatoria (*jitter*).
  * `MenuLayoutRepository`: Gestión de configuración geométrica de lienzo y ciclo de vida de `MenuPublishJob`.
  * `TenantRepository`: Resolución, verificación de unicidad de slugs, actualización de perfil de restaurante y gestión de mesas físicas con tokens de seguridad.
  * `OrderRepository`: Persistencia de órdenes y verificación de pedidos activos en cocina.
  * `UnitOfWork`: Implementa `IUnitOfWork` administrando transacciones atómicas con soporte de liberación síncrona y asíncrona (`IDisposable` / `IAsyncDisposable`).
* **Workers en Segundo Plano (`BackgroundServices/` & `Workers/`):**
  * `OrderProcessorWorker`: Consumidor de cola FIFO sobre Redis Streams para procesamiento de comandas y notificación WebSocket a cocina (`ADR-0007`).
  * `PurgeArchivedDishesWorker`: Tarea programada que purga físicamente platos con más de 7 días en baja suave y elimina activos asociados en SeaweedFS (`ADR-0010`).
* **Servicio de Compilación AOT (`MenuCompilationService`):** Implementa `IMenuCompilationService` para el preprocesamiento estático del menú, aplanamiento de capas geométricas y cálculo de tiempo de ejecución con SLA inferior a 3 segundos.
* **Servicio de Purgado Perimetral CDN (`LocalDevelopmentCdnPurgeService`):** Implementa `ICdnPurgeService` emitiendo órdenes de invalidación perimetral por tag de tenant. Instrumentado con telemetría OpenTelemetry para registrar fallos con `error.code="CDN_PURGE_FAILURE"`.
* **Almacenamiento Desacoplado (`SeaweedStorageService`):** Implementa `IStorageService` interactuando con la API S3 de SeaweedFS para emitir URLs de subida pre-firmadas temporales.
* **Middleware Multi-Tenant (`TenantResolutionMiddleware`):** Resuelve el `TenantId` activo evaluando jerárquicamente parámetros de ruta, cabecera `X-Tenant-ID`, query param y claims JWT.
* **Cliente OPA (`OpaClient` & `OpaAuthorizationHandler`):** Transmite el contexto de la solicitud al motor Open Policy Agent y deniega el acceso ante fallos de evaluación.
* **Servicio QR (`QrCodeService`):** Generador de matrices QR vectoriales (SVG) y binarias (PNG).
* **Telemetría (`OpenTelemetryExtensions`):** Exportación OTLP hacia el .NET Aspire Dashboard y colectores estándar, enriqueciendo trazas con `tenant.id`.

### 2.4. `RestoCore.Api` (Capa de Presentación y Enrutamiento)
Punto de entrada HTTP estructurado mediante Minimal APIs:
* **Mapeo Modular de Rutas:** Agrupación semántica (`AuthEndpoints`, `PublicMenuEndpoints`, `AdminMenuLayoutEndpoints`, `AdminCatalogEndpoints`, `AdminProfileEndpoints`, `AdminTableEndpoints`, `AdminTenantEndpoints`, `KitchenEndpoints`, `OrderEndpoints`, `StorageEndpoints`, `HealthEndpoints`).
* **Autenticación e Identidad JWT (`AuthEndpoints`):** Expone `POST /api/v1/auth/login` (delegando la validación contra PostgreSQL en `LoginCommand` a través de `ISender`) y `GET /api/v1/auth/me`. Emisión de tokens firmados HMAC-SHA256 con claims estructurados (`sub`, `tenant_id`, `tenant_slug`, `role`).
* **Modo CLI de Semillado (`--seed`):** `Program.cs` detecta el argumento `--seed`, omite el registro de servicios de segundo plano (Redis Streams, WebSockets, Workers), ejecuta `DatabaseSeeder.SeedAsync(app.Services)` y termina limpiamente.
* **Middleware de Registro Estructurado:** Captura el método HTTP, ruta, `TenantSlug`, `TenantId`, código de respuesta y duración en milisegundos correlacionado con el contexto W3C Trace de OpenTelemetry.
* **Soporte de Caché Condicional y Distribución Perimetral:** Implementación de cabeceras HTTP `ETag` y `Cache-Control: public, max-age=3600, s-maxage=86400` con retorno HTTP 304 Not Modified ante coincidencias de `If-None-Match`.
* **Manejo Centralizado de Excepciones:** `GlobalExceptionHandler` intercepta fallos y genera respuestas estándar RFC 7807 (Problem Details) con trazabilidad `traceId`.
* **Verificación de Salud Exhaustiva:** Endpoints `/healthz` (liveness) y `/ready` (readiness con auditoría concurrente de PostgreSQL, Redis, SeaweedFS y OPA).

---

## 3. Catálogo Completo de Endpoints Implementados

| Módulo / Grupo | Método | Ruta | Autorización | Códigos HTTP | Propósito |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **Autenticación** | `POST` | `/api/v1/auth/login` | Público (Anónimo) | 200, 401 | Autenticación contra tabla `users` en PostgreSQL (PBKDF2) y emisión de token JWT firmado. |
| **Identidad** | `GET` | `/api/v1/auth/me` | Requiere Token | 200, 401 | Consulta del perfil, roles y contexto del usuario autenticado en sesión (`BearerAuth`). |
| **Menú Público** | `GET` | `/api/v1/tenants/{tenant_slug}/menu` | Público (Anónimo) | 200, 304, 404 | Obtiene la carta completa omitiendo ítems en baja suave, con datos de contacto, `layout_config`, poda de huérfanos, `ETag` y `Cache-Control`. |
| **Redirección QR**| `GET` | `/r/{tenant_slug}` | Público (Anónimo) | 302 | Enlace corto para códigos QR impresos. |
| **Lienzo Admin** | `PUT` | `/api/v1/admin/menu/layout` | `TenantAdminOnly` | 200, 400, 401, 403, 404 | Guarda o restablece la configuración geométrica de lienzo en JSONB (`ADR-0008`). |
| **Compilación Admin**| `POST`| `/api/v1/admin/menu/publish` | `TenantAdminOnly` | 202, 401, 403, 422, 500 | Desencadena pipeline AOT y purgado perimetral CDN con SLA < 3s (`ADR-0006`). |
| **Almacenamiento** | `POST` | `/api/v1/storage/presigned-upload` | `TenantAdminOnly` | 200, 400, 401, 403 | Genera URL pre-firmada temporal hacia SeaweedFS (`ADR-0004`). |
| **Catálogo Admin** | `GET` | `/api/v1/admin/categories` | `TenantAdminOnly` | 200, 401, 403 | Listado de categorías del restaurante ordenadas por `sort_order`. |
| **Catálogo Admin** | `GET` | `/api/v1/admin/categories/{id}` | `TenantAdminOnly` | 200, 401, 403, 404 | Consulta de detalle de una categoría de menú. |
| **Catálogo Admin** | `POST` | `/api/v1/admin/categories` | `TenantAdminOnly` | 201, 400, 401, 403 | Alta de categorías para el Tenant activo. |
| **Catálogo Admin** | `PUT` | `/api/v1/admin/categories/{id}` | `TenantAdminOnly` | 200, 400, 401, 403, 404 | Modificación total de categoría (nombre, descripción, orden, visibilidad). |
| **Catálogo Admin** | `PATCH` | `/api/v1/admin/categories/{id}` | `TenantAdminOnly` | 200, 400, 401, 403, 404 | Modificación parcial de categoría. |
| **Catálogo Admin** | `DELETE`| `/api/v1/admin/categories/{id}` | `TenantAdminOnly` | 204, 401, 403, 404, 409 | Eliminación de categoría con bloqueo relacional si tiene platos asociados (`ON DELETE RESTRICT`). |
| **Perfil Admin** | `GET` | `/api/v1/admin/tenant/profile` | `TenantAdminOnly` | 200, 401, 403, 404 | Consulta de información comercial y contacto (nombre, teléfono, dirección, horarios). |
| **Perfil Admin** | `PUT` | `/api/v1/admin/tenant/profile` | `TenantAdminOnly` | 200, 400, 401, 403, 404 | Modificación completa del perfil comercial e información de contacto con invalidación CDN. |
| **Perfil Admin** | `PATCH` | `/api/v1/admin/tenant/profile` | `TenantAdminOnly` | 200, 400, 401, 403, 404 | Modificación parcial del perfil o contacto del restaurante. |
| **Roles & Staff** | `GET` | `/api/v1/admin/permissions` | `TenantAdminOnly` | 200, 401, 403 | Catálogo maestro de privilegios del sistema. |
| **Roles & Staff** | `GET` | `/api/v1/admin/roles` | `TenantAdminOnly` | 200, 401, 403 | Listado de roles configurados para el restaurante. |
| **Roles & Staff** | `POST` | `/api/v1/admin/roles` | `OwnerOnly` | 201, 400, 401, 403, 409 | Creación de rol personalizado con privilegios a medida. |
| **Roles & Staff** | `GET` | `/api/v1/admin/roles/{id}` | `TenantAdminOnly` | 200, 401, 403, 404 | Detalle de rol y privilegios asociados. |
| **Roles & Staff** | `PUT` | `/api/v1/admin/roles/{id}` | `OwnerOnly` | 200, 400, 401, 403, 404 | Modificación completa de rol y privilegios. |
| **Roles & Staff** | `PATCH` | `/api/v1/admin/roles/{id}` | `OwnerOnly` | 200, 400, 401, 403, 404 | Modificación parcial de rol. |
| **Roles & Staff** | `DELETE`| `/api/v1/admin/roles/{id}` | `OwnerOnly` | 204, 401, 403, 404, 409 | Eliminación de rol personalizado con bloqueo si tiene personal asignado. |
| **Roles & Staff** | `GET` | `/api/v1/admin/staff/{user_id}/roles` | `TenantAdminOnly` | 200, 401, 403, 404 | Consulta de roles ostentados por un colaborador. |
| **Roles & Staff** | `PUT` | `/api/v1/admin/staff/{user_id}/roles` | `OwnerOnly` | 200, 400, 401, 403, 404 | Asignación y revocación de roles a miembros del personal. |
| **Catálogo Admin** | `POST` | `/api/v1/admin/items` | `TenantAdminOnly` | 201, 400, 401, 403, 422 | Alta de platos asociados unívocamente a una categoría (1:N vía `category_id`), con etiquetas dietéticas (`DietaryLabels`). |
| **Catálogo Admin** | `PUT` | `/api/v1/admin/items/{id}` | `TenantAdminOnly` | 200, 400, 401, 403, 404, 422 | Modificación total del plato con validación relacional e invalidación CDN. |
| **Catálogo Admin** | `PATCH` | `/api/v1/admin/items/{id}` | `TenantAdminOnly` | 200, 400, 401, 403, 404, 422 | Modificación parcial de propiedades individuales del plato. |
| **Catálogo Admin** | `DELETE`| `/api/v1/admin/items/{id}` | `TenantAdminOnly` | 200, 401, 403, 404, 409 | Baja suave (`is_deleted = true`, `deleted_at = UtcNow`) con retención de 7 días, validación de comandas activas y mensaje amigable (`ADR-0010`). |
| **Catálogo Admin** | `POST` | `/api/v1/admin/items/{id}/restore` | `TenantAdminOnly` | 200, 401, 403, 404 | Restauración de plato previamente archivado dentro de la ventana de 7 días (`ADR-0010`). |
| **Catálogo Admin** | `POST` | `/api/v1/admin/items/{id}/modifiers` | `TenantAdminOnly` | 201, 400, 401, 403 | Agregado de modificadores y opciones de precio. |
| **Catálogo Admin** | `PUT` | `/api/v1/admin/branding` | `TenantAdminOnly` | 200, 401, 403 | Actualización de identidad visual y colores. |
| **Pedidos / Comandas**| `POST` | `/api/v1/orders` | Público (Token Mesa)| 202, 400, 404 | Ingesta asíncrona de pedidos hacia cola FIFO en Redis Streams y despacho WebSocket (`ADR-0007`). |
| **Mesas & QR** | `GET` | `/api/v1/admin/tables/{id}/qr` | `TenantAdminOnly` | 200, 401, 403, 404 | Descarga de QR vectorial (SVG/PNG) para contexto de comanda (`ADR-0012`). |
| **Cocina (KDS)** | `PATCH` | `/api/v1/kitchen/items/{id}/availability` | `KitchenOnly` | 200, 401, 403, 404 | Cambio inmediato de disponibilidad de stock con reintento concurrente. |
| **SuperAdmin** | `POST` | `/api/v1/admin/tenants` | `SuperAdminOnly` | 201, 400, 401, 403, 409 | Aprovisionamiento de nuevos restaurantes. |
| **Salud** | `GET` | `/healthz` | Público (Anónimo) | 200 | Estado de vida del proceso del servidor. |
| **Salud** | `GET` | `/ready` | Público (Anónimo) | 200, 503 | Estado de conectividad de PostgreSQL, Redis, SeaweedFS y OPA. |

---

## 4. Infraestructura Local y Observabilidad (`docker-compose.dev.yml`)

El entorno de desarrollo local orquesta todos los servicios requeridos de manera hermética:
* **PostgreSQL 16 Alpine:** Base de datos relacional multi-tenant (puerto `5432`).
* **Redis 7 Alpine:** Motor de caché y mensajería Redis Streams (puerto `6379`).
* **SeaweedFS:** Almacenamiento de objetos S3 desacoplado (puertos `8333`, `8888`, `9333`).
* **Open Policy Agent (OPA):** Motor de autorización declarativa con montaje de reglas Rego (puerto `8181`).
* **.NET Aspire Dashboard (`mcr.microsoft.com/dotnet/aspire-dashboard`):** Panel interactivo OTLP para visualización de trazas, métricas y logs estructurados correlacionados en tiempo real (puerto `18888` para UI web y `4317` para gRPC OTLP).
* **Streamlit Unified Admin:** Consola interactiva de exploración de tablas PostgreSQL, claves Redis y objetos SeaweedFS (puerto `8501`).

---

## 5. Batería de Pruebas Automatizadas (`tests/`)

El backend cuenta con una batería de pruebas automatizadas organizadas en tres proyectos de validación:

### 5.1. Pruebas Unitarias (`RestoCore.UnitTests`) - 61+ Tests Superados
* `LoginCommandHandlerTests` & `PasswordHasherTests`: Validan el hashing criptográfico PBKDF2-HMAC-SHA256, verificación en tiempo constante, autenticación exitosa contra usuarios activos en base de datos y rechazo `UnauthorizedAccessException` ante contraseñas erróneas, usuarios inactivos o inexistentes.
* `CategoryQueryHandlerTests`, `UpdatePatchCategoryCommandHandlerTests` & `DeleteCategoryCommandHandlerTests`: Validan el listado ordenado, consulta por ID, actualización total/parcial y bloqueo con `409 Conflict` al intentar eliminar categorías con platos asociados.
* `TenantProfileHandlerTests` & `PublicMenuContactProfileTests`: Validan la consulta y modificación total/parcial de nombre comercial, teléfono, dirección y horarios de atención, así como su exposición en la carta pública.
* `CreateMenuItemCommandHandlerTests`, `UpdateMenuItemCommandHandlerTests`, `PatchMenuItemCommandHandlerTests`, `SoftDeleteMenuItemCommandHandlerTests` & `RestoreMenuItemCommandHandlerTests`: Validan el ciclo completo ABMC de platos, validación de categoría `1:N` (`422 Unprocessable Entity`), preservación de `DietaryLabels`, baja suave con bloqueo ante órdenes activas y restauración dentro de los 7 días.
* `PurgeArchivedDishesWorkerTests`: Valida la purga definitiva en base de datos y almacenamiento S3 de platos cuya fecha `DeletedAt` supera los 7 días de retención.
* `SubmitOrderCommandHandlerTests`: Valida la creación de comandas, captura de snapshots inmutables y encolamiento FIFO.
* `ItemAvailabilityStateTests` & `ToggleItemAvailabilityCommandHandlerTests`: Validan transiciones de disponibilidad en cocina y resiliencia ante `DbUpdateConcurrencyException` con política de reintentos exponenciales y jitter.
* `MenuValidationTests`: Valida rangos de precios, nombres obligatorios y restricciones de selección en modificadores.
* `TenantResolutionTests`: Valida la extracción de contexto multi-tenant desde múltiples orígenes.
* `PublicMenuQueryTests` & `PublicMenuCanvasTests`: Validan la construcción jerárquica de la respuesta pública, consistencia del hash `ETag`, renderizado de coordenadas relativas de lienzo y depuración transparente de platos huérfanos.
* `QrCodeServiceTests`: Valida la generación correcta de matrices QR en SVG y PNG.
* `UpdateMenuLayoutValidatorTests` & `MenuCompilationServiceTests`: Validan reglas geométricas estrictas y compilación AOT (< 3 segundos).

### 5.2. Pruebas de Integración (`RestoCore.IntegrationTests`)
* `AdminMenuLayoutEndpointsTests`: Valida la mutación protegida del lienzo (`PUT /api/v1/admin/menu/layout`), denegación por roles no autorizados y validación 400 ante geometrías inválidas.
* `MenuPublishEndpointsTests`: Valida el endpoint `POST /api/v1/admin/menu/publish`, el encolamiento y retorno 202 Accepted, la creación de registros `MenuPublishJob` y la invalidación perimetral.
* `PublicMenuCanvasEndpointsTests`: Valida la consulta de la carta pública con soporte dual (plantilla base y modo lienzo), evaluación condicional 304 ETag y preservación de resiliencia.
* `ContainerReadinessTests`: Verifica la conectividad y respuesta saludable de dependencias externas (PostgreSQL, Redis, SeaweedFS, OPA).
* `SeaweedStorageTests`: Verifica la generación y expiración de URLs pre-firmadas hacia el gateway S3.
* `SwaggerEndpointTests`: Verifica la disponibilidad de Swagger UI en desarrollo y su restricción en producción.
* `AspireDashboardReadinessTests`: Valida la conectividad con el colector OTLP del Aspire Dashboard.
* `FullLifecycleE2ETests`: Flujo completo E2E de aprovisionamiento de tenant, creación de platos, emisión de QR y consulta pública con ETag.

### 5.3. Pruebas de Seguridad (`RestoCore.SecurityTests`)
* `CrossTenantDatabaseIsolationTests`: Valida que los filtros de consulta globales impidan de forma estricta cualquier fuga o lectura de datos entre diferentes tenants.

---

## 6. Pruebas de Carga y Rendimiento con k6 (`scripts/k6/`)

Se implementó una suite de pruebas de estrés automatizada mediante scripts de k6 (`scripts/run-stress-tests.ps1`):
* **`public-menu-load.js`:** Carga sostenida sobre el endpoint público de la carta.
* **`public-menu-stress.js`:** Estrés concurrente para auditar el presupuesto de latencia (< 500ms p95 bajo carga).
* **`etag-cache-test.js`:** Validación de respuestas 304 Not Modified con cabeceras `If-None-Match`, certificando latencias < 50ms al operar bajo caché.
* **`all-endpoints-test.js`:** Prueba integral sobre endpoints de catálogo, cocina, almacenamiento y mesas.

---

## 7. Entorno de Desarrollo, Autenticación en Base de Datos y Semillero Bajo Demanda (`DatabaseSeeder`)

Esta sección especifica la arquitectura de identidad y el procedimiento de semillado bajo demanda (*On-Demand Database Seeding*) para entornos de desarrollo y pruebas locales (`Feature 010`).

### 7.1. Separación Estricta entre Arranque Web y Semillado de Datos
* **Cero Credenciales Cableadas en Código:** `AuthEndpoints.cs` no contiene usuarios ni contraseñas en memoria. Toda solicitud a `POST /api/v1/auth/login` se valida estrictamente contra la tabla `users` en PostgreSQL verificando el hash criptográfico **PBKDF2-HMAC-SHA256** (`100.000` iteraciones).
* **Base de Datos Limpia por Defecto:** Al iniciar los contenedores de Docker (`docker compose up -d`) o levantar el servidor web (`dotnet run`), la base de datos no ejecuta inserciones automáticas de datos de muestra. Si la base de datos no ha sido semillada previamente, cualquier intento de inicio de sesión retornará `HTTP 401 Unauthorized`.

### 7.2. Ejecución del Semillero Bajo Demanda (`seed-db.ps1` / `--seed`)
Para poblar la base de datos local de manera determinista e idempotente (pudiendo ejecutarse múltiples veces sin duplicar registros ni arrojar errores), se dispone del script automatizado en la raíz del backend:

```powershell
./scripts/seed-db.ps1
```

O invocando directamente el proyecto de API con el argumento `--seed`:

```bash
dotnet run --project src/RestoCore.Api/RestoCore.Api.csproj -- --seed
```

Cuando `Program.cs` detecta el argumento `--seed`:
1. Omite la inicialización de Redis Streams, WebSockets y Background Workers.
2. Asegura la existencia y compatibilidad del esquema relacional (`EnsureCreatedAsync` y sentencias DDL idempotentes para `users`, `tenants` y `menu_items`).
3. Ejecuta `DatabaseSeeder.SeedAsync(app.Services)` e finaliza el proceso inmediatamente con código de salida `0`.

### 7.3. Catálogo de Datos Semillados en PostgreSQL (`DatabaseSeeder.cs`)

#### A. Restaurante Base (`tenants`)
* **ID (`TenantId`):** `11111111-1111-1111-1111-111111111111`
* **Nombre Comercial:** `El Gato Negro`
* **Slug:** `el-gato-negro`
* **Teléfono:** `+54 11 4567-8901`
* **Dirección:** `Av. Corrientes 1669, CABA`
* **Horarios de Atención:** `Lunes a Domingo de 08:00 a 00:00 hs`
* **Identidad Visual (`BrandingConfig`):** Primario `#C9A227`, Secundario `#1C1C1C`, Fondo `#FAF8F5`, Texto `#2B2D42`, Tipografía `Playfair Display, serif`, Modo `GridWithImages`.

#### B. Cuentas de Usuario Persistidas en Tabla `users`
Todas las contraseñas se almacenan hasheadas en la columna `PasswordHash` bajo el formato `v1$100000$<salt_base64>$<hash_base64>`:

| Perfil / Nombre | Correo Electrónico (`Email`) | Contraseña Plana (Para Login) | Rol Principal (`PrimaryRole`) | Roles Asignados (`Roles`) | Tenant Asociado (`TenantId`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chef Marco** (Dueño) | `admin@bistrogourmet.com` | `admin123` | `owner` | `owner`, `tenant_admin`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` |
| **Administrador Local** (Dueño) | `admin@restocore.com` | `admin123` | `owner` | `owner`, `tenant_admin`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` |
| **Cocinero Pablo** (Cocina) | `cocina@restocore.com` | `cocina123` | `cook` | `cook`, `kitchen_staff` | `11111111-1111-1111-1111-111111111111` |
| **Super Administrador** (SaaS) | `superadmin@restocore.com` | `admin123` | `super_admin` | `super_admin` | `null` (alcance global de plataforma) |

#### C. Categorías, Platos de Muestra y Modificadores (`categories`, `menu_items`, `modifier_groups`)
El semillero inserta 3 categorías y 5 platos representativos para `El Gato Negro`:

| Categoría (Orden) | Plato Semillado | Precio Base | Alérgenos (`Allergens`) | Etiquetas Dietéticas (`DietaryLabels`) | Modificadores Asociados |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1. Entradas y Tapas** | Empanadas Salteñas Cortadas a Cuchillo | `$4500.00` | `gluten` | `artisanal` | Ninguno |
| **1. Entradas y Tapas** | Provoleta Ahumada con Tomates Confitados | `$8900.00` | `dairy` | `vegetarian`, `gluten_free`, `celiac_safe` | Ninguno |
| **2. Platos Principales** | Ojo de Bife Madurado 400g | `$22500.00` | `dairy` | `gluten_free`, `high_protein` | **Punto de Cocción** (Obligatorio, 1 opción: *Jugoso*, *A Punto*, *Bien Cocido*) |
| **2. Platos Principales** | Sorrentinos de Calabaza Asada y Parmesano | `$14800.00` | `gluten`, `dairy`, `nuts`, `eggs` | `vegetarian` | Ninguno |
| **3. Postres y Cafetería**| Flan Casero Mixto de Campo | `$6200.00` | `dairy`, `eggs` | `vegetarian`, `gluten_free` | Ninguno |

#### D. Mesas Físicas y Tokens QR (`tables`)
Se crean 5 mesas activas numeradas del `1` al `5` para el tenant `el-gato-negro`, con tokens de seguridad `mesa-1-el-gato-negro` hasta `mesa-5-el-gato-negro`.

### 7.4. Parámetros de Infraestructura Local (`docker-compose.dev.yml`) y Firma JWT
* **Clave Secreta JWT (`Jwt:Key`):** `RestoCoreSuperSecretDevelopmentKey2026!#*` (HMAC SHA256, validez de 7 días, Issuer y Audience `RestoCore`).

| Servicio | Contenedor | Puerto Host | Credenciales / Conexión por Defecto | Propósito y Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `restocore-postgres-dev` | `5432` | `Host=localhost;Port=5432;Database=restocore_dev;Username=postgres;Password=postgres_dev_password` | Base relacional principal. Persistencia en volumen `postgres_dev_data`. |
| **Redis 7** | `restocore-redis-dev` | `6379` | `localhost:6379` (Sin contraseña) | Motor de caché de menú, colas FIFO Redis Streams e invalidación por versiones. |
| **SeaweedFS S3** | `restocore-seaweedfs-dev` | `8333` (S3 Gateway)<br/>`8888` (Filer HTTP)<br/>`9333` (Master) | `AWS_ACCESS_KEY_ID=any_key`<br/>`AWS_SECRET_ACCESS_KEY=any_secret` | Almacenamiento desacoplado de imágenes. Volumen `seaweedfs_data`. |
| **Create Bucket** | `restocore-create-bucket-dev` | N/A | Efímero (`sleep 3 && curl -s -X PUT http://seaweedfs:8333/restocore-images`) | Creación automática del bucket `restocore-images` al iniciar el stack. |
| **Open Policy Agent (OPA)** | `restocore-opa-dev` | `8181` | `http://localhost:8181` | Servidor de políticas Rego montadas desde `./specs/policies` en `/policies:ro`. |
| **.NET Aspire Dashboard** | `restocore-aspire-dashboard-dev` | `18888` (Web UI)<br/>`4317` (OTLP gRPC)<br/>`4318` (OTLP HTTP) | Modo no autenticado (`DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true`) | Visualizador en tiempo real de trazas distribuidas, métricas y logs estructurados. |
| **Streamlit Unified Admin** | `restocore-unified-admin-dev` | `8501` (Web UI) | Acceso directo a Postgres, Redis y SeaweedFS | Consola modular de administración para inspección de tablas, claves de caché y objetos S3. |


