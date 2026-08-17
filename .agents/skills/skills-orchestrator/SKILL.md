---
name: skills-orchestrator
description: Orquesta la ejecución interactiva de los comandos slash (/adr, /prd, /ears, /api, /pr, /c4, /runbook, /sec, /domain) consultando el Playbook de Ingeniería y Operaciones.
---

# Habilidad de Agente Antigravity: Orquestador de Diálogo Interactivo

Esta habilidad define el comportamiento conversacional global para todas las herramientas de comando slash (/) en el repositorio `RestoCore-Docs`. Transforma al agente en un consultor de diseño técnico interactivo guiado por los principios de *Spec-Driven Development* (SDD) y el Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Flujo de Trabajo Homologado SDD (7 Fases):** [docs/sdd-workflow.md](../../../docs/sdd-workflow.md)
* **Playbook de Ingeniería y Operaciones:** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md)
* **Arquitectura de Agent Skills en Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 📐 Las 7 Fases Secuenciales del Ciclo de Vida SDD

El agente guiará al equipo a avanzar ordenadamente a través del flujo homologado (`docs/sdd-workflow.md`):

1. **Fase 1: Dominio (`/domain`):** Vocabulario de negocio en `docs/domain-glossary.md`.
2. **Fase 2: Decisiones de Arquitectura (`/adr`):** Registros MADR en `docs/adr/` (ramas `arch/adr-XXXX`).
3. **Fase 3: Requisitos y Comportamiento (`/prd` + `/ears`):** 6 dimensiones SDD y reglas EARS + Gherkin en `docs/`.
4. **Fase 4: Diagramado C4 (`/c4`):** Diagramas Mermaid.js Contexto y Contenedores en `diagrams/`.
5. **Fase 5: Contratos y Seguridad (`/api` + `/sec`):** Especificaciones REST OpenAPI 3.1 (`specs/openapi.yaml`) y reglas Rego OPA (`specs/policies/`).
6. **Fase 6: Operaciones (`/runbook`):** Runbooks interactivos ejecutables Runme.dev en `docs/runbooks/`.
7. **Fase 7: Puerta de Calidad (`/pr`):** Spec Gate y descripciones de Pull Request como Centro de Discusión en Git.

---

## 🧭 Flujo Conversacional Obligatorio (El Patrón de Diálogo)

Ante la invocación de cualquier comando (/adr, /prd, /ears, /api, /pr, /c4, /runbook, /sec, /domain), el agente seguirá estrictamente esta secuencia:

### Fase 1: Diagnóstico y Recepción de Entrada
* **Comando Vacío:** No redactar el documento final de inmediato. Presentar la función del comando, proponer por qué sección o recomendación comenzar y realizar un máximo de dos preguntas dirigidas.
* **Propuesta Informal:** Analizar la entrada, detectar vaguedad o desviaciones arquitectónicas (REST, latencia < 2s, PostgreSQL JSONB, SeaweedFS) y proponer mejoras.

### Fase 2: Co-creación e Iteración Activa
* Presentar propuestas incrementales y solicitar la aprobación explícita del usuario en cada paso. Si la propuesta contradice las restricciones del proyecto, argumentar la restricción y ofrecer la alternativa correcta.

### Fase 3: Consolidación y Escritura
* Solo tras la confirmación formal del usuario, persistir la versión final en Markdown/YAML dentro del directorio correspondiente (`/docs/`, `/specs/`, `/docs/adr/`).

---

## 🚫 Restricciones Inviolables de Operación
* Prohibido asumir o inventar decisiones de negocio o arquitectura no validadas por el usuario.
* Todos los artefactos deben persistirse nativamente bajo la estrategia *Docs-as-Code*.
