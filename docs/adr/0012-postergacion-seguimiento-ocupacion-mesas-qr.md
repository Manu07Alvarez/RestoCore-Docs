# ADR-0012: Postergación del Seguimiento de Ocupación de Mesas por QR y Visión de Módulo de Turnos (Waitlist)

* **Estado:** Pospuesto (Deferred)
* **Fecha:** 2026-10-09
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore

---

## Contexto y Planteamiento del Problema

Se evaluó la posibilidad de medir la ocupación física de mesas y el tiempo de permanencia de comensales en salón a través de las lecturas y eventos del código QR ubicado en cada mesa física (`table_token`). 

El objetivo preliminar era derivar métricas operativas como la rotación de mesas (*Table Turnover*) y el tiempo del ciclo de servicio directamente desde la actividad del comensal en la carta digital, sin requerir hardware adicional ni intervención manual del personal.

Sin embargo, el análisis técnico y operacional reveló inconsistencias estructurales graves en este enfoque:
1. **Ausencia de Correlación entre Escaneo y Ocupación Real:** El acto de escanear un código QR no equivale a ocupar una mesa. Un cliente puede escanear el QR desde fuera del restaurante, escanearlo múltiples veces durante la comida desde distintos celulares, o compartir el enlace. Del mismo modo, una mesa puede estar ocupada por comensales que eligen no abrir la carta QR.
2. **Desconocimiento del Número Exacto de Comensales:** El escaneo no indica si la mesa está ocupada por 1, 2 o 6 personas.
3. **Falsa Determinación del Fin de Estancia y Complejidad de Ventanas Temporales (TTL):** La carta web no emite un evento natural de "abandono de mesa". Intentar inferir el fin de la ocupación mediante tiempos de inactividad arbitrarios (TTL / timeouts en Redis o PostgreSQL) produce falsos positivos, mediciones inexactas y sobrecarga innecesaria en la base de datos transaccional.

---

## Fuerzas Impulsoras (Decision Drivers)

* **Exactitud de Métricas de Negocio:** Una métrica operativa errónea o ruidosa es más perjudicial para la gestión del restaurante que no tenerla disponible en la etapa inicial.
* **Simplicidad y Robustez del MVP:** Evitar esquemas complejos de inferencia heurística basada en sesiones de mesa efímeras y ventanas de expiración (TTL).
* **Presupuesto de Rendimiento (< 2s LCP):** No saturar el backend con latidos periódicos (*heartbeats*) ni gestión de sesiones de mesa complejas desde terminales móviles de comensales anónimos.
* **Rol Apropiado del Identificador de Mesa:** El `table_token` o identificador de mesa debe reservarse exclusivamente como parámetro de contexto opcional para asociar pedidos y llamados, no como sensor de presencia física.

---

## Opciones Consideradas

1. **Opción 1: Inferencia Heurística de Ocupación por Sesiones QR y TTLs:**
   Crear una tabla de sesiones activas en Redis/PostgreSQL por mesa, abriendo la sesión con el primer escaneo y cerrándola tras N minutos de inactividad. Descartada por imprecisión fundamental, incapacidad de conocer el número real de comensales y degradación de rendimiento.
2. **Opción 2: Postergación del Seguimiento por QR y Delegación a Módulo Dedicado de Turnos/Recepción (Elegida):**
   Descartar formalmente la medición de ocupación y tiempo de estancia vía QR en el MVP. Postergar estas métricas hasta la implementación de un **Módulo de Gestión de Turnos y Recepción (Waitlist/Turnos)**, donde el personal o el tótem de entrada registran con precisión la cantidad real de comensales, hora exacta de asignación de mesa y liberación física de la misma.

---

## Decisión de Arquitectura

Se declara **Pospuesto (Deferred)** el seguimiento de ocupación y tiempo de permanencia derivado del escaneo de códigos QR.

1. **Descarte en el MVP:** Queda estrictamente fuera del alcance de la primera versión cualquier cálculo automático de rotación o tiempo de ocupación basado en la actividad web del comensal.
2. **Preservación Contextual del Identificador de Mesa:** El parámetro `table_token` se mantiene únicamente como atributo contextual opcional en la consulta del menú y en la creación de pedidos, sin persistir estados de presencia ni disparar contadores de ocupación.
3. **Visión de Expansión Futura (Módulo Waitlist/Turnos):** Las métricas precisas de ocupación de sala, rotación de mesas y cálculo estricto de RevPASH se integrarán en una fase posterior mediante un módulo de control de flujo de salón, capturando:
   * Cantidad real y verificada de comensales sentados por mesa.
   * Marca de tiempo exacta de asignación (mesa ocupada).
   * Marca de tiempo exacta de cierre de comanda y desocupación (mesa liberada).

---

## Consecuencias

### Positivas
* **Eliminación de Métricas Fantasma:** Se evita entregar reportes engañosos a los dueños de restaurantes basados en inferencias inexactas.
* **Reducción de Deuda Técnica y Carga en Base de Datos:** Se elimina la necesidad de manejar heurísticas de sesiones efímeras, trabajos periódicos de expiración (TTL sweeping) y latidos desde el navegador móvil.
* **Enfoque en Métricas de Alto Valor en MVP:** El equipo focaliza sus esfuerzos en las métricas de Nivel 1 (Tráfico global de visitas QR y la Matriz de Ingeniería de Menú).

### Negativas
* **Postergación de RevPASH y Rotación de Mesas:** Los reportes analíticos de salón y rendimiento por asiento-hora quedan aplazados hasta el desarrollo del módulo de recepción y turnos o integración con el sistema de comandas.
