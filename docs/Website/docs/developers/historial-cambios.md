# Historial de Cambios e Integraciones

Este documento refleja en orden cronológico la actividad del repositorio, los Pull Requests fusionados en la rama principal y los hitos de implementación del software.

## Hito: Especificación de Entorno de Desarrollo y Cuentas Semilladas (Development Seeding)
* **Fecha:** 26 de Octubre de 2026
* **Resumen:** Sincronización y formalización del entorno local y datos de prueba (`/backend-sync`):
  * **Comportamiento del Esquema de Persistencia:** Aclaración de que las migraciones de EF Core (`InitialCreate` y `AddCanvasLayoutAndMenuPublishJobs`) definen la estructura DDL en PostgreSQL sin semillado estático de datos (`HasData` ausente), arrancando en base limpia.
  * **Cuentas Semilladas de Desarrollo (`AuthEndpoints.cs`):** Especificación del catálogo de cuentas preconfiguradas en memoria para `owner` (`admin@bistrogourmet.com` / `admin@restocore.com` - tenant `11111111-1111-1111-1111-111111111111` / `el-gato-negro`), `cook` (`cocina@restocore.com`) y `super_admin` (`superadmin@restocore.com`).
  * **Parámetros de Infraestructura (`docker-compose.dev.yml`):** Documentación de puertos y credenciales por defecto para PostgreSQL (5432), Redis (6379), SeaweedFS (8333/8888/9333), OPA (8181), Aspire Dashboard (18888/4317) y Streamlit Unified Admin (8501).
  * **Guía de Onboarding:** Actualización de `guia-onboarding.md` y `arquitectura-backend-dotnet.md` con tablas de referencia rápida para facilitar la puesta en marcha local.

---

## Hito: Modificación de Platos, Relación 1:N con Categorías, DietaryLabels y Baja Suave con Retención de 7 Días (ADR-0010 Actualizado)
* **Fecha:** 10 de Octubre de 2026
* **Resumen:** Actualización integral de especificaciones funcionales, relacionales y de ciclo de vida de catálogo:
  * **Modificación Parcial y Total de Platos:** Especificación de operaciones `PUT /api/v1/admin/items/{id}` (modificación total con invalidación en CDN) y `PATCH /api/v1/admin/items/{id}` (modificación parcial con concurrencia optimista) en el PRD de administración y contratos OpenAPI 3.1.
  * **Asociación Estructural 1:N (Platos y Categorías):** Formalización de la cardinalidad unívoca obligatoria mediante clave foránea `category_id` (`REFERENCES categories(id) ON DELETE RESTRICT`). Descarte documentado de la relación N:M para el MVP para garantizar simplicidad en la carta móvil y rendimiento del caché perimetral (< 2s LCP).
  * **Etiquetas Dietéticas (`DietaryLabels`):** Retención y estandarización del atributo `DietaryLabels` / `dietary_labels` (apto celíacos, vegano, vegetariano, etc.) y `Allergens` tanto en el modelo relacional como en las peticiones y respuestas DTO del catálogo.
  * **Ciclo de Baja Suave y Retención de 7 Días:** Establecimiento de ventana de gracia de 7 días (1 semana) a partir de `deleted_at`, ocultando inmediatamente el plato de la vista pública y permitiendo su restauración administrativa.
  * **Purga Física Programada:** Definición del worker automatizado (`PurgeArchivedDishesWorker`) para la eliminación definitiva en PostgreSQL (`DELETE FROM dishes WHERE is_deleted = true AND deleted_at <= NOW() - INTERVAL '7 days'`) y remoción de archivos binarios multimedia en SeaweedFS.
  * **Cláusulas EARS y Escenarios Gherkin:** Incorporación de cláusulas formales `[EARS-DISH-006]` a `[EARS-DISH-009]`, escenarios Gherkin de actualización y purga, y respuestas `422 Unprocessable Entity` ante categorías inexistentes.

---

## Hito: Repositorios, Unit of Work con Resiliencia de Concurrencia y Autenticación JWT (Feature 006 en `resto-core-back`)
* **Fecha:** 10 de Octubre de 2026
* **Commit:** `41738b1` en `resto-core-back`
* **Resumen:** Refactorización integral de la capa de persistencia y módulo de identidad:
  * **Segregación de Repositorios:** Creación de interfaces de persistencia segregadas por Bounded Contexts (`ICatalogRepository`, `IKitchenRepository`, `IMenuLayoutRepository`, `ITenantRepository`), desacoplando de manera estricta todos los comandos y consultas de la capa de Aplicación respecto de `IApplicationDbContext`.
  * **Unidad de Trabajo (Unit of Work):** Implementación de `IUnitOfWork` y `UnitOfWork` para delimitación atómica explícita de transacciones y confirmación unificada (`CommitAsync`, `BeginTransactionAsync`, `CommitTransactionAsync`, `RollbackTransactionAsync`).
  * **Resiliencia ante Concurrencia Optimista:** Estrategia de reintentos automáticos con retroceso exponencial (*exponential backoff*) y fluctuación aleatoria (*jitter*) ante colisiones `DbUpdateConcurrencyException` en `KitchenRepository.UpdateItemAvailabilityWithRetryAsync`, desacoplando la entidad del ChangeTracker (`EntityState.Detached`) antes de cada reintento.
  * **Autenticación e Identidad JWT:** Mapeo de Minimal APIs en `AuthEndpoints` (`POST /api/v1/auth/login` y `GET /api/v1/auth/me`) para emisión y validación de tokens JWT con claims de usuario (`sub`, `name`, `email`), contexto multi-tenant (`tenant_id`, `tenant_slug`) y roles (`owner`, `tenant_admin`, `kitchen_staff`, `cook`, `super_admin`).
  * **CORS Estricto y Middleware de Ejecución:** Restricción configurable de orígenes cruzados vía `CORS_ALLOWED_ORIGINS` con credenciales y exposición de la cabecera `ETag`. Registro estructurado de solicitudes HTTP correlacionadas con trazas W3C de OpenTelemetry.
  * **Cobertura de Pruebas:** Incremento a 33 pruebas unitarias superadas en `RestoCore.UnitTests`, incorporando suites para validación de reintentos concurrentes (`ToggleItemAvailabilityCommandHandlerTests`).

---

## Hito: Postergación del Seguimiento de Ocupación por QR y Visión de Módulo Waitlist (ADR-0012)
* **Fecha:** 22 de Septiembre de 2026
* **Resumen:** Formalización de exclusión técnica y visión de expansión de salón:
  * **Decisión de Arquitectura (ADR-0012 - Pospuesto):** Se descarta medir ocupación real y tiempo de estancia vía lecturas de código QR de mesa, constatando la falta de correlación directa entre escaneos y personas físicas y evitando ventanas de expiración (TTL) imprecisas en la base de datos.
  * **Visión de Módulo de Turnos y Recepción (Waitlist/Turnos):** Las métricas fidedignas de permanencia, rotación de mesas y cálculo estricto de RevPASH se delegan a un futuro módulo con registro verificado de comensales sentados y marcas de tiempo físicas.
  * **Ajuste en Especificaciones:** Pausado formal del requerimiento `[EARS-METRIC-006]`, preservación de `table_token` como parámetro puramente contextual en OpenAPI 3.1 y exclusión de contadores de presencia de mesa en el dashboard analítico de Plan Pro.

---

## Hito: Jerarquía de Métricas Analíticas y Telemetría de Menú (ADR-0011)
* **Fecha:** 21 de Septiembre de 2026
* **Resumen:** Estructuración y formalización de la jerarquía analítica por fases de negocio y modelo de telemetría:
  * **Decisión de Arquitectura (ADR-0011):** Adopción de un esquema en tres niveles de prioridad para evitar acoplamientos prematuros y salvaguardar el presupuesto de latencia de la carta QR (< 2s LCP).
  * **Nivel 1 - Prioridad Alta (Fase MVP / Tráfico e Ingeniería de Menú):** Conteo agregado de aperturas de QR (día/mes), popularidad de platos, categorías más interactivas y Matriz de Ingeniería de Menú (Estrellas, Caballos de Batalla, Puzzles y Perros) combinando interacción con márgenes de contribución.
  * **Nivel 2 - Prioridad Media (Plan Pro):** Distribución horaria de horas pico, RevPASH (Revenue Per Available Seat-Hour), rotación y permanencia en mesas, y desglose de dispositivos.
  * **Nivel 3 - Prioridad Baja (Fases Avanzadas):** Costo Primo (COGS + Nómina), varianza teórico-real de alimentos, tiempos de comanda en cocina (KDS) y rotación de inventarios.
  * **Especificación y Contratos:** Endpoints `POST /api/v1/analytics/collect` y `GET /api/v1/admin/analytics/dashboard` documentados en OpenAPI 3.1, cláusulas de comportamiento formal EARS (`[EARS-METRIC-001]` a `[EARS-METRIC-010]`) y políticas OPA de acceso público e ingesta anónima sin PII.

---

## Hito: Baja Suave de Platos (Soft Delete) y Snapshots Inmutables en Comandas (ADR-0010)
* **Fecha:** 20 de Septiembre de 2026
* **Resumen:** Definición y formalización del ciclo de vida seguro de platos y preservación contable histórica:
  * **Decisión de Arquitectura (ADR-0010):** Adopción exclusiva del patrón de baja suave (`IsDeleted = true`, `DeletedAtUtc = now`) mediante Global Query Filters en EF Core, descartando la baja física destructiva para proteger la integridad referencial y las transacciones de ventas pasadas.
  * **Snapshots Inmutables en Comandas:** Desacoplamiento de `OrderItem` frente a modificaciones o retiro de platos mediante clave foránea nulable (`MenuItemId: Guid?` con `ON DELETE SET NULL`) y captura inmutable de campos congelados (`ItemNameSnapshot`, `UnitPriceSnapshot` y `AppliedModifiersJson`).
  * **Experiencia de Usuario No Técnica:** Confirmación amigable al usuario administrador clarificando que el plato ya no es visible para comensales mientras sus reportes pasados permanecen intactos. Bloqueo automático con HTTP 409 Conflict y mensaje claro si el plato tiene comandas abiertas o en preparación en cocina (KDS).
  * **Especificación y Contratos:** Endpoints `DELETE /api/v1/admin/items/{id}` y `POST /api/v1/admin/items/{id}/restore` documentados en OpenAPI 3.1, cláusulas de comportamiento formal EARS (`[EARS-DISH-001]` a `[EARS-DISH-005]`) y reglas de autorización OPA (`archive_dish`, `restore_dish`).

---

## Hito: Modo Lienzo (Canvas Layout) y Compilación Ahead-Of-Time (Feature 005 en `resto-core-back`)
* **Fecha:** 19 de Septiembre de 2026
* **Commit:** `783e3d5` en `resto-core-back`
* **Resumen:** Implementación completa del soporte de maquetación visual libre y compilación perimetral:
  * **Modelos de Dominio:** Value Objects inmutables `LayoutConfig` y `CanvasElement` mapeados a columnas `JSONB` en PostgreSQL (`Tenant.LayoutConfig`). Entidad `MenuPublishJob` (`ITenantScopedEntity`) para seguimiento y auditoría asíncrona del pipeline AOT.
  * **Casos de Uso CQRS:** `UpdateMenuLayoutCommand` con validaciones geométricas estrictas en FluentValidation (`UpdateMenuLayoutValidator`), `PublishMenuCommand` con procesamiento en segundo plano y retorno HTTP 202 Accepted, y `GetPublicMenuQuery` con depuración automática de platos huérfanos y cabeceras `Cache-Control: public, max-age=3600, s-maxage=86400`.
  * **Infraestructura y Persistencia:** Migración EF Core `20260918025637_AddCanvasLayoutAndMenuPublishJobs`, servicio de aplanamiento geométrico `MenuCompilationService` (SLA < 3 segundos), y adaptador `LocalDevelopmentCdnPurgeService` con instrumentación OTel para fallas (`CDN_PURGE_FAILURE`).
  * **Minimal APIs:** Endpoints `PUT /api/v1/admin/menu/layout` y `POST /api/v1/admin/menu/publish` protegidos por autorización declarativa OPA/Rego (`manage_layout`, `publish_menu`).
  * **Cobertura de Pruebas:** Nuevas suites de pruebas unitarias e integradas (`AdminMenuLayoutEndpointsTests`, `MenuPublishEndpointsTests`, `PublicMenuCanvasEndpointsTests`, `MenuCompilationServiceTests`, `UpdateMenuLayoutValidatorTests`, `PublicMenuCanvasTests`).

---

## Hito: Optimizaciones de Rendimiento y Caché Post-Commit (`resto-core-back`)
* **Fecha:** 15 de Septiembre de 2026
* **Resumen:** Reemplazo de MediatR por un mediador CQRS permisivo de cero dependencias (`RestoCore.Application/Common/Mediator`). Implementación de caché en memoria de alta concurrencia con llaves versionadas por tenant e invalidación atómica post-commit en `ApplicationDbContext.SaveChangesAsync()`, eliminando lecturas sucias durante actualizaciones concurrentes.

---

## Hito: Implementación de Observabilidad Formal OTel (Feature 004)
* **Fecha:** 09 de Septiembre de 2026
* **Resumen:** Alineación completa con las especificaciones de telemetría de `RestoCore-Docs`. Emisión de logs estructurados en JSON con enriquecimiento de `tenant_id`, `http.status_code`, `error.code` y correlación estricta con `trace_id` y `span_id` en `GlobalExceptionHandler`.

---

## Hito: Pruebas k6, Aspire Dashboard y Swagger UI (Feature 003)
* **Fecha:** 08 de Septiembre de 2026
* **Resumen:** Creación de suite de pruebas de estrés y rendimiento con k6 (`scripts/k6/`), integración de .NET Aspire Dashboard en `docker-compose.dev.yml` como visor OTLP en tiempo real, e integración interactiva de Swagger UI / OpenAPI 3.1 en ambiente de desarrollo.

---

## Hito: Entorno Docker Dev y Almacenamiento SeaweedFS (Feature 002 / PR #2)
* **Fecha:** 07 de Septiembre de 2026
* **Enlace de Revisión:** [Ver PR #2 en resto-core-back](https://github.com/Manu07Alvarez/resto-core-back/pull/2)
* **Resumen:** Orquestación de dependencias locales en Docker Compose (PostgreSQL, Redis, SeaweedFS, OPA). Implementación de subida asíncrona de imágenes mediante URLs pre-firmadas (`ADR-0004`), endpoint de preparación `/ready` multipropósito y suite E2E de verificación con 30 pruebas automatizadas pasando exitosamente.

---

## Hito: Implementación del Core Backend .NET 10 (Feature 001 / PR #1)
* **Fecha:** 06 de Septiembre de 2026
* **Enlace de Revisión:** [Ver PR #1 en resto-core-back](https://github.com/Manu07Alvarez/resto-core-back/pull/1)
* **Resumen:** Implementación completa de la Feature 001 (Multi-Tenant Digital Menu) en el repositorio `resto-core-back` con Clean Architecture, Minimal APIs, CQRS, PostgreSQL con columnas `JSONB`, autorización declarativa OPA/Rego y generación vectorial de QR (SVG/PNG).

---

## PR #14: Depuración de Referencias a IA en la Documentación Oficial
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 19 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #14 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/14)
* **Resumen:** Limpieza integral en todas las especificaciones para erradicar cualquier mención a herramientas de asistencia y formalizar el flujo de trabajo SDD centrado exclusivamente en el equipo de ingeniería.

---

## PR #13: Diagramado de Arquitectura C4 Nivel 1 (Contexto) y Nivel 2 (Contenedores)
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #13 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/13)
* **Resumen:** Modelado de arquitectura lógica en formato Mermaid.js conforme a la metodología C4 de Simon Brown.

---

## PR #12: Requisitos de Producto para Carta QR Pública y Comanda de Cocina (KDS)
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #12 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/12)
* **Resumen:** Especificación funcional bajo las 6 dimensiones de SDD y cláusulas EARS para los módulos de clientes y cocina.

---

## PR #11: ADR-0007 Procesamiento de Pedidos con Cola FIFO y Eventos WebSockets
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #11 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/11)
* **Resumen:** Adopción de colas secuenciales FIFO (Redis Streams) y WebSockets seguros (`wss://`) para la recepción de pedidos en cocina sin condiciones de carrera.

---

## PR #10: ADR-0006 Seguridad Declarativa y Autorización Desacoplada con OPA y Rego
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #10 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/10)
* **Resumen:** Adopción de Open Policy Agent y políticas declarativas Rego para el control de accesos multi-tenant desacoplado del backend.

---

## PR #9: ADR-0005 Presupuesto de Latencia < 2s LCP y Caching CDN Perimetral
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #9 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/9)
* **Resumen:** Definición de SLA de carga perimetral en < 2 segundos e invalidación inteligente de caché mediante `version_hash`.

---

## PR #8: ADR-0004 Carga Asíncrona de Imágenes con SeaweedFS mediante URLs Pre-firmadas
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 18 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #8 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/8)
* **Resumen:** Desacoplamiento del flujo de almacenamiento de fotografías mediante URLs temporales firmadas generadas por el backend.

---

## PR #7: Portal de Documentación Docusaurus y Guía de Integración
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 17 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #7 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/7)
* **Resumen:** Configuración e inicialización del portal Docs-as-Code centralizado en Docusaurus con tema visual Clarion.

---

## PR #6: Requisitos de Producto para Panel de Administración CRUD
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 17 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #6 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/6)

---

## PR #5: Glosario de Lenguaje Ubicuo (DDD) y Entidad Tenant & Mesa
* **Autor:** `@Manu07Alvarez`
* **Fecha de Fusión:** 16 de Agosto de 2026
* **Enlace de Revisión:** [Ver PR #5 en GitHub](https://github.com/Manu07Alvarez/RestoCore-Docs/pull/5)
