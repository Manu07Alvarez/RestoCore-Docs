# ADR-0010: Baja Suave de Platos (Soft Delete) con Snapshots Inmutables de Comandas y Mensajes No Técnicos

* **Estado:** Aceptado
* **Fecha:** 2026-10-09
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore

---

## Contexto y Planteamiento del Problema

Los establecimientos gastronómicos requieren retirar platos de su oferta activa debido a rotación de temporada, discontinuación de recetas, o cambios comerciales en la carta. 

Si el sistema permitiera una eliminación física destructiva (`HARD DELETE` a nivel SQL):
1. **Pérdida de Integridad Contable e Histórica:** Los reportes de ventas, comprobantes fiscales y auditorías de cocina se verían corrompidos o bloqueados por restricciones de integridad referencial de clave foránea en PostgreSQL (`FK Constraint Violation`).
2. **Riesgo Operacional en Cocina:** Eliminar un plato que se encuentra siendo cocinado en tiempo real genera inconsistencias graves en el Kitchen Display System (KDS) y en las pantallas de los mozos.
3. **Falta de Claridad para el Usuario:** Los mensajes de error o confirmación basados en terminología técnica de bases de datos ("registro eliminado de la tabla", "violación de clave foránea") resultan incomprensibles y frustrantes para los dueños y encargados del local.

---

## Fuerzas Impulsoras (Decision Drivers)

* **Preservación Estricta de Historial Financiero:** Todo pedido pasado debe retener el nombre del plato, precio facturado y modificaciones aplicadas de forma inalterable.
* **Seguridad en Salón y Cocina:** No permitir el retiro de ningún plato involucrado en pedidos actualmente en preparación.
* **Experiencia de Usuario Comprensible (Lenguaje Humano No Técnico):** Proveer avisos y mensajes redactados en lenguaje directo, amigable y exento de jerga técnica sobre el estado del plato y la seguridad de sus ventas pasadas.
* **Reversibilidad Operativa:** Posibilidad de reactivar un plato previamente retirado sin necesidad de recrearlo desde cero.
* **Alineación con el Presupuesto de Rendimiento:** La exclusión del plato archivado debe aplicarse mediante filtros transparentes sin sobrecargar la base de datos ni romper la caché perimetral en la CDN.

---

## Opciones Consideradas

1. **Opción 1: Eliminación Física Destructiva con Restricción Relacional (ON DELETE RESTRICT):**
   Falla en base de datos si existen ventas previas. Descartada porque impide a los restaurantes retirar platos que hayan vendido al menos una vez en su historia comercial.
2. **Opción 2: Eliminación Física en Cascada (ON DELETE CASCADE):**
   Borra el plato y todas las líneas de pedidos históricas asociadas. Descartada por ser inaceptable a nivel de cumplimiento contable, fiscal y de auditoría.
3. **Opción 3 (Seleccionada): Baja Suave (Soft Delete) con Snapshots Inmutables de Pedido y Retroalimentación No Técnica:**
   La entidad `MenuItem` implementa baja suave (`IsDeleted`, `DeletedAtUtc`). Las líneas de pedido (`OrderItem`) conservan un snapshot inmutable independiente del catálogo con clave foránea nulable (`MenuItemId: Guid?`). La API bloquea el retiro si hay comandas activas y responde con mensajes redactados en lenguaje de negocio accesible para el usuario.

---

## Decisión Tomada

Se adopta la **Opción 3: Implementar exclusivamente Baja Suave (Soft Delete) sobre platos, respaldada por Snapshots Inmutables en las líneas de pedido y avisos explicativos no técnicos**.

### 1. Modelo de Datos y Persistencia
* La entidad `MenuItem` incorpora las propiedades de auditoría:
  - `IsDeleted: bool = false`
  - `DeletedAtUtc: DateTimeOffset? = null`
* Entity Framework Core aplica un filtro de consulta global (*Global Query Filter*):
  `builder.Entity<MenuItem>().HasQueryFilter(m => !m.IsDeleted && m.TenantId == currentTenantId);`
* La entidad de líneas de pedido (`OrderItem`) desacopla su dependencia estricta mediante:
  - `MenuItemId: Guid?` (clave foránea con comportamiento `ON DELETE SET NULL`).
  - `ItemNameSnapshot: string` (nombre exacto del plato al momento de emitir la comanda).
  - `UnitPriceSnapshot: decimal` (precio unitario congelado).
  - `AppliedModifiersJson: string` (modificadores, adicionales y precios agregados congelados).

### 2. Bloqueo de Comandas Activas en Cocina
* Al solicitar la baja suave, el caso de uso verifica si el plato existe en pedidos con estado activo (`Pending`, `InPreparation`, `Ready`).
* De detectarse pedidos en curso, la solicitud se rechaza con código HTTP `409 Conflict` (RFC 7807 ProblemDetails) y el mensaje explicativo:
  > *"Este plato no puede retirarse de la carta en este momento porque la cocina tiene pedidos pendientes o en preparación que lo incluyen. Por favor, finaliza o cancela esos pedidos antes de retirarlo."*

### 3. Confirmación No Técnica al Retirar el Plato
* Al completarse la baja suave con éxito, la respuesta HTTP (`200 OK`) incluye una explicación clara:
  > *"El plato ha sido retirado de la carta. Los clientes ya no lo verán en el menú digital ni podrán pedirlo, pero todas tus ventas anteriores y reportes seguirán intactos y seguros."*

### 4. Reversibilidad y Restauración
* Se implementa el endpoint `POST /api/v1/admin/items/{id}/restore` permitiendo reactivar un plato archivado cuando el restaurante decida volver a comercializarlo.

---

## Consecuencias

### Positivas
* **Cero Pérdida de Información Financiera:** Los registros contables y reportes de comandas pasadas quedan sellados e independientes de cambios en el catálogo.
* **Seguridad y Confianza del Usuario:** El encargado del restaurante comprende con exactitud qué sucede con su menú y sabe que no ha borrado registros contables.
* **Protección Operacional en Salón:** Se evita que un mozo o cocinero pierda la referencia visual de un plato que está siendo elaborado.
* **Reversibilidad Inmediata:** Si un plato fue retirado por error o vuelve la temporada, se restaura en un solo paso conservando su precio, categoría y fotos.

### Negativas
* **Gestión de Restricciones de Unicidad:** Si existe una regla de unicidad sobre el nombre del plato dentro de una misma categoría, el índice único en PostgreSQL debe ser un índice parcial condicional: `CREATE UNIQUE INDEX ... WHERE is_deleted = false`.
