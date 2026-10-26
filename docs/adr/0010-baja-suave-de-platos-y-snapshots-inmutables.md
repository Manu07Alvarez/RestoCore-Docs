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

Se adopta la **Opción 3: Implementar exclusivamente Baja Suave (Soft Delete) con retención de 7 días sobre platos, respaldada por Snapshots Inmutables en las líneas de pedido, purga física automatizada y avisos explicativos no técnicos**.

### 1. Modelo Relacional de Catálogo (Categorías 1:N y DietaryLabels N:M)

Se define una arquitectura de datos diferenciada según la semántica de negocio:
1. **Categorías como Taxonomía a Grandes Rasgos (Relación 1:N):** Las categorías operan como agrupadores macro de primer nivel (ejemplo: "Entradas", "Platos Principales", "Bebidas", "Postres"). Cada plato pertenece de forma unívoca a una única categoría mediante clave foránea obligatoria `category_id`.
2. **Etiquetas Dietéticas y de Bebidas (`DietaryLabels` - Relación N:M):** Dimensión transversal y ortogonal que cumple formalmente una cardinalidad **Muchos a Muchos (N:M)**. Un producto puede satisfacer múltiples condiciones simultáneamente (ejemplo: un alimento vegano y sin TACC / `celiac_safe` a la vez), o clasificar bebidas como sin alcohol (`alcohol_free`) o con alcohol (`contains_alcohol`). Asimismo, cada etiqueta se asocia a múltiples productos. En PostgreSQL se implementa mediante array relacional `dietary_labels TEXT[]` indexado con **GIN** para permitir consultas de intersección de alto rendimiento (`WHERE dietary_labels @> ARRAY['vegan', 'celiac_safe']`) cumpliendo el presupuesto LCP (< 2s).

#### Estructura DDL en PostgreSQL

```sql
-- Tabla de Categorías de Menú (Agrupación a Grandes Rasgos)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de Platos (Dishes / MenuItems)
CREATE TABLE dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    base_price NUMERIC(12, 2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT NULL,
    display_order INT NOT NULL DEFAULT 0,
    allergens TEXT[] NOT NULL DEFAULT '{}',
    dietary_labels TEXT[] NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices de consulta activa y soporte de baja suave
CREATE INDEX idx_dishes_active_tenant ON dishes (tenant_id, category_id, display_order) 
    WHERE is_deleted = false;

CREATE INDEX idx_dishes_purge_candidates ON dishes (deleted_at) 
    WHERE is_deleted = true;

-- Índice GIN para consultas eficientes de intersección N:M de etiquetas dietéticas
CREATE INDEX idx_dishes_dietary_labels_gin ON dishes USING GIN (dietary_labels);
```

### 2. Snapshots Inmutables en Líneas de Pedido (Auditoría Contable)
* La entidad `OrderItem` desacopla su dependencia estricta del catálogo para no bloquear la eliminación ni verse afectada por mutaciones futuras:
  - `MenuItemId: Guid?` (clave foránea nulable con comportamiento `ON DELETE SET NULL`).
  - `ItemNameSnapshot: string` (nombre exacto del plato al momento de emitir la comanda).
  - `UnitPriceSnapshot: decimal` (precio unitario congelado).
  - `AppliedModifiersJson: string` (modificadores, adicionales y precios agregados congelados).

### 3. Política de Baja Suave y Periodo de Retención de 7 Días
* Al solicitar la eliminación de un plato (`DELETE /api/v1/admin/items/{id}`):
  1. El sistema verifica que no existan comandas activas en salón o cocina (`Pending`, `InPreparation`, `Ready`). De existir, responde con HTTP 409 Conflict y advertencia comprensible no técnica.
  2. Si no hay pedidos en curso, se registra `is_deleted = true` y `deleted_at = NOW()`.
  3. El plato queda inmediatamente oculto de la carta pública mediante Global Query Filters en EF Core:
     `builder.Entity<MenuItem>().HasQueryFilter(m => !m.IsDeleted && m.TenantId == currentTenantId);`
  4. Se inicia una ventana de retención de 7 días (1 semana). Durante este periodo, el plato permanece archivado en la base de datos y puede ser restaurado.

### 4. Reversibilidad y Restauración Administrativa
* Durante el periodo de 7 días desde `deleted_at`, el administrador puede reactivar el plato invocando:
  `POST /api/v1/admin/items/{id}/restore`
* La restauración restablece `is_deleted = false`, `deleted_at = null`, e invalida la caché de la CDN para restituir el plato en la carta digital.

### 5. Mecanismo de Purga Física Automatizada (Worker Programado)
* Al transcurrir 7 días desde la baja suave, el plato es candidato a eliminación física irreversible.
* Un worker en segundo plano (`PurgeArchivedDishesWorker`) ejecuta un cron job diario con la siguiente instrucción:
  ```sql
  DELETE FROM dishes
  WHERE is_deleted = true
    AND deleted_at <= NOW() - INTERVAL '7 days'
  RETURNING id, image_url;
  ```
* Por cada registro purgado que contenga `image_url`, el worker despacha una solicitud de eliminación física del archivo binario a SeaweedFS, evitando el almacenamiento de archivos huérfanos.

### 6. Avisos y Retroalimentación No Técnica para el Usuario
* Al completarse la baja suave con éxito, la respuesta HTTP (`200 OK`) incluye:
  > *"El plato ha sido retirado de la carta. Los clientes ya no lo verán en el menú digital ni podrán pedirlo, pero todas tus ventas anteriores y reportes seguirán intactos y seguros. Dispones de 7 días para restaurarlo antes de su eliminación definitiva."*

---

## Consecuencias

### Positivas
* **Cero Pérdida de Información Financiera:** Los reportes de comandas y facturas quedan sellados e independientes del ciclo de vida del catálogo.
* **Seguridad y Confianza del Usuario:** El encargado del restaurante comprende que su plato está retirado de la vista pública pero sus datos históricos están seguros.
* **Margen de Error Humano Resuelto (Ventana de Gracia):** Si un administrador retira un plato por equivocación, dispone de 7 días para restaurarlo con un solo clic.
* **Higiene de Datos y Almacenamiento:** La purga a 7 días previene el crecimiento indefinido de la base de datos y libera espacio en disco en SeaweedFS.
* **Optimización en Consultas (1:N):** La pertenencia unívoca a una sola categoría simplifica la estructura de datos para el cliente móvil y minimiza el tiempo de renderizado (< 2s LCP).

### Negativas
* **Gestión de Restricciones de Unicidad:** Si existe regla de unicidad en el nombre del plato por categoría, el índice único en PostgreSQL debe ser condicional: `CREATE UNIQUE INDEX ... WHERE is_deleted = false`.
* **Proceso Asíncrono Requerido:** Requiere mantener activo un worker en segundo plano con privilegios para interactuar con la base de datos y SeaweedFS.
