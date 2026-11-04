# ADR-0018: Procesamiento Reactivo en Redis Streams, Proyección por Lote y Gestión de Ciclo de Vida de Conexiones Persistentes (WebSockets y Redis)

* **Estado:** Aceptado
* **Fecha:** 2026-11-02
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore / Guardián de la Especificación

---

## Contexto y Planteamiento del Problema

La arquitectura de procesamiento de comandas en tiempo real definida en `ADR-0007` se apoya en colas FIFO sobre **Redis Streams** (`OrderProcessorWorker.cs`) y canales **WebSockets** (`KitchenWebSocketManager.cs`) para garantizar la entrega ordenada e instantánea de pedidos a las terminales de cocina (KDS). Asimismo, la infraestructura expone verificaciones de salud (`/ready` en `HealthEndpoints.cs`) utilizadas por orquestadores de contenedores.

Durante el diagnóstico integral de optimizaciones del backend (`OPT-05` y `OPT-06` en `docs/audit/diagnostico-optimizaciones-backend.md`), se identificaron cuatro fallas arquitectónicas en el ciclo de vida de los procesos en segundo plano y las conexiones de red persistentes:

1. **Sondeo SQL Sincrónico en Reposo (`OPT-05a`):** En `src/RestoCore.Infrastructure/BackgroundServices/OrderProcessorWorker.cs` (líneas 47-66), el bucle principal ejecuta `db.Tenants.Select(t => t.Slug).ToList()` de forma sincrónica cada 500 ms para descubrir las colas de Redis Streams a consultar. Esto genera **120 consultas SQL directas por minuto contra PostgreSQL** incluso cuando no existe ningún pedido en tránsito, compitiendo por el pool de conexiones (`Npgsql`) con las lecturas de la Carta QR.
2. **Antipatrón de Consultas `N+1` en Consolidación de Comandas (`OPT-05b`):** En `OrderProcessorWorker.ProcessOrderMessageAsync` (líneas 106-120), el worker itera sobre los ítems del pedido ejecutando `await catalogRepo.GetMenuItemWithModifiersAsync(itemInput.MenuItemId, ct)` dentro de un bucle `foreach`. Un pedido con 10 platos dispara 10 viajes de red secuenciales a PostgreSQL, incrementando la latencia de consolidación y notificación a cocina entre 50 ms y 120 ms.
3. **Fuga de Memoria (*Memory Leak*) en `KitchenWebSocketManager` (`OPT-06a`):** En `src/RestoCore.Infrastructure/WebSockets/KitchenWebSocketManager.cs` (líneas 15, 48-68), las conexiones activas se almacenan en un `ConcurrentBag<WebSocket>`. Dado que `ConcurrentBag<T>` no ofrece remoción indexada de elementos arbitrarios, al detectar sockets cerrados (`socket.State != WebSocketState.Open`) el método los agrega a una lista local `deadSockets` que luego se descarta sin retirar las instancias de `_sockets` ni invocar `Dispose()`. Esto acumula descriptores de sockets cerrados indefinidamente en la generación 2 del recolector de basura (GC Heap).
4. **Agotamiento de Puertos TCP Efímeros en Healthchecks (`OPT-06b`):** En `src/RestoCore.Api/Endpoints/HealthEndpoints.cs` (líneas 42-44), cada llamada al endpoint `/ready` instancia una nueva conexión TCP hacia Redis mediante `await ConnectionMultiplexer.ConnectAsync(redisConn)` sin liberarla y sin reutilizar la instancia singleton `IConnectionMultiplexer` registrada en el contenedor de inyección de dependencias.

¿Cómo rediseñar el procesamiento de Redis Streams, la carga de catálogo en segundo plano y la administración de descriptores WebSockets y Redis para erradicar el tráfico SQL ocioso, reducir a $O(1)$ las consultas por comanda y garantizar estabilidad de memoria y sockets en ejecución continua 24/7?

---

## Fuerzas Impulsoras de la Decisión (Decision Drivers)

* **Protección del Pool de Conexiones de PostgreSQL y Presupuesto `< 2s LCP`:** Erradicar el 100% de las consultas SQL en reposo emitidas por workers de fondo para preservar la capacidad de conexión destinada a la Carta QR y operaciones transaccionales.
* **Despacho Sub-15ms hacia Terminales de Cocina:** Reducir la validación y enriquecimiento de ítems de una comanda de $M$ consultas secuenciales a una única proyección SQL por lote (`WHERE id = ANY(@ids)`).
* **Estabilidad de Memoria RAM y Puertos Efímeros TCP (Operación 24/7):** Garantizar que las desconexiones de pantallas KDS liberen de inmediato sus descriptores en memoria y que las sondas `/ready` reutilicen la conexión multiplexada existente hacia Redis.
* **Conformidad con `ADR-0002`, `ADR-0003` y `ADR-0007`:** Mantener el desacoplamiento por repositorios (`ICatalogRepository`), las capacidades nativas de PostgreSQL y la topología Redis Streams + WebSockets.

---

## Opciones Consideradas

### Opción 1: Incrementar el Intervalo de Sondeo SQL y Reconstruir Periódicamente las Colecciones de Sockets
Aumentar el `Task.Delay` de `OrderProcessorWorker` de 500 ms a 5.000 ms, mantener la carga iterativa por ítem, vaciar periódicamente el `ConcurrentBag<WebSocket>` mediante bloqueo (`lock`) y envolver `ConnectionMultiplexer.ConnectAsync` en un bloque `using` dentro de `/ready`.
* **Ventajas:** Cambios mínimos sobre la estructura actual de clases.
* **Inconvenientes:**
  - Introduce hasta 5 segundos de latencia adicional en la entrega de comandas a cocina, degradando la experiencia operativa.
  - Persiste el problema `N+1` en pedidos con múltiples platos.
  - Abrir y cerrar conexiones TCP completas de `ConnectionMultiplexer` en cada healthcheck continúa generando estados `TIME_WAIT` y sobrecarga de handshake en Redis.

### Opción 2: Reemplazar Redis Streams por Colas en Memoria (`System.Threading.Channels`)
Sustituir Redis Streams por un canal en memoria local dentro del proceso de la API para evitar el descubrimiento de streams por tenant.
* **Ventajas:** Cero latencia de red entre la recepción HTTP del pedido y el worker local.
* **Inconvenientes:**
  - **Viola `ADR-0007`:** En caso de reinicio del contenedor o despliegue de nueva versión, todos los pedidos en tránsito en la memoria RAM se pierden irremediablemente, incumpliendo la garantía de durabilidad de comandas.

### Opción 3 (Elegida): Descubrimiento Reactivo en Redis, Proyección SQL por Lote (`ANY`) y Gestión Determinista con `ConcurrentDictionary` e `IConnectionMultiplexer` Singleton
Implementar cuatro mejoras estructurales coordinadas en `RestoCore.Infrastructure` y `RestoCore.Api`:
1. **Registro Reactivo de Streams Activos en Redis (`OPT-05a`):** Reemplazar la consulta SQL `db.Tenants.Select(t => t.Slug).ToList()` cada 500 ms por la lectura de un conjunto en Redis (`SMEMBERS restocore:active_tenant_streams`, alimentado automáticamente mediante `SADD` al publicar pedidos o cacheado en memoria con invalidación), acompañado de lectura por grupo de consumidores (`StreamReadGroupAsync`). Durante periodos de inactividad, PostgreSQL recibe **0 consultas**.
2. **Proyección por Lote en `ICatalogRepository` (`OPT-05b`):** Incorporar el método `GetMenuItemsWithModifiersByIdsAsync(IReadOnlyCollection<Guid> itemIds, CancellationToken ct)` que recupera todos los platos e ingredientes solicitados en un único viaje a PostgreSQL (`WHERE m.Id = ANY(@itemIds)` / `.Where(m => itemIds.Contains(m.Id))`), indexándolos en memoria mediante `ToDictionary(m => m.Id)`.
3. **Ciclo de Vida Determinista en `KitchenWebSocketManager` (`OPT-06a`):** Sustituir `ConcurrentBag<WebSocket>` por `ConcurrentDictionary<Guid, WebSocket>` (o indexado por `(Guid TenantId, Guid SocketId)`). Al registrar una conexión se le asigna un identificador único; cuando se detecta `socket.State != WebSocketState.Open` o una excepción de transporte durante `BroadcastAsync`, se invoca atómicamente `_sockets.TryRemove(id, out _)` seguido de `socket.Dispose()`.
4. **Reutilización del Multiplexor Singleton en `HealthEndpoints` (`OPT-06b`):** Inyectar `IConnectionMultiplexer` desde el contenedor de inyección de dependencias en el endpoint `/ready` y verificar `redis.IsConnected` (o ejecutar un `PING` sobre la base de datos multiplexada), eliminando por completo las llamadas a `ConnectionMultiplexer.ConnectAsync` por petición.

* **Ventajas:**
  - Erradicación total del sondeo SQL ocioso hacia PostgreSQL.
  - Reducción de $M$ consultas a 1 sola consulta SQL por comanda procesada.
  - Remoción $O(1)$ libre de bloqueos (*lock-free*) de WebSockets desconectados y liberación inmediata de memoria no administrada.
  - Mantenimiento constante de 1 única conexión TCP multiplexada hacia Redis sin importar la frecuencia de los healthchecks de Kubernetes.
* **Inconvenientes:**
  - Requiere ampliar la interfaz `ICatalogRepository` y actualizar las pruebas unitarias asociadas al worker y al gestor de WebSockets.

---

## Decisión de Arquitectura

Se aprueba la **Opción 3: Procesamiento Reactivo en Redis Streams, Proyección por Lote y Gestión de Ciclo de Vida de Conexiones Persistentes**:

1. **Eliminación de Sondeo SQL y Resolución por Lote en `OrderProcessorWorker.cs` (`OPT-05`):**
   ```csharp
   // 1. Obtención de tenants activos desde Redis Set o caché local en lugar de consultar db.Tenants cada 500ms
   var activeSlugs = await redisDb.SetMembersAsync("restocore:active_tenant_streams");

   // 2. En ProcessOrderMessageAsync: carga en lote (1 sola consulta SQL para todos los platos del pedido)
   var distinctItemIds = orderMessage.Items
       .Select(i => i.MenuItemId)
       .Distinct()
       .ToArray();

   var menuItems = await catalogRepo.GetMenuItemsWithModifiersByIdsAsync(distinctItemIds, ct);
   var menuItemsById = menuItems.ToDictionary(m => m.Id);

   foreach (var itemInput in orderMessage.Items)
   {
       if (!menuItemsById.TryGetValue(itemInput.MenuItemId, out var menuItem))
       {
           throw new InvalidOperationException($"MenuItem '{itemInput.MenuItemId}' no encontrado.");
       }
       // Validación de modificadores y construcción del snapshot en memoria
   }
   ```

2. **Implementación de Consulta por Lote en `CatalogRepository.cs` (`OPT-05`):**
   ```csharp
   public async Task<IReadOnlyList<MenuItem>> GetMenuItemsWithModifiersByIdsAsync(
       IReadOnlyCollection<Guid> itemIds,
       CancellationToken cancellationToken = default)
   {
       if (itemIds.Count == 0)
           return Array.Empty<MenuItem>();

       return await _context.MenuItems
           .AsNoTracking()
           .Include(m => m.ModifierGroups)
               .ThenInclude(g => g.Options)
           .Where(m => itemIds.Contains(m.Id) && !m.IsDeleted)
           .ToListAsync(cancellationToken);
   }
   ```

3. **Gestión Libre de Fugas en `KitchenWebSocketManager.cs` (`OPT-06`):**
   ```csharp
   public sealed class KitchenWebSocketManager
   {
       private readonly ConcurrentDictionary<Guid, WebSocket> _sockets = new();

       public Guid RegisterSocket(WebSocket socket)
       {
           var connectionId = Guid.NewGuid();
           _sockets.TryAdd(connectionId, socket);
           return connectionId;
       }

       public async Task BroadcastAsync(string payload, CancellationToken ct = default)
       {
           var buffer = Encoding.UTF8.GetBytes(payload);
           var segment = new ArraySegment<byte>(buffer);

           foreach (var (connectionId, socket) in _sockets)
           {
               if (socket.State == WebSocketState.Open)
               {
                   try
                   {
                       await socket.SendAsync(segment, WebSocketMessageType.Text, endOfMessage: true, ct);
                   }
                   catch
                   {
                       RemoveAndDisposeSocket(connectionId);
                   }
               }
               else
               {
                   RemoveAndDisposeSocket(connectionId);
               }
           }
       }

       public void RemoveAndDisposeSocket(Guid connectionId)
       {
           if (_sockets.TryRemove(connectionId, out var socket))
           {
               try { socket.Dispose(); } catch { /* Ignorar errores de limpieza en transporte cerrado */ }
           }
       }
   }
   ```

4. **Inyección de `IConnectionMultiplexer` Singleton en `HealthEndpoints.cs` (`OPT-06`):**
   ```csharp
   app.MapGet("/ready", async (
       IConnectionMultiplexer redis,
       ApplicationDbContext db,
       CancellationToken ct) =>
   {
       var redisReady = redis.IsConnected;
       var dbReady = await db.Database.CanConnectAsync(ct);

       return (redisReady && dbReady)
           ? Results.Ok(new { status = "ready" })
           : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
   });
   ```

---

## Consecuencias

### Positivas
* **Cero Tráfico SQL Ocioso en PostgreSQL:** Se eliminan las 120 consultas por minuto hacia la tabla `tenants` cuando no hay comandas nuevas, liberando el pool de conexiones para la Carta QR.
* **Despacho Ultrarrápido a Cocina:** El tiempo de validación y persistencia de un pedido de múltiples platos se reduce de ~85 ms a `< 15 ms` al realizar una única lectura SQL por lote.
* **Erradicación de Fugas de Memoria y Puertos TCP:** Las sesiones WebSocket desconectadas se purgan y liberan de forma determinista ($O(1)$), y el número de conexiones TCP hacia el puerto `6379` de Redis permanece invariable en 1 conexión multiplexada.

### Negativas
* **Sincronización del Conjunto de Streams Activos:** Al registrar un nuevo restaurante o publicar su primera orden en `OrderSubmissionService`, se debe asegurar la ejecución de `SADD restocore:active_tenant_streams {tenantSlug}` en Redis.

---

## Mapeo de Conformidad con AGENTS.md

| Requisito Inviolable | Estado | Justificación Técnica |
| :--- | :--- | :--- |
| **Persistencia PostgreSQL (`ADR-0003`)** | Cumplido | Optimiza el uso de Npgsql mediante traducción nativa `ANY(@itemIds)` y elimina el sondeo innecesario. |
| **Presupuesto de Latencia (`< 2s LCP`)** | Cumplido | Evita la contención del pool de conexiones de base de datos y de sockets TCP en el servidor de API. |
| **Exclusividad Documental** | Cumplido | Especificación documentada en `RestoCore-Docs` para guiar la refactorización del repositorio backend. |
| **Estilo Formal y Sin Emojis** | Cumplido | Redacción técnica, objetiva y libre de elementos gráficos informales. |

---

## Enlaces

* **ADR Previo:** [`ADR-0002: Patrón de Repositorios Separados para Persistencia`](./0002-separacion-repositorios.md)
* **ADR Previo:** [`ADR-0003: Selección de PostgreSQL con JSONB para Persistencia Semiestructurada`](./0003-migracion-postgresql.md)
* **ADR Previo:** [`ADR-0007: Procesamiento de Pedidos mediante Cola FIFO en Redis Streams y Notificación WebSockets`](./0007-procesamiento-pedidos-cola-fifo-websockets.md)
* **Diagnóstico Relacionado:** [`Diagnóstico Integral de Optimizaciones Técnicas: Backend RestoCore (OPT-05 y OPT-06)`](../diagnostico-optimizaciones-backend.md)
