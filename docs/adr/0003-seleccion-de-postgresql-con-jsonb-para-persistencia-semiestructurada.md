# ADR-0003: Selección de PostgreSQL con JSONB para Persistencia Semiestructurada y Optimización de Recursos

## Status

* **Status:** Accepted
* **Deciders:** Equipo de Arquitectura RestoCore / Guardián de la Especificación
* **Date:** 2026-08-10

---

## Contexto y Planteamiento del Problema

El sistema RestoCore requiere almacenar información semiestructurada y altamente flexible para los menús de restaurantes (platos con atributos variables, modificadores, opciones de personalización y categorías dinámicas). 

Originalmente se contemplaron soluciones basadas en bases de datos documentales dedicadas como MongoDB o capas de traducción como FerretDB. Sin embargo, en entornos de despliegue con recursos acotados de servidor, mantener motores adicionales o capas intermedias genera un consumo elevado de memoria RAM y complejidad operativa innecesaria.

¿Cómo garantizar un almacenamiento flexible y semiestructurado manteniendo un consumo óptimo de memoria y minimizando dependencias de infraestructura?

---

## Fuerzas Impulsoras de la Decisión

* **Flexibilidad del Dominio:** Capacidad de guardar objetos JSON semiestructurados para platos y modificadores dinámicos.
* **Eficiencia de Recursos:** Reducción del consumo de memoria RAM y uso eficiente del hardware disponible.
* **Simplicidad de Infraestructura:** Minimizar la cantidad de servicios y contenedores a desplegar y mantener en producción.
* **Rendimiento de Carga:** Soporte de indexación avanzada para garantizar la lectura de la carta QR en menos de 2 segundos.

---

## Opciones Consideradas

1. **Opción 1: PostgreSQL con columnas JSONB e índices GIN (Seleccionada)**
   * Utilizar PostgreSQL como base de datos relacional y documental híbrida. Los atributos flexibles se almacenan en columnas de tipo `JSONB` indexadas con `GIN`.
2. **Opción 2: OpenSearch / Elasticsearch**
   * Motor orientado a documentos. Excelente para búsqueda de texto completo pero descartado por su alto consumo de memoria RAM y complejidad de gestión de clúster.
3. **Opción 3: FerretDB (Capa de traducción MongoDB sobre PostgreSQL)**
   * Permite usar el protocolo de MongoDB sobre PostgreSQL, pero añade una capa intermedia que introduce latencia adicional y sobrecarga de dependencias.

---

## Resultado de la Decisión

**Opción elegida:** "Opción 1: PostgreSQL con columnas JSONB e índices GIN", porque combina la madurez, seguridad transaccional y bajo consumo de memoria de PostgreSQL con la flexibilidad sintáctica de los documentos JSON semiestructurados.

### Consecuencias Positivas

* **Menor Huella de RAM:** Reducción drástica del consumo de memoria en comparación con motores documentales dedicados o capas de traducción.
* **Simplificación del Stack:** Una sola base de datos principal para datos estructurados (tenants, usuarios) y semiestructurados (menús, platos).
* **Consultas de Alta Velocidad:** Lectura eficiente de JSON mediante índices GIN para cumplir con el presupuesto de latencia (< 2s LCP).

### Consecuencias Negativas / Desafíos

* **Validación en Aplicación:** La validación de la estructura del JSON almacenado debe garantizarse mediante los contratos de OpenAPI 3.1 y la lógica del Backend.

---

## Enlaces

* **ADR Previo:** [`ADR-0001: Adopción de Spec-Driven Development (SDD)`](./0001-adopcion-de-spec-driven-development-sdd-y-docs-as-code.md)
* **ADR Previo:** [`ADR-0002: Separación de Repositorios con Especificaciones Centralizadas`](./0002-separacion-de-repositorios-con-especificaciones-centralizadas.md)
