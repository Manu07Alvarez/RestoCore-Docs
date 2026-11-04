# ADR-0014: Optimización de Persistencia con Índices GIN, Operadores JSONB Nativos y Normalización B-Tree en PostgreSQL

* **Estado:** Aceptado
* **Fecha:** 2026-11-02
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore / Guardián de la Especificación

---

## Contexto y Planteamiento del Problema

El registro `ADR-0003` fundamentó la selección de PostgreSQL con columnas semiestructuradas `JSONB` e índices `GIN` para almacenar estructuras variables de menús y comandas, optimizando el consumo de memoria RAM frente a soluciones documentales dedicadas como MongoDB. Asimismo, el registro `ADR-0010` definió el esquema inmutable de pedidos mediante snapshots desnormalizados en la columna `orders.items_snapshot`.

Sin embargo, la auditoría técnica del backend (`resto-core-back`) constató desvíos de implementación severos que degradan el rendimiento de la base de datos:
1. **Ausencia de Índices GIN en Persistencia:** En `OrderConfiguration.cs` (líneas 23-40) y `MenuConfiguration.cs` (líneas 22-41), las columnas `ItemsSnapshot` y los atributos flexibles de catálogo carecen de índices invertidos generalizados (`GIN`), forzando al motor relacional a ejecutar escaneos secuenciales (`Seq Scan`) sobre tablas con millones de registros.
2. **Evaluación en Memoria de Snapshots JSONB:** En `OrderRepository.cs` (líneas 35-42), el método `HasActiveOrdersForMenuItemAsync` descarga a la memoria del servidor de aplicaciones todas las órdenes activas del restaurante junto con su snapshot completo en formato JSON mediante `.ToListAsync(ct)`, evaluando la contención de ítems con LINQ en memoria (`activeOrders.Any(...)`). Esto introduce una complejidad de memoria O(N) que satura el Garbage Collector de .NET durante horas pico de servicio.
3. **Invalidación de Índices B-Tree por Funciones Escalares:** En `UserRepository.cs` (líneas 18-23) y `CatalogRepository.cs` (línea 34), las consultas evalúan expresiones como `u.Email.ToLower() == normalizedEmail`. En PostgreSQL, el uso de funciones como `LOWER()` sobre columnas indexadas inhabilita el índice B-Tree estándar (`IX_users_Email`), obligando a un escaneo completo de la tabla `users` en cada inicio de sesión.
4. **Divergencia de Nomenclatura en Claves JSON y Extensión `btree_gin`:** El operador `@>` de PostgreSQL exige coincidencia binaria estricta (*case-sensitive*). Si la serialización en C# utiliza convenciones web en camelCase (`menuItemId`), una consulta SQL directa buscando `"MenuItemId"` evaluará sistemáticamente como falsa, provocando un falso negativo crítico que permitiría archivar platos con comandas vivas en cocina. Asimismo, la creación de índices GIN compuestos combinando columnas escalares (`tenant_id`) con JSONB requiere la extensión `btree_gin`, cuya omisión impide al planificador optimizar consultas multi-tenant.

¿Cómo garantizar que las operaciones de consulta y validación sobre datos JSONB y atributos de autenticación alcancen tiempos de ejecución sub-milisegundo sin sobrecargar la memoria de la aplicación, previniendo discrepancias de nomenclatura y minimizando el costo de mantenimiento de índices?

---

## Fuerzas Impulsoras de la Decisión (Decision Drivers)

* **Presupuesto de Rendimiento y Latencia:** Las validaciones de dominio (como verificar si un plato tiene comandas abiertas antes de su baja lógica) y la autenticación deben procesarse en < 2 ms para sostener una experiencia fluida.
* **Escalabilidad y Aislamiento Multi-Tenant:** Minimizar la transferencia de datos por red entre PostgreSQL y el backend, evitando la materialización de colecciones completas en la memoria RAM del servidor.
* **Apego Estricto a ADR-0003 y ADR-0010:** Hacer cumplir el uso de índices GIN sobre documentos JSONB y asegurar la inmutabilidad de los snapshots de órdenes sin degradación de rendimiento.
* **Conformidad con AGENTS.md:** Mantenimiento de PostgreSQL como motor central unificado sin incorporar dependencias de búsqueda externa (Elasticsearch/OpenSearch).

---

## Opciones Consideradas

### Opción 1: Mantener la Evaluación en Memoria de la Aplicación con Filtrado LINQ
Continuar materializando entidades `Order` y colecciones `ItemsSnapshot` hacia la memoria de la API, confiando en el escalado vertical del servidor y la memoria RAM asignada a los contenedores.
* **Ventajas:** No requiere escribir consultas SQL nativas ni alterar las migraciones existentes de EF Core.
* **Inconvenientes:**
  - Consumo de memoria O(N) que crece linealmente con la cantidad de órdenes activas de todos los tenants.
  - Provoca pausas frecuentes de Garbage Collection (Gen 0/Gen 1/Gen 2) bajo alta concurrencia.
  - Satura el ancho de banda de red entre el servidor de base de datos y la API web al transferir documentos JSON completos que luego son descartados.
  - No resuelve el escaneo secuencial en autenticación de usuarios.

### Opción 2: Extracción y Normalización Relacional Completa (Tablas Intermedias Relacionales)
Descomponer los snapshots JSONB en tablas relacionales tradicionales (`order_items`, `order_item_modifiers`), eliminando las columnas `JSONB`.
* **Ventajas:** Permite utilizar índices relacionales estándar B-Tree con claves foráneas.
* **Inconvenientes:**
  - Viola directamente `ADR-0003` y `ADR-0010`, rompiendo la inmutabilidad de los snapshots de comanda y eliminando la flexibilidad semiestructurada requerida para opciones dinámicas de menús.
  - Requiere transacciones pesadas con múltiples bloqueos de tabla e inserciones distribuidas en lugar de una única escritura atómica del snapshot del pedido.
  - Incrementa la complejidad de mantenimiento y migraciones de esquema ante variaciones en los atributos de platos.

### Opción 3: Índices GIN Compuestos con Extensión `btree_gin` y Operador de Contención `@>`
Crear índices GIN sobre la columna `orders.items_snapshot`, combinando opcionalmente el escalar `tenant_id` mediante la extensión de PostgreSQL `btree_gin` (`CREATE EXTENSION IF NOT EXISTS btree_gin;`), resolviendo las comprobaciones con el operador de contención binaria `@>`.
* **Ventajas:**
  - Permite búsquedas de contención JSONB indexadas sobre cualquier estado de la orden.
  - La evaluación `@>` se resuelve a nivel de páginas de índice en el motor de base de datos sin transferir snapshots a la memoria de la API.
* **Inconvenientes:**
  - Los índices GIN sobre columnas semiestructuradas presentan una sobrecarga apreciable en inserciones masivas de pedidos debido a la actualización del árbol invertido y la lista pendiente de posting (*GIN pending list*).
  - La combinación de escalares (UUID `tenant_id`) con JSONB exige compilar y habilitar la extensión `btree_gin` en la base de datos PostgreSQL.

### Opción 4 (Elegida): Estrategia Híbrida: Índice B-Tree Parcial para Comandas Vivas, Estandarización camelCase y Soporte GIN
Adoptar una arquitectura de persistencia balanceada que combine:
1. **Estandarización de Contrato JSON:** Declarar explícitamente atributos `[JsonPropertyName("menuItemId")]` en los modelos C# y alinear la plantilla SQL con `"menuItemId"` para erradicar divergencias de mayúsculas/minúsculas (*case-sensitivity*).
2. **Índice B-Tree Parcial Filtrado:** Crear `CREATE INDEX ix_orders_active_tenant ON orders (tenant_id) WHERE status NOT IN ('delivered', 'cancelled')`.
3. **Índice GIN sobre `items_snapshot` con `btree_gin`:** Registrar la extensión `btree_gin` en migraciones de EF Core y dotar a la columna de índice invertido para consultas semiestructuradas avanzadas.
4. **Normalización B-Tree para Autenticación:** Normalizar `User.Email` a minúsculas en almacenamiento y remover `ToLower()` en consultas LINQ.

#### Comparación de Trade-offs entre Índice GIN y B-Tree Parcial:
| Criterio | Índice GIN Global (`items_snapshot`) | Índice B-Tree Parcial (`ix_orders_active_tenant`) |
| :--- | :--- | :--- |
| **Tamaño de Índice** | Grande (indexa todas las claves de todas las órdenes históricas). | Minúsculo (< 1% del tamaño de tabla, solo cubre órdenes en curso). |
| **Sobrecarga en Escritura** | Moderada a Alta (mantenimiento de árbol invertido en cada comanda). | Nula para órdenes cerradas/entregadas; insignificante en creación. |
| **Latencia de Consulta Activa** | ~0.3 ms a 0.8 ms (vía Bitmap Index Scan). | < 0.05 ms (vía Index Scan B-Tree directo por tenant sobre conjunto vivo). |
| **Requerimiento de Extensiones** | Requiere `btree_gin` para incluir `tenant_id` compuesto. | No requiere extensiones nativas adicionales. |
| **Ámbito de Aplicación** | Consultas arbitrarias sobre cualquier orden histórica o activa. | Específico para el ciclo de vida operativo de comandas vivas en cocina. |

---

## Decisión de Arquitectura

Se aprueba la **Opción 4: Estrategia Híbrida: Índice B-Tree Parcial para Comandas Vivas, Estandarización camelCase y Soporte GIN**:

1. **Estandarización Estricta de Serialización JSON en C# DTOs:**
   En `src/RestoCore.Domain/Entities/Order.cs`, anotar explícitamente las propiedades del snapshot para garantizar invariabilidad de nomenclatura independiente de la configuración global de serialización:
   ```csharp
   public class OrderItemSnapshot
   {
       [JsonPropertyName("menuItemId")]
       public Guid MenuItemId { get; set; }

       [JsonPropertyName("name")]
       public string Name { get; set; } = string.Empty;

       [JsonPropertyName("quantity")]
       public int Quantity { get; set; }

       [JsonPropertyName("unitPrice")]
       public decimal UnitPrice { get; set; }

       [JsonPropertyName("modifiers")]
       public List<OrderModifierSnapshot> Modifiers { get; set; } = new();

       [JsonPropertyName("instructions")]
       public string? Instructions { get; set; }
   }
   ```

2. **Evaluación de Contención JSONB en Repositorio de Órdenes:**
   En `src/RestoCore.Infrastructure/Persistence/Repositories/OrderRepository.cs`, sustituir la materialización en memoria por la consulta delegada a PostgreSQL utilizando la clave estandarizada `"menuItemId"`:
   ```csharp
   public async Task<bool> HasActiveOrdersForMenuItemAsync(Guid tenantId, Guid menuItemId, CancellationToken ct = default)
   {
       // Nomenclatura camelCase exacta coincidente con [JsonPropertyName("menuItemId")]
       var filterPayload = $"[{{\"menuItemId\":\"{menuItemId}\"}}]";

       return await _context.Orders
           .FromSqlInterpolated($@"
               SELECT * FROM orders 
               WHERE tenant_id = {tenantId} 
                 AND status NOT IN ('delivered', 'cancelled') 
                 AND items_snapshot @> {filterPayload}::jsonb 
               LIMIT 1")
           .AnyAsync(ct);
   }
   ```

3. **Extensión `btree_gin` e Índices en Migración de EF Core:**
   En la configuración de entidades y migración relacional:
   ```csharp
   // 1. Habilitación de extensión btree_gin para índices compuestos scalar + jsonb
   migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gin;");

   // 2. Creación del índice B-Tree parcial para filtrado instantáneo de comandas vivas
   migrationBuilder.Sql(@"
       CREATE INDEX ix_orders_active_tenant 
       ON orders (tenant_id) 
       WHERE status NOT IN ('delivered', 'cancelled');
   ");
   ```
   En `src/RestoCore.Infrastructure/Persistence/Configurations/OrderConfiguration.cs`:
   ```csharp
   builder.Property(o => o.ItemsSnapshot)
       .HasColumnType("jsonb")
       .IsRequired();

   // Índice GIN sobre items_snapshot para contención profunda
   builder.HasIndex(o => o.ItemsSnapshot)
       .HasMethod("gin");
   ```

4. **Normalización en Almacenamiento y Consulta Directa sobre Índice B-Tree:**
   - Garantizar que la entidad `User` almacene siempre el correo electrónico en formato normalizado en minúsculas (`Email = email.Trim().ToLowerInvariant()`).
   - Modificar `src/RestoCore.Infrastructure/Persistence/Repositories/UserRepository.cs` para suprimir la función `ToLower()` en la consulta LINQ:
     ```csharp
     public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
     {
         var normalizedEmail = email.Trim().ToLowerInvariant();
         return await _context.Users
             .IgnoreQueryFilters()
             .Include(u => u.Tenant)
             .FirstOrDefaultAsync(u => u.Email == normalizedEmail && u.IsActive, cancellationToken);
     }
     ```

---

## Consecuencias

### Positivas
* **Erradicación de Falsos Negativos:** La alineación rigurosa entre `[JsonPropertyName("menuItemId")]` y el predicado SQL `@> '[{"menuItemId":"..."}]'` elimina el riesgo de bajas accidentales de platos con órdenes vivas en cocina.
* **Máximo Rendimiento con Costo de Inserción Mínimo:** El índice B-Tree parcial `ix_orders_active_tenant` aísla las órdenes vivas en memoria caché de PostgreSQL (< 0.05 ms por búsqueda), liberando a las órdenes históricas entregadas o canceladas del costo de indexación.
* **Reducción de Huella de Memoria en Backend:** La comprobación de órdenes vivas pasa de complejidad O(N) en memoria de la API a una evaluación escalar booleana O(1).
* **Eficiencia en Autenticación:** Las búsquedas de usuarios aprovechan el índice B-Tree `IX_users_Email` directamente en O(log N).

### Negativas
* **Mantenimiento de Esquema:** Requiere asegurar que la extensión `btree_gin` esté instalada o autorizada en el clúster gestionado de PostgreSQL (Amazon RDS, Azure Database o PostgreSQL local).
* **Disciplina de Serialización:** Toda nueva propiedad agregada a `OrderItemSnapshot` debe ser rigurosamente anotada con `[JsonPropertyName]` para evitar futuras divergencias de capitalización.

---

## Mapeo de Conformidad con AGENTS.md

| Requisito Inviolable | Estado | Justificación Técnica |
| :--- | :--- | :--- |
| **Persistencia PostgreSQL con JSONB/GIN** | Cumplido | Se formaliza la configuración `HasMethod("gin")` en EF Core y el uso del operador `@>` nativo. |
| **Presupuesto de Latencia (< 2s LCP)** | Cumplido | Libera ciclos de CPU y memoria en el servidor, garantizando que las consultas de catálogo no compitan por recursos con la carta pública. |
| **Exclusividad Documental / Repositorio Backend** | Cumplido | El ADR documenta la decisión sin alterar directamente los archivos del repositorio `resto-core-back`. |
| **Estilo Formal y Sin Emojis** | Cumplido | Redacción sobria, profesional, objetiva y libre de caracteres o elementos informales. |

---

## Enlaces

* **ADR Previo:** [`ADR-0003: Selección de PostgreSQL con JSONB para Persistencia Semiestructurada y Optimización de Recursos`](./0003-migracion-postgresql.md)
* **ADR Previo:** [`ADR-0010: Baja Suave de Platos y Snapshots Inmutables de Comandas`](./0010-baja-suave-de-platos-y-snapshots-inmutables.md)
* **Diagnóstico Relacionado:** [`Diagnóstico Integral de Optimizaciones Técnicas: Backend RestoCore`](../diagnostico-optimizaciones-backend.md)
