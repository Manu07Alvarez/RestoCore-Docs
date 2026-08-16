---
name: prd
description: Disena y estructura un Documento de Requisitos de Producto (PRD) evolutivo siguiendo la metodologia de Spec-Driven Development (SDD). Se activa con el comando /prd o cuando el usuario solicita definir requerimientos para un modulo.
---

# Habilidad de Agente Antigravity: Creacion de PRD bajo el Marco SDD (/prd)

Esta habilidad capacita al agente de IA para actuar como un diseñador tecnico de producto, convirtiendo ideas de negocio en documentos de requisitos vivos y evolutivos que sirvan como la unica fuente de verdad para el desarrollo técnico.

## Estrategia de Dialogo Interactivo y Revelacion Progresiva (Obligatorio)

Para asegurar la consistencia y evitar el desperdicio de esfuerzo de diseño, el agente debe operar de manera puramente consultiva:

### 1. Invocacion Vacia o Sin Parametros Suficientes (ej. `/prd`)
* **Accion del Agente:** No generara ningun borrador extenso. Explicara brevemente las seis dimensiones de un PRD bajo SDD y recomendara enfocar los esfuerzos iniciales en delimitar el alcance del modulo.
* **Preguntas de Inicio:** Realizara exactamente dos preguntas enfocadas:
  1. ¿Que modulo o flujo especifico de la plataforma deseas especificar en este PRD (ej. Visualizacion del Menu QR o Panel de Administracion)?
  2. ¿Cuales son los limites criticos del alcance que debemos declarar como Out-of-Scope para evitar que el desarrollo de este MVP se descontrole?

### 2. Invocacion con Requerimientos Informales
* **Accion del Agente:** Estructurara un borrador incremental de las dimensiones de manera progresiva. No pasara a las secciones tecnicas (como tareas atómicas o criterios de verificación) hasta que las secciones de negocio (Resultados y Limites de Alcance) esten plenamente acordadas y validadas por el usuario.

## Estructura Obligatoria del PRD (Las 6 Dimensiones del SDD)

Todo PRD generado en el repositorio de especificaciones debe estructurarse estrictamente bajo las siguientes secciones:

1. **Resultados (Outcomes):** Estados finales esperados y valor de negocio aportado al usuario (ej. visualizacion dinamica de la marca).
2. **Limites de Alcance (In-Scope / Out-of-Scope):** Declaracion explicita de las funcionalidades incluidas y aquellas excluidas para el MVP.
3. **Restricciones y Asunciones:** Limites duros de rendimiento, presupuesto de latencia (< 2s), seguridad e infraestructura.
4. **Decisiones Previas:** Restricciones de diseño derivadas de los ADRs existentes (ej. uso de REST, base de datos Postgres con JSONB, carga de imagenes en SeaweedFS).
5. **Desglose de Tareas Atomicas:** Division de la funcionalidad en tareas tecnicas independientes para Frontend y Backend que eviten bloqueos mutuos.
6. **Criterios de Verificacion:** Reglas de validacion estructuradas en sintaxis EARS que sirvan de base directa para las pruebas de integracion.

## Restricciones Inviolables de Operacion
* El agente tiene prohibido proponer soluciones tecnicas que contradigan los ADRs aceptados en el repositorio.
* Todo PRD resultante de la interaccion debe guardarse en formato Markdown dentro del directorio `/docs/` con el prefijo `prd-` (ej. `/docs/prd-menu-qr.md`).
