# Guía de Habilidades de Agente para Google Antigravity en `RestoCore-Docs`

Este repositorio de especificaciones técnicas utiliza el estándar **Agent Skills** de Google Antigravity para guiar de manera interactiva, rigurosa y colaborativa la generación de requisitos, contratos de API, diagramas C4 y decisiones de arquitectura respaldadas por el **Manual de Ingeniería y Operaciones** (`.agents/knowledge/`).

---

## Estructura del Paquete de Habilidades (`.agents/skills/`)

Para que el sistema de consola interactiva CLI (`agy`) compile de manera nativa estas habilidades como **comandos slash (/)**, cada una de ellas se organiza como un paquete modular en `.agents/skills/`:

```text
RestoCore-Docs/
├── .agents/
│   ├── knowledge/
│   │   ├── Guía Playbook Ingeniería y Operaciones.md
│   │   └── Skills en Antigravity para .agent.md
│   └── skills/
│       ├── adr/SKILL.md          # /adr      - Registro de Decisiones de Arquitectura (MADR)
│       ├── prd/SKILL.md          # /prd      - PRD Evolutivo (6 Dimensiones SDD + Gherkin)
│       ├── ears/SKILL.md         # /ears     - Elicitación Formal de Requisitos (Sintaxis EARS)
│       ├── api/SKILL.md          # /api      - OpenAPI 3.1 & Observabilidad API-First
│       ├── pr/SKILL.md           # /pr       - Aislamiento e Integración Git (Spec Gate)
│       ├── c4/SKILL.md           # /c4       - Diagramado de Arquitectura C4 en Mermaid.js
│       ├── runbook/SKILL.md      # /runbook  - Runbooks Ejecutables Interactivos (Runme.dev)
│       ├── sec/SKILL.md          # /sec      - Security-as-Code con Open Policy Agent (OPA)
│       └── domain/SKILL.md       # /domain   - Lenguaje Ubicuo y Glosario DDD
```

---

## Lista de Comandos Slash (/) Disponibles

* `/adr` — Redactar y auditar decisiones de arquitectura en formato MADR (`docs/adr/`).
* `/prd` — Generar requisitos de producto bajo las 6 dimensiones SDD (`docs/prd-*.md`).
* `/ears` — Analizar y estructurar reglas de negocio sin ambigüedad en sintaxis EARS.
* `/api` — Diseñar contratos de API REST (OpenAPI 3.1) en `specs/openapi.yaml`.
* `/pr` — Validar la puerta de enlace SDD (*Spec Gate*) y empaquetar Pull Requests en Git.
* `/c4` — Modelar diagramas C4 (Contexto y Contenedores) en Mermaid.js (`diagrams/`).
* `/runbook` — Diseñar Runbooks ejecutables interactivos con Runme.dev (`docs/runbooks/`).
* `/sec` — Formalizar políticas de seguridad declarativa OPA/Rego (`specs/policies/`).
* `/domain` — Gestionar el Glosario de Lenguaje Ubicuo y DDD (`docs/domain-glossary.md`).
