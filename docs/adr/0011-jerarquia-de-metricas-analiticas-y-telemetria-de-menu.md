# ADR-0011: Jerarquía de Métricas Analíticas por Fases y Modelo de Telemetría de Menú

* **Estado:** Aceptado
* **Fecha:** 2026-10-09
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore

---

## Contexto y Planteamiento del Problema

La plataforma RestoCore requiere dotar a los administradores y dueños de restaurantes de capacidades analíticas para la toma de decisiones basada en datos. Los requerimientos analíticos abarcan desde el tráfico de apertura de la carta digital y popularidad de platos, hasta la rotación de mesas, indicadores de revenue management (RevPASH) y métricas de contabilidad financiera avanzada (Costo Primo / Prime Cost, Varianza de Alimentos y Tiempos de Cocina).

Implementar todas las métricas en una única fase introduce riesgos severos:
1. **Acoplamiento Prematuro con Sistemas Externos:** Métricas avanzadas como el Costo Primo o la Varianza de Alimentos exigen integraciones complejas con sistemas de Punto de Venta (POS), Pantallas de Cocina (KDS), Sistemas de Gestión de Recetas (RMS) y Nóminas de Personal, las cuales no están disponibles en la etapa fundacional de la carta digital QR.
2. **Impacto en el Presupuesto de Rendimiento:** La captura de eventos analíticos no debe interferir con el presupuesto estricto de latencia del menú público (< 2s LCP en dispositivos móviles).
3. **Complejidad Innecesaria en el MVP:** Los restaurantes necesitan visibilidad inmediata sobre la adopción del menú QR y la rentabilidad de sus platos (Ingeniería de Menú) sin barreras de configuración externa.

---

## Fuerzas Impulsoras (Decision Drivers)

* **Presupuesto de Latencia (< 2s LCP):** El registro analítico de visualizaciones de la carta o platos debe ser 100% asíncrono y desacoplado del renderizado del comensal.
* **Progresión por Fases de Negocio:** Priorizar métricas nativas del catálogo digital que no dependan de software de terceros antes de abordar analítica de salón y financiera.
* **Ingeniería de Menú (Matriz de Rentabilidad):** Capacidad de clasificar platos en la matriz clásica (Estrellas, Caballos de Batalla, Puzzles y Perros) combinando popularidad de visualización con margen de contribución.
* **Aislamiento Multi-Tenant y Seguridad:** Garantizar que los agregados estadísticos y reportes pertenezcan estrictamente al restaurante autenticado (`TenantId`).
* **Protección de Privacidad:** Cumplimiento de políticas de telemetría evitando la recolección de información personal identificable (PII) en los eventos de navegación de clientes anónimos.

---

## Opciones Consideradas

1. **Opción 1: Enfoque Monolítico Todo-en-Uno (Cálculo Síncrono de Todas las Métricas):**
   Intentar calcular tráfico, RevPASH y Costo Primo en la base de datos principal de forma unificada desde el día uno. Descartada por requerir integraciones de nómina e inventario inexistentes en el MVP y por degradar la latencia de base de datos.
2. **Opción 2: Delegación Externa en Herramientas de Analítica Web (Google Analytics / Mixpanel):**
   Inyectar scripts de seguimiento de terceros en la carta QR. Descartada porque añade peso de JavaScript en el cliente móvil, vulnera el presupuesto de latencia (< 2s LCP), y no se integra con los márgenes de costo del catálogo en PostgreSQL.
3. **Opción 3 (Elegida): Jerarquización de Métricas en Tres Niveles de Prioridad con Captura Asíncrona:**
   Estructurar el dominio analítico en tres fases incrementales bien delimitadas, capturando eventos de navegación de forma asíncrona y pre-agregando estadísticas de catálogo en PostgreSQL para consulta del panel administrativo.

---

## Decisión de Arquitectura

Se adopta una **Jerarquización de Métricas en Tres Niveles de Prioridad** y una arquitectura de agregación analítica desacoplada:

### Nivel 1: Prioridad Alta (Fase MVP / Tráfico de Menú e Ingeniería de Menú)
Métricas capturadas de forma nativa en la plataforma sin requerir integraciones con sistemas de terceros:
* **Tráfico de Acceso QR y Visitas (Día / Mes):** Conteo agregado de lecturas de la carta pública discriminado temporalmente. Indicador primario de adopción del canal digital.
* **Platos Más Vistos y Popularidad (Ingeniería de Menú):** Registro de aperturas del modal o visualizaciones por plato. Permite construir la **Matriz de Ingeniería de Menú** combinando popularidad con margen de contribución:
  * **Estrellas (Stars):** Alta popularidad y alto margen de contribución.
  * **Caballos de Batalla (Plowhorses):** Alta popularidad y bajo margen de contribución.
  * **Puzzles:** Baja popularidad y alto margen de contribución.
  * **Perros (Dogs):** Baja popularidad y bajo margen de contribución.
* **Categorías Más Populares:** Frecuencia de navegación y apertura de secciones de la carta.

### Nivel 2: Prioridad Media (Plan Pro / Analítica de Rendimiento Temporal y Sala)
Métricas orientadas a la optimización operativa en sala y gestión de ingresos (Revenue Management):
* **Horas Pico de Visitas y Distribución Temporal:** Curva de demanda horaria para optimizar dotación de personal.
* **Tipo de Dispositivo y Rendimiento de Navegación:** Segmentación de tráfico por agente de usuario (móvil vs. escritorio) para auditar el cumplimiento del rendimiento de interfaz.
* **RevPASH (Revenue Per Available Seat-Hour) y Rotación de Mesas (POSTPUESTO / DEFERRED - ADR-0012):** La medición de ocupación y tiempo de permanencia mediante QR queda aplazada. Se integrará con datos fidedignos en fases posteriores a través de un módulo de turnos y recepción (Waitlist/Turnos) o integración de comandas.

### Nivel 3: Prioridad Baja (Fases Avanzadas / Integraciones Financieras y Operativas de Cocina)
Métricas que dependen de integración con software externo (POS, KDS, RMS y Nómina):
* **Costo Primo (Prime Cost):** Suma del costo de materias primas (COGS) y costo laboral total (objetivo 55% - 65%).
* **Varianza de Costo de Alimentos (Teórico vs. Real):** Comparación entre consumo teórico de fichas técnicas y consumo real de inventario físico.
* **Tiempo de Comanda en Cocina (Kitchen Ticket Time):** Duración de elaboración registrada por el KDS desde comanda enviada hasta despacho.
* **Rotación de Inventarios (Inventory Turnover Ratio - ITR):** Velocidad de conversión de materias primas en platos vendidos.

---

## Consecuencias

### Positivas
* **Entrega Rápida y Foco de Negocio:** Permite disponibilizar valor analítico inmediato a los restaurantes en el MVP sin bloquear el lanzamiento esperando integraciones complejas de terceros.
* **Preservación del Rendimiento:** La carta QR conserva su presupuesto < 2s LCP al desacoplar el registro de eventos analíticos del hilo de renderizado principal.
* **Base para Revenue Management e Ingeniería de Menú:** Proporciona a los administradores la matriz estratégica para optimizar precios y recetas basándose en datos reales de interacción.

### Negativas
* **Limitación Inicial en Reportes Financieros:** El cálculo del Costo Primo y la Varianza queda postergado hasta la disponibilidad de módulos de inventario y nómina en fases posteriores.
* **Necesidad de Tareas Programadas de Agregación:** Requiere procesos en segundo plano para consolidar vistas analíticas horarias y diarias en PostgreSQL para evitar consultas pesadas en tiempo real.
