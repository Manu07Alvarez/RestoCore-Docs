---
id: 0003-migracion-postgresql
title: ADR-0003 Selección de PostgreSQL JSONB
---

# ADR-0003: Selección de PostgreSQL con JSONB para Persistencia Semiestructurada

* **Estado:** Aceptado
* **Fecha:** 2026-08-11

---

## Contexto
Migración desde MongoDB para optimizar el consumo de memoria RAM y eliminar contenedores extras de base de datos.

---

## Decisión
Usar **PostgreSQL** como base de datos principal aprovechando columnas `JSONB` e índices `GIN` para almacenar categorías, platos y modificadores con esquemas flexibles.
