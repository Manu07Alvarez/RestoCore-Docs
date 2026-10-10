# ADR-0006: Compilación Ahead-Of-Time (AOT) y Caché Perimetral en CDN para el Lienzo de Menú (Canvas)

* **Estado:** Aceptado
* **Fecha:** 2026-09-17
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore

---

## Contexto y Planteamiento del Problema

El soporte para personalización estética libre mediante la capa de maquetación visual "Modo Lienzo" (Canvas Mode) introduce un nivel significativo de dinamismo gráfico: planos bidimensionales, múltiples capas de profundidad (`z-index`), imágenes decorativas de fondo y posicionamiento libre de platos y categorías.

Si este lienzo visual se interpreta y calcula en tiempo de ejecución (Just-In-Time) directamente dentro del navegador del dispositivo móvil del comensal:
1. **Sobrecarga de CPU Móvil y Bloqueo de Hilo Principal:** Los dispositivos móviles de gama baja y media experimentan demoras perceptibles de cálculo geométrico y renderizado de DOM, elevando el First Contentful Paint (FCP) y el Largest Contentful Paint (LCP).
2. **Descarga de Medios No Optimizados:** La carga simultánea de imágenes de fondo y platos en alta resolución directamente desde el almacenamiento persistente de SeaweedFS compromete el ancho de banda móvil.
3. **Presión Innecesaria en la Base de Datos:** Cada lectura por código QR consultaría PostgreSQL para recomponer y validar la jerarquía de platos y las capas del lienzo, degradando la escalabilidad durante horarios pico de servicio.

Para garantizar de forma incondicional el presupuesto de latencia (< 2 segundos de LCP) establecido en las directrices arquitectónicas, se requiere una estrategia de renderizado y distribución estática desacoplada de la ejecución del cliente.

---

## Fuerzas Impulsoras (Decision Drivers)

* **Presupuesto de Latencia Móvil:** Carga total del menú y visualización de la carta QR en menos de 2.0 segundos bajo redes móviles 3G/4G.
* **Ahorro de CPU en Cliente:** Cero cálculos de posicionamiento o aplanamiento geométrico en el dispositivo móvil del comensal.
* **Eficiencia de Almacenamiento y Red:** Conversión y compresión automatizada de imágenes de SeaweedFS a formatos web modernos (WebP y AVIF) con variantes adaptativas (`srcset`).
* **Protección de Base de Datos Transaccional:** Absorción total de las peticiones públicas de lectura mediante nodos perimetrales (CDN) sin golpear PostgreSQL.
* **Resiliencia Operativa:** Preservación de la última versión compilada válida en la CDN ante cualquier anomalía en el pipeline de compilación.

---

## Opciones Consideradas

1. **Opción 1: Interpretación y Renderizado Dinámico en Tiempo de Ejecución en el Navegador (JIT):**
   El navegador móvil recibe el catálogo crudo y el objeto `layout_config` vía JSON, calculando el diseño visual dinámicamente. Descartada por alto consumo de batería, bloqueo de hilo de renderizado y riesgo de violar el presupuesto de latencia de 2 segundos.
2. **Opción 2: Server-Side Rendering (SSR) Dinámico Bajo Demanda por Solicitud:**
   El backend ensambla y renderiza el HTML/JSON del lienzo en cada petición entrante. Descartada porque incrementa el Time To First Byte (TTFB) y sobrecarga la infraestructura de cómputo en picos de escaneo simultáneos en salones.
3. **Opción 3 (Seleccionada): Compilación Ahead-Of-Time (AOT) en el Backend y Distribución Perimetral en CDN:**
   El backend ejecuta un pipeline de compilación estática activado de forma reactiva al momento de publicar cambios desde el panel administrativo (CMS). El resultado plano y optimizado se almacena en caché en la red perimetral (CDN) con cabeceras HTTP de larga duración.

---

## Decisión Tomada

Se adopta la **Opción 3: Implementar un flujo de compilación Ahead-Of-Time (AOT) en el backend y almacenamiento perimetral distribuido en CDN**.

Al momento en que el usuario con rol autorizado ejecuta la publicación del menú en el panel administrativo (`POST /api/v1/admin/menu/publish`):
1. **Aplanamiento Geométrico AOT:** El servicio backend valida el esquema del lienzo (`layout_config`), calcula las dimensiones relativas precalculadas y normaliza el árbol de capas y coordenadas en una estructura de lectura directa.
2. **Optimización de Activos de SeaweedFS:** Se procesan las imágenes asociadas al lienzo generando variantes optimizadas en formatos WebP y AVIF con atributos adaptativos (`srcset`), reduciendo drásticamente el peso de transferencia.
3. **Generación de Artefacto y Publicación Perimetral:** Se empaqueta el artefacto estático final con un identificador unívoco de versión (`version_hash`) y se deposita en la CDN perimetral.
4. **Invalidación y Purgado de Caché:** El backend emite una instrucción de purgado selectivo en la CDN para las claves de caché asociadas al restaurante (`tenant_slug`), garantizando la propagación perimetral.
5. **Políticas de Caché HTTP:** Las respuestas de lectura pública (`GET /api/v1/tenants/{tenant_slug}/menu`) se configuran con `Cache-Control: public, max-age=3600, s-maxage=86400` y tags de invalidación perimetral.

---

## Consecuencias

### Positivas
* **Cumplimiento Estricto del Presupuesto de Latencia:** La entrega desde el nodo perimetral de la CDN y la ausencia de cómputo en el cliente aseguran tiempos de despliegue visual muy por debajo de los 2.0 segundos de LCP.
* **Descarga Masiva de la Base de Datos:** PostgreSQL no recibe solicitudes de lectura de comensales en el salón; la totalidad de la demanda de visualización del menú es absorbida por la CDN perimetral.
* **Optimización Automatizada de Medios:** Las imágenes se transfieren con pesos reducidos y en los formatos más eficientes soportados por el navegador del comensal.
* **Alta Disponibilidad y Resiliencia:** Si ocurre un fallo en el proceso de compilación AOT, la CDN retiene y continúa sirviendo la última versión estable sin interrumpir el servicio en el salón.

### Negativas
* **Gestión de Purgado e Invalidación Perimetral:** Requiere mantener integración con las APIs de purgado de la CDN (Cloudflare / Fastly) y gestionar posibles discrepancias temporales de propagación (habitualmente < 300 ms).
* **Latencia en la Acción de Publicar:** La acción de publicación en el CMS no es instantánea; involucra un trabajo asíncrono en backend con un tiempo máximo de compilación establecido en menos de 3 segundos.
