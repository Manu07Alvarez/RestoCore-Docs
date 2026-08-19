# RestoCore Docs - Especificaciones y Arquitectura de Sistema

Este repositorio alberga la documentación técnica, especificaciones de producto (PRDs), registros de decisiones de arquitectura (ADRs) y contratos de API para el ecosistema **RestoCore** (Sistema de Gestión para Negocios tipo Menú / Restaurantes).

Se gestiona bajo la filosofía **Docs-as-Code**, asegurando que todas las especificaciones mantengan el mismo rigor, control de versiones y trazabilidad que el código fuente de producción.

---

## Inviolables de Arquitectura

Cualquier especificación, diseño o contrato documentado en este repositorio debe respetar estrictamente los siguientes pilares de arquitectura:

1. **Arquitectura de API:** Uso exclusivo de **REST API** (especificación OpenAPI 3.1). GraphQL queda excluido para el MVP para optimizar el almacenamiento en caché a nivel CDN.
2. **Presupuesto de Latencia:** La carta pública / menú digital mediante QR debe cargar completamente en **menos de 2 segundos** (< 2s LCP) en dispositivos móviles.
3. **Persistencia:** Base de datos principal **PostgreSQL**, aprovechando esquemas flexibles mediante columnas `JSONB` e índices GIN para categorías, platos, modificadores y precios [ADR-0003].
4. **Manejo de Imágenes:** Almacenamiento distribuido con **SeaweedFS**. El flujo de subida de imágenes es asíncrono y desacoplado mediante URLs pre-firmadas generadas por el backend.

---

## Estándares de Documentación y Flujo SDD

De acuerdo con el **[Flujo de Trabajo Homologado SDD (docs/sdd-workflow.md)](./docs/sdd-workflow.md)** y las **[Directrices de Operación (AGENTS.md)](./AGENTS.md)**, la documentación del proyecto sigue las 7 fases del desarrollo guiado por especificaciones:

* **Fase 1: Glosario de Lenguaje Ubicuo (DDD):** Términos formales del dominio gastronómico (`docs/domain-glossary.md`).
* **Fase 2: Registros de Decisiones de Arquitectura (ADR):** Formato MADR para justificativo técnico de infraestructura (`docs/adr/`).
* **Fase 3: Requisitos de Producto (PRD + EARS):** Requerimientos evolutivos en 6 dimensiones y cláusulas EARS con Gherkin (`docs/`).
* **Fase 4: Modelado de Arquitectura C4:** Representación visual de Contexto y Contenedores en código Mermaid.js (`diagrams/`).
* **Fase 5: Contratos OpenAPI 3.1 & Seguridad OPA:** Especificación API REST y políticas declarativas Rego (`specs/`).
* **Fase 6: Runbooks Operacionales:** Guías ejecutables con Runme.dev (`docs/runbooks/`).
* **Fase 7: Puerta de Calidad Spec Gate:** Empaquetado e integración de Pull Requests como Centro de Discusión en GitHub.

---

## Estructura del Repositorio

```text
RestoCore-Docs/
├── .agents/
│   ├── knowledge/           # Base de Conocimiento y Playbook de Ingeniería & Operaciones
│   │   ├── Guía Playbook Ingeniería y Operaciones.md
│   │   └── Skills en Antigravity para .agent.md
│   └── skills/              # Habilidades ejecutables por demanda (Comandos Slash)
│       ├── adr/SKILL.md     # Habilidad /adr (dotnet-adr / MADR)
│       ├── prd/SKILL.md     # Habilidad /prd (SDD 6 dimensiones + Gherkin)
│       ├── ears/SKILL.md    # Habilidad /ears (Sintaxis EARS)
│       ├── api/SKILL.md     # Habilidad /api (OpenAPI 3.1 API-First)
│       ├── pr/SKILL.md      # Habilidad /pr (Spec Gate & Git)
│       ├── c4/SKILL.md      # Habilidad /c4 (Diagramas C4 Mermaid)
│       ├── runbook/SKILL.md # Habilidad /runbook (Runme.dev)
│       ├── sec/SKILL.md     # Habilidad /sec (Security-as-Code OPA)
│       └── domain/SKILL.md  # Habilidad /domain (Lenguaje Ubicuo DDD)
├── AGENTS.md                # Directrices de gobernanza y normas operativas para Agentes IA
├── SKILLS.md                # Guía de arquitectura de habilidades e integración Antigravity
├── README.md                # Índice general y arquitectura del sistema
├── docs/                    # Documentos PRD, Runbooks y Elicitaciones EARS
│   ├── adr/                 # Architectural Decision Records (MADR)
│   ├── domain-glossary.md   # Glosario de Lenguaje Ubicuo (DDD)
│   └── sdd-workflow.md      # Flujo de Trabajo Homologado SDD (7 Fases)
├── specs/                   # Contratos de API REST y Políticas Rego
└── diagrams/                # Diagramas C4 y de secuencia en Mermaid.js
```

---

## 🤝 Gobernanza y Contribución

Para conocer el rol del **Guardián de la Especificación**, los límites operativos y las reglas de redacción pasivas y proactivas, consulte el archivo **[AGENTS.md](./AGENTS.md)**.