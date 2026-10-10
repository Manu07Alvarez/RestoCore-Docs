---
id: 0008-desacoplamiento-catalogo-y-capa-visual-canvas
title: ADR-0008 Desacoplamiento entre Catálogo y Capa Visual Canvas
---

# ADR-0008: Desacoplamiento entre el Catálogo de Datos y la Capa de Maquetación Visual (Canvas)

* **Estado:** Aceptado
* **Fecha:** 2026-09-17
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore

---

## Contexto y Planteamiento del Problema

La plataforma RestoCore ofrece una visualización pública de la carta digital optimizada para dispositivos móviles mediante una plantilla secuencial ordenada por categorías. Sin embargo, diversos establecimientos gastronómicos requieren una mayor flexibilidad estética y diferenciación de marca, solicitando un "Modo Lienzo" (Canvas Mode) donde el administrador pueda posicionar libremente platos, modificar dimensiones, establecer imágenes de fondo y gestionar capas de profundidad (`z-index`).

El desafío arquitectónico radica en cómo proveer esta capacidad de diseño libre sin corromper la integridad de los datos de negocio (precios, stock en cocina, relaciones de modificadores y reportes de comandas), evitando acoplar la geometría de la interfaz con las tablas relacionales del catálogo.

---

## Opciones Consideradas

1. **Opción 1: Columnas de Posicionamiento Directas en Tablas de Categorías y Platos (`MenuItem` / `Category`):**
   Agregar columnas `pos_x`, `pos_y`, `width`, `height`, `z_index` directamente en las tablas relacionales de platos.
2. **Opción 2: Motor de Plantillas CSS Personalizadas por Restaurante:**
   Permitir que el dueño suba o edite hojas de estilo CSS libres para sobreescribir la presentación.
3. **Opción 3 (Seleccionada): Desacoplamiento de Maquetación mediante Objeto Semiestructurado `layout_config` en Columna `JSONB`:**
   Mantener el catálogo de datos 100% independiente y almacenar la configuración geométrica del lienzo en un objeto `JSONB` opcional (`layout_config`) a nivel de Menú/Tenant.

---

## Decisión Tomada

Se adopta la **Opción 3: Persistir la configuración del lienzo como un objeto JSONB opcional (`layout_config`) en PostgreSQL**, completamente desacoplado de las entidades relacionales de categorías y platos.

La estructura relacional y los casos de uso transaccionales (gestión de precios, KDS de cocina, pedidos de salón) continúan operando exclusivamente sobre las entidades normalizadas de catálogo. La capa visual Canvas actúa como una **capa aditiva y descartable**:
* Si `canvas_enabled == true` y el objeto `layout_config` es válido, el cliente móvil interpreta las coordenadas y renderiza los elementos en base a los `dish_id` provistos.
* Si el modo lienzo está inactivo o ausente, el cliente renderiza la plantilla estándar secuencial sin pérdida de funcionalidad.

---

## Consecuencias

### Positivas
* **Integridad de Datos Preservada:** Los cambios estéticos en el lienzo no alteran los atributos comerciales ni la integridad referencial de los platos y precios.
* **Resiliencia y Fallback Instantáneo:** Si el archivo o configuración del lienzo se corrompe o falla en transferirse, el frontend conmuta automáticamente a la maquetación predeterminada por categorías sin interrumpir la operación del restaurante.
* **Flexibilidad de Esquema:** Almacenar la geometría en una columna `JSONB` permite agregar nuevas propiedades de diseño (rotaciones, opacidades, filtros) sin requerir migraciones de esquema en PostgreSQL.
* **Optimización de Caché:** La mutación de la geometría visual actualiza el `version_hash` del menú, permitiendo invalidaciones precisas tanto en CDN perimetral como en la memoria del backend.

### Negativas
* **Normalización Responsiva en Cliente:** Requiere que el frontend móvil implemente un motor de escalado proporcional (viewports relativos) para adaptar lienzos diseñados en pantallas de escritorio a terminales móviles compactos sin introducir scroll horizontal no deseado.
* **Validación de Identificadores Huérfanos:** Si un plato posicionado en el lienzo es eliminado del catálogo, el renderizador debe filtrar y omitir dicho identificador de plato (`dish_id`) huérfano de manera transparente.
