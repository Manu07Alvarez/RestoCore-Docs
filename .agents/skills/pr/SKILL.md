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

## 🏗️ Estructura del Pull Request de Especificaciones

El agente redactará la descripción del PR en Markdown con el siguiente formato:

1. **Resumen del Cambio:** Descripción técnica clara del problema y las especificaciones que se integran.
2. **Tipo de Cambio:** Clasificación (*ADR, PRD, EARS, OpenAPI*).
3. **Matriz de Alineación con Restricciones (AGENTS.md):** Verificación de cumplimiento de REST API, latencia < 2s LCP, PostgreSQL JSONB y SeaweedFS.
4. **Tareas de Desarrollo Desbloqueadas:** Desglose atómico de las tareas que el desarrollador Frontend y Backend implementarán de forma paralela en sus respectivos repositorios.

---

## 🚫 Restricciones Inviolables de Operación
* Queda prohibido realizar fusiones (*merges*) automáticas a la rama principal (`main`) sin revisión humana.
* El desglose de tareas debe derivarse estrictamente de las especificaciones validadas.
