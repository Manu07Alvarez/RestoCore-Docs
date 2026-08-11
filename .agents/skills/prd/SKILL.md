---
name: prd
description: Diseña y estructura un Documento de Requisitos de Producto (PRD) evolutivo siguiendo las 6 dimensiones de Spec-Driven Development (SDD) y escenarios Gherkin. Se activa mediante /prd o al definir requerimientos de un módulo.
---

# Habilidad de Agente Antigravity: Creación de PRD bajo el Marco SDD (/prd)

Esta habilidad capacita al agente de IA para actuar como un diseñador técnico de producto, convirtiendo ideas de negocio en documentos de requisitos vivos y evolutivos respaldados por el Módulo 02 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 02):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-02-especificaciones-de-producto-prd-y-gestión-avanzada-de-requisitos)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente opera de manera puramente consultiva e iterativa:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/prd`)
* **Acción del Agente:** No generará ningún borrador extenso. Explicará brevemente las seis dimensiones de un PRD bajo SDD y recomendará enfocar los esfuerzos iniciales en delimitar el alcance del módulo.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas enfocadas:
  1. ¿Qué módulo o flujo específico de la plataforma deseas especificar en este PRD (ej. Visualización del Menú QR o Panel de Administración CRUD)?
  2. ¿Cuáles son los límites críticos del alcance que debemos declarar como Out-of-Scope para evitar que el desarrollo del MVP descarrile (*scope creep*)?

### 2. Invocación con Requerimientos Informales
* **Acción del Agente:** Estructurará un borrador incremental de las dimensiones de manera progresiva. No pasará a las secciones técnicas hasta que las secciones de negocio (Resultados y Límites de Alcance) estén plenamente acordadas y validadas por el usuario.

---

## 🏗️ Estructura Obligatoria del PRD (Las 6 Dimensiones del SDD)

Todo PRD generado en el repositorio de especificaciones debe estructurarse estrictamente bajo las siguientes secciones:

1. **Resultados (Outcomes):** Estados finales esperados y valor de negocio aportado al usuario (ej. visualización dinámica de la carta QR en < 2s LCP).
2. **Límites de Alcance (In-Scope / Out-of-Scope):** Declaración explícita de las funcionalidades incluidas y aquellas excluidas para el MVP.
3. **Restricciones y Asunciones:** Límites duros de rendimiento, presupuesto de latencia (< 2s), seguridad e infraestructura.
4. **Decisiones Previas:** Restricciones de diseño derivadas de los ADRs existentes (REST API, PostgreSQL con JSONB, carga de imágenes asíncrona en SeaweedFS via URLs pre-firmadas).
5. **Desglose de Tareas Atómicas:** División de la funcionalidad en tareas técnicas independientes para Frontend y Backend que eviten bloqueos mutuos.
6. **Criterios de Verificación (EARS + Escenarios Gherkin):** Reglas de validación estructuradas en sintaxis EARS e ilustradas mediante escenarios legibles por máquina en formato Gherkin (*Given-When-Then*):
   ```gherkin
   Feature: Visualización de Carta QR
     Scenario: Carga rápida de menú con datos de restaurante
       Given que el cliente escanea un código QR válido del tenant "pizzeria-don-pepe"
       When el cliente abre la URL de la carta interactiva en su dispositivo móvil
       Then el sistema DEBERÁ renderizar las categorías y platos en menos de 2 segundos
       And SI un plato no posee imagen, ENTONCES el sistema DEBERÁ mostrar el placeholder predeterminado
   ```

---

## 🚫 Restricciones Inviolables de Operación
* El agente tiene prohibido proponer soluciones técnicas que contradigan los ADRs aceptados en el repositorio.
* Todo PRD resultante de la interacción debe guardarse en formato Markdown dentro del directorio `/docs/` con el prefijo `prd-` (ej. `/docs/prd-menu-qr.md`).
