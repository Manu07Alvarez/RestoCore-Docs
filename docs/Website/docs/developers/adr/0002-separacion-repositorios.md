---
id: 0002-separacion-repositorios
title: ADR-0002 Separación de Repositorios
---

# ADR-0002: Separación de Repositorios con Especificaciones Centralizadas

* **Estado:** Aceptado
* **Fecha:** 2026-08-11

---

## Contexto
El código fuente de la plataforma se dividió en repositorios independientes para maximizar el desacoplamiento.

---

## Decisión
Se establecen 3 repositorios:
1. `RestoCore-Docs`: Especificaciones, PRDs, ADRs, contratos OpenAPI y modelos C4.
2. `resto-core-front`: Cliente web/móvil.
3. `resto-core-back`: Backend de microservicios API REST.
