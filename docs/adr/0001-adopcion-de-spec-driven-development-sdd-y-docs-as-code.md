# ADR-0001: Adopción de Spec-Driven Development (SDD) y Docs-as-Code

## Status

* **Status:** Accepted
* **Deciders:** Equipo de Arquitectura RestoCore / Guardián de la Especificación
* **Date:** 2026-08-09

---

## Contexto y Planteamiento del Problema

El ecosistema de desarrollo de RestoCore requiere la construcción en paralelo de aplicaciones públicas (Menú QR para clientes en dispositivos móviles), paneles administrativos y servicios de backend. Sin una única fuente de verdad formalizada y auditable, existe un riesgo elevado de desalineación entre el programador Frontend y el programador Backend, acoplamiento no deseado, desviaciones de alcance (*scope creep*) y erosión de la arquitectura.

¿Cómo garantizar que todo el equipo trabaje en perfecta sintonía sin bloqueos mutuos y con contratos de integración estables?

---

## Fuerzas Impulsoras de la Decisión

* **Desarrollo en Paralelo:** Necesidad de que Frontend y Backend avancen de forma asíncrona mediante mocks estables basados en contratos OpenAPI.
* **Control de Alcance:** Evitar la expansión no planificada de funcionalidades durante la etapa de codificación.
* **Auditoría e Historial:** Mantener la documentación técnica y las decisiones con el mismo rigor y versionado que el código de producción.
* **Inviolables de Arquitectura:** Asegurar el cumplimiento estricto del presupuesto de latencia (< 2s LCP en móviles), el uso de REST API, MongoDB y la carga asíncrona de imágenes en SeaweedFS.

---

## Opciones Consideradas

1. **Opción 1: Spec-Driven Development (SDD) y Docs-as-Code (Seleccionada)**
   * Toda funcionalidad se especifica primero en este repositorio dedicado (`RestoCore-Docs`) mediante PRDs estructurados en 6 dimensiones, sintaxis EARS, contratos OpenAPI 3.1 y ADRs. Ninguna línea de código de aplicación se escribe sin una especificación previa aprobada.
2. **Opción 2: Documentación Ad-hoc y Desarrollo Basado en Código (Code-First)**
   * Iniciar la codificación de Frontend y Backend directamente, escribiendo documentación informal en wikis o notas de desarrollo según avance el proyecto.

---

## Resultado de la Decisión

**Opción elegida:** "Opción 1: Spec-Driven Development (SDD) y Docs-as-Code", porque establece este repositorio como la única fuente inmutable de verdad funcional y técnica del ecosistema RestoCore, eliminando bloqueos de integración y previniendo deuda técnica.

### Consecuencias Positivas

* **Desbloqueo Inmediato del Frontend:** El desarrollador Frontend puede generar mocks estables en cuanto se publica un contrato OpenAPI en `specs/openapi.yaml`.
* **Cero Ambigüedad en Requerimientos:** Los criterios de verificación se redactan bajo patrones formales EARS (*Ubiquitous, Event-Driven, State-Driven, Unwanted Behavior, Optional*).
* **Trazabilidad Total:** Todo cambio técnico o de alcance requiere un commit o un ADR formal dentro de este repositorio.

### Consecuencias Negativas / Desafíos

* **Disciplina Inicial:** Se requiere invertir tiempo en la fase previa de diseño y especificación antes de iniciar la codificación.
* **Mantenimiento Continuo:** Toda modificación de la API o del dominio exige actualizar la especificación primero (*Specs-First*).

---

## Comparativa de Opciones Evaluadas

### Opción 1: Spec-Driven Development (SDD) y Docs-as-Code
* **Ventajas:** 
  * Contratos legibles por máquinas y programadores.
  * Automatización de validaciones de API y mock servers.
  * Protección total contra desviaciones de alcance.
* **Desventajas:** 
  * Requiere un pequeño costo de aprendizaje metodológico inicial.

### Opción 2: Code-First y Documentación Ad-hoc
* **Ventajas:** 
  * Inicio de codificación inmediato sin barrera metodológica previa.
* **Desventajas:** 
  * Inconsistencias frecuentes entre la implementación Frontend y Backend.
  * Inposibilidad de garantizar el presupuesto de latencia (< 2s LCP) o el desacoplamiento de almacenamiento de imágenes.
  * Pérdida del historial de decisiones técnicas.

---

## Enlaces

* **Directrices de Gobernanza:** [`AGENTS.md`](../../AGENTS.md)
* **Guía de Habilidades:** [`SKILLS-v3.md`](../../SKILLS-v3.md)
* **Próxima Decisión:** [`ADR-0002: Separación de Repositorios con Especificaciones Centralizadas`](./0002-separacion-de-repositorios-con-especificaciones-centralizadas.md)
