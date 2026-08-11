# ADR-0002: Separación de Repositorios con Especificaciones Centralizadas

## Status

* **Status:** Accepted
* **Deciders:** Equipo de Arquitectura RestoCore / Guardián de la Especificación
* **Date:** 2026-08-09

---

## Contexto y Planteamiento del Problema

El desarrollo del proyecto RestoCore involucra dos frentes tecnológicos claramente diferenciados: una aplicación cliente de alto rendimiento y diseño responsivo para la carta digital (Frontend) y una API de servicios basada en MongoDB y SeaweedFS (Backend).

El equipo debe decidir cómo organizar el almacenamiento del código fuente y la documentación de contratos: ¿un monorepositorio monolítico o repositorios separados coordinados mediante un repositorio central de especificaciones?

---

## Fuerzas Impulsoras de la Decisión

* **Independencia de Despliegue:** Permitir que el Frontend y el Backend se desplieguen y escalen de manera autónoma en pipelines CI/CD independientes.
* **Aislamiento de Tecnologías:** Evitar la mezcla de dependencias, scripts de construcción y herramientas de linting entre frentes de desarrollo.
* **Coordinación Transparente:** Disponer de un punto neutral (`RestoCore-Docs`) que sirva de frontera y contrato entre los programadores.

---

## Opciones Consideradas

1. **Opción 1: Tres Repositorios Separados (Frontend, Backend y Specs Centralizado) (Seleccionada)**
   * Se mantienen repositorios aislados para la aplicación cliente (`resto-core-front`) y para los microservicios/API (`resto-core-back`). El repositorio actual (`RestoCore-Docs`) actúa como el núcleo agnóstico de especificaciones, contratos OpenAPI y ADRs.
2. **Opción 2: Monorepositorio Único**
   * Almacenar Frontend, Backend y Documentación en un solo repositorio de Git.

---

## Resultado de la Decisión

**Opción elegida:** "Opción 1: Tres Repositorios Separados", porque proporciona independencia total de ciclos de lanzamiento y despliegue para Frontend y Backend, garantizando que ambos equipos se integren exclusivamente a través de las especificaciones versionadas de este repositorio.

### Consecuencias Positivas

* **Despliegues Autónomos:** Cambios visuales en la carta QR no requieren compilar ni redesplegar los servicios de backend.
* **Integración Limpia:** La única dependencia entre repositorios es el contrato REST OpenAPI 3.1 publicado en `RestoCore-Docs`.
* **Claridad en Responsabilidades:** Los límites de código fuente quedan estrictamente acotados, prohibiendo la generación de código fuente en `RestoCore-Docs` (regla de exclusividad documental).

### Consecuencias Negativas / Desafíos

* **Gestión de Múltiples Repositorios:** Se debe coordinar el versionado semántico de los contratos de la API al publicar cambios destructivos.

---

## Comparativa de Opciones Evaluadas

### Opción 1: Tres Repositorios Separados
* **Ventajas:** 
  * Pipelines de CI/CD más rápidos y livianos.
  * Desacoplamiento total de arquitecturas y dependencias.
* **Desventajas:** 
  * Requiere mantener el versionado de especificaciones en un repositorio dedicado.

### Opción 2: Monorepositorio Único
* **Ventajas:** 
  * Todo el código y documentación están en una misma ruta.
* **Desventajas:** 
  * Recompilaciones y ejecuciones de tests más pesadas.
  * Riesgo de acoplamiento no deseado entre componentes de interfaz y lógica de persistencia.

---

## Enlaces

* **Decisión Previa:** [`ADR-0001: Adopción de Spec-Driven Development (SDD) y Docs-as-Code`](./0001-adopcion-de-spec-driven-development-sdd-y-docs-as-code.md)
* **Gobernanza:** [`AGENTS.md`](../../AGENTS.md)
