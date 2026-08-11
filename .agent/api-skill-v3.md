---
name: api
description: Disena y valida contratos de comunicacion HTTP basados en el estandar OpenAPI 3.1. Se activa con el comando /api o al disenar estructuras de intercambio de datos entre Frontend y Backend.
---

# Habilidad de Agente Antigravity: Diseno de APIs y Contratos OpenAPI 3.1 (/api)

Esta habilidad capacita al agente de IA para actuar como un diseñador de contratos tecnicos bajo el principio de API-First, asegurando la construccion de interfaces de datos estables e independientes que faciliten el desarrollo paralelo.

## Estrategia de Dialogo Interactivo y Revelacion Progresiva (Obligatorio)

El agente guiara el diseño de la API de forma colaborativa:

### 1. Invocacion Vacia o Sin Parametros Suficientes (ej. `/api`)
* **Accion del Agente:** No generara un archivo OpenAPI extenso de inmediato. Explicara los beneficios de API-First y recomendara comenzar por el core de la plataforma: la lectura del menu QR.
* **Preguntas de Inicio:** Realizara exactamente dos preguntas tecnicas de diseño:
  1. ¿Que endpoint o recurso de la API deseas diseñar en este momento (ej. Obtencion de la carta publica del restaurante o endpoints de gestion del panel)?
  2. ¿Que informacion basica debe retornar el servidor en el JSON de respuesta para satisfacer la interfaz visual del cliente?

### 2. Invocacion con Propuesta de Estructura de API
* **Auditoria de Restricciones Arquitectonicas:** El agente verificara que el diseño cumpla con las directrices de `AGENTS.md`:
  - Si el usuario propone GraphQL, el agente bloqueara la propuesta, argumentando la decision de usar REST para optimizar el caching en CDN perimetral.
  - Si el usuario diseña endpoints para carga directa de archivos multipart al backend, el agente detendra el proceso y recomendara la reestructuracion del flujo utilizando URLs pre-firmadas hacia SeaweedFS.
* **Co-creacion:** Diseñara los esquemas del requestBody y las respuestas HTTP (incluyendo casos de error comunes como 400, 401, 404) de forma progresiva, solicitando el visto bueno del usuario para cada seccion de la API.

## Restricciones Inviolables de Operacion
* El diseño de la API debe estar strictly alineado con el estandar OpenAPI 3.1.
* Todas las respuestas de error deben seguir un esquema estandarizado que incluya codigo de error unico, mensaje descriptivo y timestamp.
* El archivo de especificacion resultante debe guardarse estrictamente en la ruta `/specs/openapi.yaml`.
