# Especificación Formal de Requisitos del Menú Digital (Sintaxis EARS)

Este documento especifica de forma rigurosa y no ambigua el comportamiento del sistema para el módulo de **Carta Digital y Capa Aditiva de Lienzo (Canvas Layout)** utilizando los patrones de la sintaxis **EARS** (*Easy Approach to Requirements Syntax*).

---

## 1. Requisitos de Maquetación de Menú y Capa de Lienzo (Canvas Mode)

### 1.1. Plantilla Predeterminada Secuencial
* **[EARS-MENU-001] (Ubiquitous):**
  El sistema DEBERÁ generar la vista pública del menú utilizando la plantilla predeterminada ordenada por categorías cuando no exista una configuración de lienzo activa.
* **[EARS-MENU-002] (Ubiquitous):**
  El sistema DEBERÁ agrupar secuencialmente los platos activos dentro de sus respectivas categorías ordenadas por el atributo posicional `sort_order`.

### 1.2. Maquetación Personalizada en Modo Lienzo (Canvas Mode)
* **[EARS-MENU-003] (State-Driven):**
  MIENTRAS la opción de maquetación personalizada esté habilitada por el administrador (`canvas_enabled == true`), el sistema DEBERÁ aplicar las coordenadas (`x`, `y`), fondos (`background_url`, `background_color`) y capas (`z_index`) definidas en el objeto de configuración del lienzo (`layout_config`).
* **[EARS-MENU-004] (Event-Driven):**
  CUANDO el usuario acceda desde un dispositivo con ancho de pantalla variable, el sistema DEBERÁ escalar proporcionalmente las dimensiones y posiciones absolutas del lienzo en base a la relación de aspecto de diseño.
* **[EARS-MENU-005] (Event-Driven):**
  CUANDO el comensal pulse sobre cualquier elemento de plato dispuesto en el lienzo, el sistema DEBERÁ abrir el modal interactivo de detalle y selección de modificadores correspondiente.

### 1.3. Resiliencia, Fallback y Comportamiento Ante Fallos
* **[EARS-MENU-006] (Unwanted Behavior):**
  SI la carga del archivo de configuración del lienzo falla o no es válido, ENTONCES el sistema DEBERÁ alternar automáticamente al renderizado de la plantilla predeterminada secuencial sin interrumpir la disponibilidad del servicio.
* **[EARS-MENU-007] (Unwanted Behavior):**
  SI una imagen de fondo de lienzo referenciada en SeaweedFS no se encuentra disponible (código HTTP 404 o timeout), ENTONCES el sistema DEBERÁ renderizar el color de fondo de respaldo (`background_color`) o el fondo base de la aplicación.
* **[EARS-MENU-008] (Unwanted Behavior):**
  SI el objeto `layout_config` contiene un identificador de plato (`dish_id`) que ha sido eliminado del catálogo, ENTONCES el sistema DEBERÁ omitir el renderizado de dicho elemento gráfico sin invalidar los elementos restantes del lienzo.

---

## 2. Requisitos de Gestión Administrativa del Lienzo

### 2.1. Editor Visual y Mutación
* **[EARS-CANVAS-001] (Event-Driven):**
  CUANDO el administrador modifique la posición, dimensiones o capa de un plato en el editor visual y confirme la acción, el sistema DEBERÁ enviar una solicitud `PUT /api/v1/admin/menu/layout` con el esquema JSON normalizado.
* **[EARS-CANVAS-002] (Event-Driven):**
  CUANDO el administrador solicite restablecer el lienzo, el sistema DEBERÁ desactivar la bandera `canvas_enabled` y restituir la maquetación predeterminada secuencial.
* **[EARS-CANVAS-003] (Optional Features):**
  DONDE el administrador configure una imagen de fondo para el lienzo, el sistema DEBERÁ solicitar una URL pre-firmada a SeaweedFS (`ADR-0004`) para la transmisión directa del archivo binario.

---

---

## 3. Requisitos de Compilación AOT y Caché Perimetral (CDN)

### 3.1. Pipeline de Compilación y Optimización
* **[EARS-AOT-001] (Event-Driven):**
  CUANDO el administrador ejecute la publicación del menú, el sistema DEBERÁ compilar la estructura plana del lienzo, optimizar las imágenes de SeaweedFS y emitir la orden de purgado de caché en la CDN del restaurante.
* **[EARS-AOT-002] (Ubiquitous):**
  El sistema DEBERÁ procesar y generar variantes adaptativas (`srcset`) en formatos comprimidos WebP y AVIF para toda imagen vinculada al lienzo durante el ciclo de compilación AOT.
* **[EARS-AOT-003] (State-Driven):**
  MIENTRAS la CDN retenga la versión compilada válida del lienzo, el sistema DEBERÁ responder las solicitudes públicas del menú directamente desde el nodo perimetral sin consultar la base de datos transaccional.

### 3.2. Tolerancia a Fallos y Notificación
* **[EARS-AOT-004] (Unwanted Behavior):**
  SI el proceso de compilación AOT del lienzo falla, ENTONCES el sistema DEBERÁ mantener activa la última versión compilada válida en la CDN y notificar la falla en el panel administrativo.
* **[EARS-AOT-005] (Unwanted Behavior):**
  SI la llamada a la API de purgado de la CDN experimenta un fallo o timeout, ENTONCES el sistema DEBERÁ registrar el evento estructurado de error con `error.code="CDN_PURGE_FAILURE"` y reintentar la invalidación de forma asíncrona.

---

## 4. Matriz de Trazabilidad EARS

| Identificador | Tipo EARS | Entidad / Componente | Verificación Automatizada |
| :--- | :--- | :--- | :--- |
| **EARS-MENU-001** | Ubiquitous | Menú Público / Web Client | Test E2E de carga sin layout config |
| **EARS-MENU-003** | State-Driven | Renderer de Lienzo | Test de renderizado de coordenadas x/y |
| **EARS-MENU-006** | Unwanted Behavior | Resiliencia de Frontend | Test de fallback con JSON corrupto |
| **EARS-CANVAS-001**| Event-Driven | Admin CMS / API Gateway | Test de endpoint `PUT /layout` |
| **EARS-AOT-001** | Event-Driven | AOT Pipeline / Backend | Test de integración `POST /publish` y purgado |
| **EARS-AOT-003** | State-Driven | CDN Edge / Cloudflare | Test de respuesta HTTP con cabeceras de caché |
| **EARS-AOT-004** | Unwanted Behavior | AOT Pipeline / CMS | Test de resiliencia y retención de versión previa |
