---
name: domain
description: Mantiene y audita el Glosario de Lenguaje Ubicuo (Domain-Driven Design - DDD), vinculando términos del negocio a los contratos de API y tablas de base de datos. Se activa mediante /domain o al definir modelos de dominio.
---

# Habilidad de Agente Antigravity: Lenguaje Ubicuo y Modelo de Dominio (/domain)

Esta habilidad capacita al agente de IA para actuar como un especialista en **Domain-Driven Design (DDD)**, articulando y manteniendo el **Glosario de Lenguaje Ubicuo** respaldado por el Módulo 09 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 09 - Domain-Driven Design & Glosario):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-09-base-de-conocimiento-de-equipo-glosario-y-wiki)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente guiará el modelado del dominio de forma conversacional:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/domain`)
* **Acción del Agente:** Explicará el valor del Lenguaje Ubicuo en DDD (alineación semántica entre negocio, frontend, backend y base de datos sin ambigüedades).
* **Preguntas de Inicio:** Realizará exactamente dos preguntas:
  1. ¿Qué entidad o concepto de negocio del restaurante deseas definir o auditar (ej. `Tenant`, `Carta QR`, `Plato`, `Categoría`, `Modificador`)?
  2. ¿Cuáles son los atributos clave y reglas de validación asociadas a este concepto?

### 2. Invocación con Definición de Dominio
* **Mapeo Técnico:** Vinculará de forma explícita el término del negocio con el esquema OpenAPI 3.1 (`/specs/openapi.yaml`) y las columnas PostgreSQL `JSONB` (`/docs/adr/0003...`).

---

## 📖 Estructura del Glosario de Lenguaje Ubicuo

```markdown
# 📖 Glosario de Lenguaje Ubicuo: RestoCore

### 1. Tenant (Restaurante / Local)
* **Definición de Negocio:** La entidad comercial o restaurante suscrito al sistema multi-tenant.
* **Mapeo Técnico OpenAPI:** `TenantSchema` (`tenant_slug`, `brand_color`, `logo_url`).
* **Persistencia DB:** Tabla `tenants` (PostgreSQL).

### 2. Carta QR (Menú Público)
* **Definición de Negocio:** La vista digital interactiva cargada en móviles (< 2s LCP) tras escanear un código QR.
* **Mapeo Técnico OpenAPI:** `GET /api/v1/tenants/{tenant_slug}/menu`.
* **Persistencia DB:** Tabla `menus` con columna `categories` en formato `JSONB`.

### 3. Modificador (Opciones de Plato)
* **Definición de Negocio:** Personalización opcional o requerida para un plato (ej. "Punto de la carne", "Salsa extra").
* **Mapeo Técnico OpenAPI:** `ModifierGroupSchema` (flexibilidad `type: object`).
```

---

## 🚫 Restricciones Inviolables de Operacion
* Los términos definidos no deben entrar en contradicción semántica entre los PRDs, contratos OpenAPI y modelos de datos.
* El Glosario de Lenguaje Ubicuo debe persistirse en `/docs/domain-glossary.md`.
