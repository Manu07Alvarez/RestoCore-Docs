---
name: backend-sync
description: Inspecciona el repositorio de implementacion del backend (resto-core-back), extrae las especificaciones de software, modelos de dominio, endpoints, migraciones y telemetria implementados, y documenta los avances tecnicos en RestoCore-Docs sin referencias a IA o asistentes. Se activa con /backend-sync o al solicitar documentar avances del backend.
---

# Habilidad: Sincronizacion y Documentacion de Especificaciones del Backend (/backend-sync)

Esta habilidad formaliza el procedimiento tecnico para auditar, extraer y documentar de manera continua las implementaciones reales de software del repositorio de backend (`resto-core-back`) dentro del repositorio centralizado de especificaciones de RestoCore (`RestoCore-Docs`), manteniendo la sincronizacion estricta entre codigo fuente y documentacion viva bajo la filosofia Docs-as-Code.

---

## 1. Bloque de Referencias Normativas

* **Playbook de Ingenieria (Modulo 01 - Fundamentos y Arquitectura):** Estandares de documentacion viva, separacion de repositorios y ciclo de vida de especificaciones.
* **Directrices de Gobernanza Documental:** Estricto tono sobrio y formal, prohibicion total de emojis y cero menciones de inteligencia artificial, modelos de lenguaje o agentes. Toda la documentacion debe reflejar exclusivamente especificaciones de software, diseno de sistemas y avances de desarrollo.
* **Inviolables Tecnologicos:** REST API exclusiva (OpenAPI 3.1), presupuesto de latencia (< 2s LCP), persistencia en PostgreSQL con soporte semiestructurado JSONB, almacenamiento desacoplado con SeaweedFS y observabilidad distribuida con OpenTelemetry.

---

## 2. Estrategia de Diagnostico e Inspeccion del Repositorio de Backend

Al activarse mediante `/backend-sync` o ante la instruccion de sincronizar el progreso del backend, el flujo operativo ejecutara de forma metodica los siguientes pasos de analisis sobre `resto-core-back`:

### Paso 1: Analisis del Historial de Cambios y Commits en Git
* Inspeccionar los ultimos commits mediante `git log -n 10 --oneline` o contra la rama principal.
* Evaluar las ramas activas y los cambios consolidados mediante `git show <commit_hash> --stat` o `git diff <commit_anterior>..<commit_actual>`.
* Identificar el objetivo funcional o correccion tecnica de cada entrega.

### Paso 2: Auditoria de Capas de Codigo Fuente (`src/`)
1. **Dominio (`RestoCore.Domain`):**
   * Identificar nuevas entidades, interfaces (`ITenantScopedEntity`) o agregados.
   * Documentar Value Objects y tipos complejos mapeados a columnas `JSONB`.
   * Verificar reglas de invariantes y metodos de fabricacion de dominio.
2. **Aplicacion (`RestoCore.Application`):**
   * Mapear comandos y consultas CQRS organizados por carpetas funcionales (*Features*).
   * Identificar reglas de validacion declarativas con FluentValidation.
   * Documentar interfaces de servicios de infraestructura (`ICdnPurgeService`, `IMenuCompilationService`, etc.).
3. **Infraestructura (`RestoCore.Infrastructure`):**
   * Identificar implementaciones de servicios externos (SeaweedFS, Redis, CDN, OPA).
   * Inspeccionar configuraciones de Entity Framework Core (`IEntityTypeConfiguration<T>`).
   * Auditar migraciones generadas en `Migrations/` (nuevas tablas, columnas `JSONB`, indices GIN, restricciones de clave foranea).
   * Documentar eventos de telemetria distribuida e instrumentacion de OpenTelemetry.
4. **API y Endpoints (`RestoCore.Api`):**
   * Mapear nuevas rutas Minimal APIs expuestas en `Endpoints/`.
   * Registrar metodos HTTP, rutas, cabeceras de control de cache (`Cache-Control`, `ETag`), codigos de respuesta HTTP (200, 202, 304, 400, 401, 403, 404, 422, 500) y esquemas de payload.
   * Identificar politicas de autorizacion OPA asociadas a cada ruta.

### Paso 3: Evaluacion de Suites de Pruebas Automatizadas (`tests/`)
* Auditar pruebas unitarias e integradas (`RestoCore.IntegrationTests`).
* Identificar escenarios de prueba cubiertos: pruebas de concurrencia, resiliencia, evaluacion de cache ETag, y pruebas de carga con k6.

---

## 3. Matriz de Actualizacion Documental en `RestoCore-Docs`

Una vez extraidos los avances tecnicos, el flujo sincronizara los siguientes artefactos en el repositorio de especificaciones:

| Archivo de Destino | Seccion a Actualizar | Contenido Requerido |
| :--- | :--- | :--- |
| `docs/Website/docs/developers/arquitectura-backend-dotnet.md` | Secciones 1, 2, 3 y 4 | Actualizar el stack tecnologico, diagrama modular, entidades de dominio, comandos CQRS, servicios de infraestructura, migraciones y suite de pruebas. |
| `docs/Website/docs/developers/historial-cambios.md` | Bitacora Cronologica | Agregar una nueva entrada versionada documentando las funcionalidades incorporadas, archivos modificados y decisiones aplicadas. |
| `specs/openapi.yaml` | Rutas y Esquemas | Asegurar que los endpoints implementados coincidan exactamente con el contrato REST OpenAPI 3.1. |
| `docs/Website/docs/developers/contrato-api.md` | Endpoints y Matriz OPA | Reflejar los nuevos endpoints en la guia de referencia rapida y actualizar la tabla de autorizacion declarativa. |
| `docs/prd-*.md` | Tareas de Backend | Marcar como completadas las tareas tecnicas correspondientes a las funcionalidades entregadas. |

---

## 4. Estandares de Redaccion y Gobernanza Estricta

1. **Lenguaje Formal y Neutro:** Se empleara unicamente prosa tecnica sobria, orientada a la descripcion precisa de componentes de software, parametros y flujos de ejecucion.
2. **Prohibicion Total de Emojis:** Ningun encabezado, tabla, lista o descripcion podra contener iconos o emoticonos.
3. **Ausencia Absoluta de Metadatos de IA:** Queda estrictamente vetado mencionar prompts, agentes, instrucciones de IA, LLMs o procesos generativos. La documentacion debe leerse como un registro formal de ingenieria de software producido por el equipo tecnico.
4. **Verificacion y Compilacion:** Todo cambio documental debe validarse ejecutando `npm run build` en `docs/Website` para garantizar la inexistencia de enlaces rotos antes de publicar.
