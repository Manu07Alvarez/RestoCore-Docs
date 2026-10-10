# Historial de Cambios e Integraciones

Este documento refleja en orden cronológico la actividad del repositorio, los Pull Requests fusionados en la rama principal y los hitos de implementación del software.

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
