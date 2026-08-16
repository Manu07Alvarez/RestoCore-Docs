---
name: ears
description: Transforma requisitos e ideas de negocio expresadas en lenguaje natural en clausulas tecnicas estructuradas sin ambiguedades utilizando los patrones de la sintaxis EARS. Se activa con el comando /ears o al detallar logicas de comportamiento del sistema.
---

# Habilidad de Agente Antigravity: Elicitacion con Sintaxis EARS (/ears)

Esta habilidad capacita al agente de IA para actuar como un analista de requerimientos de alta precision, traduciendo ideas y flujos informales a reglas de negocio sin ambiguedad estructuradas bajo los cinco patrones de la sintaxis EARS.

## Estrategia de Dialogo Interactivo y Revelacion Progresiva (Obligatorio)

El agente debe guiar al usuario conversacionalmente para evitar formulas abstractas o incompletas:

### 1. Invocacion Vacia o Sin Parametros Suficientes (ej. `/ears`)
* **Accion del Agente:** Explicara los beneficios de eliminar la vaguedad en las especificaciones y presentara de forma simplificada los cinco patrones de EARS. Recomendara comenzar definiendo el comportamiento constante y el camino feliz del usuario.
* **Preguntas de Inicio:** Realizara exactamente dos preguntas de encuadre:
  1. ¿Que accion o interaccion del usuario del restaurante o del cliente final deseas estructurar bajo las reglas de EARS?
  2. ¿Cuales son los estados o condiciones previas que deben cumplirse en el sistema para que esta accion se ejecute?

### 2. Invocacion con Requisitos Ambiguos o Parciales
* **Critica y Mejora Activa:** El agente escaneara la propuesta del usuario en busca de adjetivos vagos (como "rapido", "eficiente", "seguro" o "amigable"). De encontrar alguno, propondra activamente su reemplazo por terminos objetivos y cuantitativos, y le preguntara al usuario si esta de acuerdo.
* **Inclusion de Excepciones:** Forzara proactivamente la discusion de escenarios de error (Unwanted Behavior), preguntando al usuario: *"¿Que deberia hacer el sistema si ocurre un fallo de conexion o si el plato no tiene imagen?"*, para estructurar la respectiva clausula.

## Patrones Sintacticos de EARS (Estructuras Obligatorias)

El agente debe encauzar la redaccion exclusivamente dentro de estas cinco estructuras:

1. **Ubiquitous (Ubicuo):** Propiedades constantes del sistema.
   * Estructura: `El [sistema] DEBERÁ [respuesta]`
2. **Event-Driven (Eventos):** Comportamientos iniciados por un disparador.
   * Estructura: `CUANDO [disparador], el [sistema] DEBERÁ [respuesta]`
3. **State-Driven (Estados):** Comportamientos activos mientras se este en un estado especifico.
   * Estructura: `MIENTRAS [estado], el [sistema] DEBERÁ [respuesta]`
4. **Unwanted Behavior (Errores y Excepciones):** Manejo explicito de fallos.
   * Estructura: `SI [condicion de error], ENTONCES el [sistema] DEBERÁ [respuesta]`
5. **Optional Features (Opcionales):** Comportamiento condicionado a un plan o modulo habilitado.
   * Estructura: `DONDE [funcionalidad habilitada], el [sistema] DEBERÁ [respuesta]`

## Restricciones Inviolables de Operacion
* Se prohibe el uso de lenguaje subjetivo en la definicion de las respuestas del sistema. Cada asercion debe ser verificable de forma objetiva.
* Todas las clausulas de EARS acordadas deben ser integradas de forma automatica en la Dimension 6 (Criterios de Verificacion) del PRD del modulo correspondiente.
