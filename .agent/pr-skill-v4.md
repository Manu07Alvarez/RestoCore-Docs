---
name: pr
description: Automatiza la creacion de Pull Requests (PRs) aplicando un aislamiento inteligente de responsabilidades entre cambios de arquitectura (ADRs) y cambios de requisitos funcionales (PRDs, EARS, OpenAPI). Se activa con el comando /pr o al consolidar cambios.
---

# Habilidad de Agente Antigravity: Gestion y Aislamiento de Pull Requests (/pr)

Esta habilidad capacita al agente de IA para actuar como el facilitador de la integracion continua en Git, estructurando y validando de manera inteligente cada propuesta de cambio en el repositorio de especificaciones antes de su revision humana.

## Estrategia de Dialogo Interactivo y Revelacion Progresiva (Obligatorio)

El agente asistira al usuario para estructurar una integracion limpia en Git:

### 1. Invocacion Vacia o Sin Parametros Suficientes (ej. `/pr`)
* **Accion del Agente:** Analizara de forma proactiva el area de preparacion (staging) o los cambios de la sesion. No generara ningun comando de Git de inmediato. Propondra un titulo representativo para la rama y el PR.
* **Preguntas de Inicio:** Realizara exactamente dos preguntas dirigidas:
  1. ¿Cual es la motivacion principal de negocio detras de las especificaciones y modificaciones realizadas en esta sesion?
  2. ¿Deseas vincular este Pull Request con algun issue o tarjeta de requerimientos previa?

### 2. Deteccion de Cambios y Aislamiento Inteligente (Regla Critica)
* **Caso A: Modificaciones en `/doc/adr/` y `/docs/` o `/specs/` de forma simultanea:**
  - El agente detendra el proceso de empaquetado unificado. Explicara al usuario que, para mantener la trazabilidad arquitectonica y reducir la sobrecarga cognitiva en la revision, las Decisiones de Arquitectura (ADR) deben viajar en un PR independiente de los requisitos de producto.
  - El agente guiara al usuario para aislar el ADR primero, proporcionando los comandos para crear una rama especifica (ej. `arch/adr-0003-postgres`) y empaquetar ese documento por separado. Una vez resuelto, procedera a empaquetar los cambios funcionales.
* **Caso B: Cambios solo en Requisitos Funcionales (`/docs/` y `/specs/`):**
  - El agente agrupara de forma natural el PRD, las clausulas EARS y el contrato OpenAPI asociados en un solo Pull Request funcional, garantizando que el contrato de integracion viaje completo y consistente.

## Estructura del Pull Request de Especificaciones

El agente redactara la descripcion del PR en Markdown con las siguientes secciones:

1. **📝 Resumen del Cambio:** Descripcion tecnica y clara del problema resuelto y la especificacion que se integra.
2. **🎯 Tipo de Cambio:** Clasificacion (ADR, PRD, EARS o OpenAPI).
3. **🏗️ Alineacion con las Restricciones (AGENTS.md):** Matriz de validacion de cumplimiento de las restricciones del sistema (REST, SeaweedFS, MongoDB/PostgreSQL flexible, CDN caching).
4. **🚦 Tareas de Desarrollo Desbloqueadas (Flujo Paralelo):** Desglose atómico y libre de dependencias de las tareas que debe implementar el Frontend y el Backend en sus respectivos repositorios locales.

## Restricciones Inviolables de Operacion
* El agente tiene prohibido proponer o realizar fusiones (merges) automaticas directas a la rama principal (main) sin revision humana.
* El desglose de tareas tecnicas para el Frontend y Backend debe derivarse directamente de los requisitos validados en los archivos que se estan integrando.
