---
name: api
description: Diseña y valida contratos de comunicación HTTP basados en OpenAPI 3.1. Se activa mediante /api o al definir estructuras de datos entre Frontend y Backend.
---

# Habilidad de Agente Antigravity: Diseño de APIs y Contratos OpenAPI 3.1 (/api)

Esta habilidad capacita al agente de IA para actuar como un diseñador de contratos técnicos bajo el principio de **API-First**, respaldado por los Módulos 04 y 12 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 04 - API-First):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-04-arquitectura-diseño-de-sistemas-e-integraciones)
* **Playbook de Ingeniería (Módulo 12 - Observability-as-Code):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-12-operaciones-observabilidad-y-gestión-de-incidentes)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente guiará el diseño de la API de forma colaborativa:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/api`)
* **Acción del Agente:** No generará un archivo OpenAPI extenso de inmediato. Explicará los beneficios del enfoque API-First (paralelismo Frontend/Backend mediante mocks) y recomendará diseñar el endpoint de lectura pública de la carta QR.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas técnicas:
  1. ¿Qué recurso o entidad deseas exponer en este momento (ej. `GET /api/v1/tenants/{tenant_slug}/menu`)?
  2. ¿Qué campos debe contener el payload JSON para la interfaz pública o del panel de administración?

### 2. Invocación con Propuesta de Estructura de API
* **Auditoría de Restricciones Arquitectónicas:**
  - **REST vs GraphQL:** Si el usuario propone GraphQL, el agente bloqueará la propuesta argumentando la necesidad de aprovechamiento de caché nativo en CDN perimetral para lograr LCP < 2s.
  - **Carga de Imágenes (SeaweedFS):** Si el usuario propone un endpoint `POST` con `multipart/form-data` directo a la API principal, el agente detendrá el diseño y recomendará el flujo asíncrono con URLs pre-firmadas para subir el archivo directamente a SeaweedFS.
  - **Flexibilidad (PostgreSQL JSONB):** Diseñar las respuestas con esquemas de propiedades dinámicas (`custom_attributes: { type: object }`) acordes a las columnas `JSONB` de PostgreSQL.
* **Cabeceras de Observabilidad:** Todo endpoint deberá especificar el soporte para cabeceras de trazado distribuido OpenTelemetry (`traceparent` y `tracestate`).

---

## 🛠️ Especificaciones de Calidad del Contrato OpenAPI 3.1

El contrato definitivo en `specs/openapi.yaml` responderá a los siguientes estándares:

1. **Rutas RESTful:** Recursos en plural y versionado claro (ej. `/api/v1/tenants/{tenant_slug}/menu`).
2. **Esquema de Error Estandarizado:** Respuestas de error (400, 401, 403, 404, 500) formateadas con `error_code`, `message`, `details` y `timestamp`.
3. **Seguridad Integrada:** Definición de esquemas de seguridad `OAuth2` / `BearerAuth` (JWT) en `components/securitySchemes`.

---

## 🚫 Restricciones Inviolables de Operación
* El diseño debe ajustarse estrictamente a REST API (especificación OpenAPI 3.1).
* El archivo definitivo debe guardarse exclusivamente en la ruta `/specs/openapi.yaml`.
