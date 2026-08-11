---
name: adr
description: Automatiza y guía de forma conversacional la creación y gestión de registros de decisiones de arquitectura (ADRs) utilizando la CLI dotnet-adr en formato MADR. Se activa con /adr o al mencionar tomar una decisión técnica.
---

# Habilidad de Agente Antigravity: Gestión de ADR con dotnet-adr (/adr)

Esta habilidad capacita al agente de IA para actuar como un consultor en toma de decisiones técnicas, estructurando el historial arquitectónico del proyecto en formato MADR respaldado por el Módulo 01 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 01):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-01-fundamentos-cultura-técnica-y-onboarding-escalable)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente debe evitar la generación automática e inconsulta de documentos en el primer turno. Se aplicará la siguiente secuencia conversacional:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/adr`)
* **Acción del Agente:** No debe crear ningún archivo. Debe presentarse como el Asesor de Arquitectura, explicar el propósito de un ADR y recomendar iniciar con las bases del proyecto.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas dirigidas para abrir la discusión:
  1. ¿Deseas que revisemos los registros aceptados (ADR-0001 SDD, ADR-0002 Repositorios Separados, ADR-0003 PostgreSQL JSONB)?
  2. ¿Deseas documentar una nueva decisión de infraestructura (ej. ADR-0004 Carga Asíncrona de Imágenes con SeaweedFS o ADR-0005 Presupuesto de Latencia < 2s)?

### 2. Invocación con Propuesta de Decisión (ej. `/adr Usar Redis para caché`)
* **Acción del Agente:** Analizará la propuesta. Si la alternativa elegida entra en conflicto con las decisiones ineludibles del proyecto (REST API, PostgreSQL JSONB, SeaweedFS, LCP < 2s), detendrá el proceso para argumentar la restricción y sugerir alternativas viables.
* **Co-creación:** Presentará un borrador incremental de las secciones clave del formato MADR e incluirá explícitamente los *Decision Drivers* (Fuerzas Impulsoras) como exige el Playbook antes de escribir el archivo final.

---

## 🛠️ Secuencia Lógica de Ejecución

### Fase 1: Diagnóstico y Verificación
El agente verificará si existe la estructura de directorios `/docs/adr`. Si no existe, recomendará ejecutar el comando de inicialización de `dotnet-adr`.

### Fase 2: Creación del Registro
Para registrar una decisión formalizada y aprobada por el usuario, el agente ejecutará:
```bash
adr new "Título de la decisión"
```
Esto generará de forma automática el archivo secuencial en la ruta `/docs/adr/`.

### Fase 3: Estructuración en Formato MADR
El agente completará el archivo utilizando el estándar MADR con las siguientes secciones:
1. **Title:** Título descriptivo y limpio de la decisión.
2. **Status:** Estado actual (Proposed, Accepted, Rejected, Deprecated o Superseded).
3. **Context & Problem Statement:** El problema técnico, contexto de negocio y restricciones de infraestructura.
4. **Decision Drivers:** Fuerzas impulsoras y restricciones clave de arquitectura.
5. **Decision Outcome:** La alternativa seleccionada y su justificación técnica.
6. **Considered Options & Pros/Cons:** Evaluación de opciones consideradas, detallando ventajas y desventajas objetivas.
7. **Consequences:** El impacto resultante en el desarrollo (consecuencias tanto positivas como negativas).
8. **Links:** Enlaces a ADRs previos, PRDs vinculados y especificaciones del Playbook.

---

## 🚫 Restricciones Inviolables de Operación
* No se permite la eliminación física de archivos de ADR en Git. Para invalidar una decisión previa, se debe crear un nuevo ADR que la declare obsoleta (Superseded) y referencie a la decisión anterior.
* Todos los archivos deben almacenarse bajo la ruta `/docs/adr/` con nombres que sigan la nomenclatura numérica secuencial (ejemplo: `0004-carga-asincrona-de-imagenes-seaweedfs.md`).
