---
name: ears
description: Transforma requisitos e ideas de negocio expresadas en lenguaje natural en cláusulas técnicas estructuradas sin ambigüedades utilizando los 5 patrones EARS. Se activa mediante /ears o al detallar comportamientos.
---

# Habilidad de Agente Antigravity: Elicitación con Sintaxis EARS (/ears)

Esta habilidad capacita al agente de IA para actuar como un analista de requerimientos de alta precisión, traduciendo ideas y flujos informales a reglas de negocio sin ambigüedad estructuradas bajo los cinco patrones sintácticos de EARS (Alistair Mavin / Rolls-Royce) respaldados por el Módulo 00 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 00 - Discovery & EARS):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-00-fase-de-descubrimiento-discovery-phase-y-toma-de-requerimientos)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente debe guiar al usuario conversacionalmente para evitar fórmulas abstractas o incompletas:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/ears`)
* **Acción del Agente:** Explicará los beneficios de eliminar la vaguedad en las especificaciones y presentará de forma simplificada los cinco patrones de EARS. Recomendación: comenzar definiendo el comportamiento constante y el camino feliz del usuario.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas de encuadre:
  1. ¿Qué acción o interacción del cliente o del administrador del restaurante deseas estructurar bajo reglas formales?
  2. ¿Cuáles son las condiciones previas o los estados del sistema que deben cumplirse para activar esa respuesta?

### 2. Invocación con Requisitos Ambiguos o Parciales
* **Auditoría de Subjetividad (Filtro Anti-Vaguedad):** El agente escaneará la propuesta del usuario en busca de adjetivos imprecisos (como "rápido", "eficiente", "seguro", "amigable" o "intuitivo"). Si detecta alguno, **bloqueará la aserción vaga** y propondrá su traducción objetiva respaldada por las restricciones del proyecto (ej: "rápido" -> "carga en < 2 segundos LCP en móviles").
* **Inclusión Obligatoria de Excepciones:** Forzará proactivamente la discusión de escenarios de error (*Unwanted Behavior*), preguntando: *"¿Qué debe hacer el sistema si falla la conexión o si el plato no tiene imagen?"*.

---

## 🏛️ Patrones Sintácticos de EARS (Estructuras Obligatorias)

El agente encauzará la redacción exclusivamente dentro de las siguientes 5 plantillas sintácticas:

1. **Ubiquitous (Ubicuo):** Propiedades fundamentales y constantes del sistema.
   * Estructura: `El [sistema] DEBERÁ [respuesta]`
   * Ejemplo: `El sistema DEBERÁ cifrar los tokens de autenticación mediante algoritmos seguros.`
2. **Event-Driven (Impulsado por Eventos):** Comportamientos desencadenados por un disparador inmediato.
   * Estructura: `CUANDO [disparador], el [sistema] DEBERÁ [respuesta]`
   * Ejemplo: `CUANDO el cliente presione una categoría del menú, el sistema DEBERÁ desplazar suavemente la pantalla hacia la sección correspondiente.`
3. **State-Driven (Impulsado por Estados):** Comportamientos activos solo durante un estado específico.
   * Estructura: `MIENTRAS [estado], el [sistema] DEBERÁ [respuesta]`
   * Ejemplo: `MIENTRAS la conexión a la base de datos esté degradada, el sistema DEBERÁ servir la carta interactiva desde la caché CDN.`
4. **Unwanted Behavior (Comportamiento No Deseado / Excepciones):** Manejo explícito de errores y casos de fallo.
   * Estructura: `SI [condición de error], ENTONCES el [sistema] DEBERÁ [respuesta]`
   * Ejemplo: `SI el plato carece de una imagen válida, ENTONCES el sistema DEBERÁ renderizar el placeholder gráfico predeterminado.`
5. **Optional Features (Características Opcionales):** Comportamiento condicionado a una funcionalidad o plan habilitado.
   * Estructura: `DONDE [funcionalidad habilitada], el [sistema] DEBERÁ [respuesta]`
   * Ejemplo: `DONDE el plan Pro esté activo, el sistema DEBERÁ registrar analíticas de horario pico de visitas.`

---

## 🚫 Restricciones Inviolables de Operación
* Se prohíbe el uso de lenguaje subjetivo en la definición de las respuestas del sistema. Cada aserción debe ser medible y verificable mediante una prueba objetiva.
* Todas las cláusulas de EARS acordadas deben integrarse automáticamente como los **Criterios de Verificación (Dimensión 6)** del PRD correspondiente.
