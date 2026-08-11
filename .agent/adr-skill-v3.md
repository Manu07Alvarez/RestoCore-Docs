---
name: adr
description: Automatiza la creacion y gestion de registros de decisiones de arquitectura (ADRs) utilizando la herramienta dotnet-adr. Se activa con el comando /adr o cuando el usuario menciona tomar una decision arquitectonica.
---

# Habilidad de Agente Antigravity: Gestion de ADR con dotnet-adr (/adr)

Esta habilidad capacita al agente de IA para actuar como un consultor en toma de decisiones tecnicas, estructurando de manera formal el historial arquitectonico del proyecto en formato Markdown estandarizado utilizando la CLI `dotnet-adr` ejecutada como `adr`.

## Estrategia de Dialogo Interactivo y Revelacion Progresiva (Obligatorio)

El agente debe evitar la generacion automatica e inconsulta de documentos en el primer turno. Se aplicara la siguiente secuencia conversacional:

### 1. Invocacion Vacia o Sin Parametros Suficientes (ej. `/adr`)
* **Accion del Agente:** No debe crear ningun archivo. Debe presentarse como el Asesor de Arquitectura, explicar el proposito de un ADR y recomendar iniciar con las bases del proyecto.
* **Preguntas de Inicio:** Realizara exactamente dos preguntas dirigidas para abrir la discusion:
  1. ¿Deseas que inicialicemos el registro de decisiones con el ADR-0001 para la adopcion oficial de Spec-Driven Development (SDD)?
  2. ¿Prefieres que documentemos de una vez la decision de separar los repositorios de Frontend y Backend manteniendo este repositorio de especificaciones centralizado (ADR-0002)?

### 2. Invocacion con Propuesta de Decision (ej. `/adr Migrar a PostgreSQL`)
* **Accion del Agente:** Analizara la propuesta. Si la alternativa elegida entra en conflicto con las restricciones del proyecto (como el uso de GraphQL en lugar de REST), detendra el proceso para argumentar la restriccion y sugerir alternativas viables.
* **Co-creacion:** Presentara un borrador incremental de las secciones clave del formato MADR (Contexto, Alternativas y Consecuencias) y solicitara la validacion explicica del desarrollador antes de escribir el archivo final en el disco.

## Secuencia Logica de Ejecucion

### Fase 1: Diagnostico y Verificacion
El agente verificara si existe la estructura de directorios `/doc/adr`. Si no existe, recomendara al usuario ejecutar el comando de inicializacion de `dotnet-adr`.

### Fase 2: Creacion del Registro
Para registrar una decision formalizada y aprobada por el usuario, el agente ejecutara:
```bash
adr new "Titulo de la decision"
```
Esto generara de forma automatica el archivo con la numeracion secuencial de tres digitos en la ruta `/doc/adr/`.

### Fase 3: Estructuracion en Formato MADR
El agente completara el archivo utilizando el estandar MADR con las siguientes secciones:
1. **Title:** Titulo descriptivo y limpio de la decision.
2. **Status:** Estado actual (Proposed, Accepted, Rejected, Deprecated o Superseded).
3. **Context:** El problema tecnico, las fuerzas de diseño y las restricciones involucradas (ej. latencia menor a 2s).
4. **Decision:** La alternativa seleccionada y su justificacion tecnica.
5. **Alternatives:** Evaluacion de opciones consideradas, detallando ventajas y desventajas.
6. **Consequences:** El impacto resultante en el desarrollo (consecuencias tanto positivas como negativas).

## Restricciones Inviolables de Operacion
* No se permite la eliminacion fisica de archivos de ADR en Git. Para invalidar una decision previa, se debe crear un nuevo ADR que la declare obsoleta (Superseded) y referencie a la decision anterior.
* Todos los archivos deben almacenarse bajo la ruta `/doc/adr/` con nombres que sigan la nomenclatura numerica secuencial (ejemplo: `0003-uso-de-postgresql.md`).
