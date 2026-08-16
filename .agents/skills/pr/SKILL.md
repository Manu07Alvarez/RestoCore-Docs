---
name: pr
description: Automatiza la creación y validación de Pull Requests (PRs) aplicando aislamiento de responsabilidades y validación Spec Gate. Se activa mediante /pr o al consolidar cambios.
---

# Habilidad de Agente Antigravity: Gestión y Aislamiento de Pull Requests (/pr)

Esta habilidad capacita al agente de IA para actuar como el facilitador de la integración continua en Git respaldado por el Módulo 06 del Playbook de Ingeniería (*Spec Gate* & *Trunk-Based Development*).

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 06 - Git & Code Reviews):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-06-flujo-de-trabajo-git-y-code-reviews)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente asistirá al usuario para estructurar una integración limpia en Git:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/pr`)
* **Acción del Agente:** Analizará de forma proactiva los cambios staged o modificados en la sesión. No ejecutará ninguna acción de Git de inmediato. Propondrá un título representativo para la rama y el PR.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas dirigidas:
  1. ¿Cuál es el objetivo o historia de usuario que motivó las especificaciones modificadas en esta sesión?
  2. ¿Deseas vincular este PR a algún issue o tarjeta de requerimientos previa?

### 2. Detección de Cambios y Aislamiento Inteligente (*Spec Gate*)
* **Regla A (Separación de ADRs):** Si existen cambios en `/docs/adr/` junto con archivos en `/docs/` o `/specs/`, el agente detendrá el proceso y exigirá aislar el ADR en un PR arquitectónico independiente (ej. `arch/adr-0004-seaweedfs`).
* **Regla B (Commits Formales):** Exigir que los mensajes de commit sigan *Conventional Commits* e incluyan la referencia a la especificación: `feat(api): add public menu endpoint, refs docs/prd-menu-qr.md`.

---

## Estructura Obligatoria del Pull Request (Centro de Discusión)

Cada descripción de Pull Request generada por el agente debe funcionar como un **Centro de Discusión** exhaustivo para evaluar su aceptación o rechazo técnico. La descripción en Markdown responderá estrictamente al siguiente esquema sobrio y formal (sin emojis):

1. **Contexto de Negocio y Planteamiento del Problema:** Explicación técnica profunda del problema o requerimiento que motiva el cambio, antecedentes e impacto en la arquitectura.
2. **Descripción Detallada de la Propuesta:** Detalle de los archivos integrados o modificados, especificando el comportamiento esperado.
3. **Matriz de Alineación con Inviolables de Arquitectura (AGENTS.md):** Tabla de verificación de cumplimiento de REST API (OpenAPI 3.1), latencia < 2s LCP, PostgreSQL con JSONB e índices GIN, y carga asíncrona de imágenes en SeaweedFS.
4. **Alternativas Evaluadas y Análisis de Impacto (Pros & Cons):** Comparativa objetiva de opciones consideradas, ventajas, desventajas y deuda técnica asumida.
5. **Puntos Críticos de Discusión para Revisión (Aceptación o Rechazo):** Lista de preguntas clave, riesgos o aspectos críticos que el revisor humano debe evaluar para decidir la aprobación o descarte del PR.
6. **Desglose de Tareas Atómicas Desbloqueadas (Desarrollo en Paralelo):** Segmentación independiente de tareas para Frontend (`resto-core-front`) y Backend (`resto-core-back`).
7. **Criterios de Verificación (EARS / Gherkin):** Reglas formales en sintaxis EARS o escenarios *Given-When-Then* para validar la entrega.

---

## Publicación de Ramas y Creación Automatizada de PRs

Una vez creadas las ramas aisladas y confirmados los mensajes de commit:
1. **Envío Remoto:** El agente ejecutará automáticamente `git push -u origin <nombre-de-la-rama>` para publicar cada rama en GitHub.
2. **Generación del PR:** El agente procederá a crear o actualizar el Pull Request en GitHub mediante `gh pr create` / `gh pr edit` pasando la descripción exhaustiva estructurada como Centro de Discusión en el cuerpo del PR.

---

## Restricciones Inviolables de Operación
* Queda prohibido realizar fusiones (*merges*) automáticas a la rama principal (`main`) sin revisión humana.
* El desglose de tareas debe derivarse estrictamente de las especificaciones validadas.
