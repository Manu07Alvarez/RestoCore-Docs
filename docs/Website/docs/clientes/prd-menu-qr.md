# Documento de Requisitos de Producto (PRD): Carta Digital y Capa Aditiva de Lienzo (Canvas Layout)

Este documento establece las especificaciones funcionales, límites de alcance, restricciones y criterios de aceptación para el módulo de **Carta Digital del Cliente y Maquetación de Lienzo Personalizado (Canvas Mode)** (Módulo 01 del Playbook de Ingeniería y Fase 3 del Flujo de Trabajo Homologado SDD).

---

## 1. Resultados (Outcomes)
* Permitir a los comensales visualizar la oferta gastronómica completa (categorías, platos, precios, modificadores y fotografías) de forma pública e instantánea desde sus dispositivos móviles tras escanear un código QR.
* El cliente visualizará el menú en una maquetación predeterminada secuencial ordenada por categorías, salvo que el administrador active una configuración visual personalizada (Canvas Mode).
* Garantizar el cumplimiento estricto del presupuesto de rendimiento, completando el renderizado principal en menos de 2 segundos (< 2s LCP) tanto en la plantilla estándar como en la maquetación de lienzo personalizado, sin requerir descarga de aplicaciones ni creación de cuentas.

---

## 2. Límites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Maquetación Predeterminada Secuencial:** Visualización dinámica estándar del menú estructurada jerárquicamente por categorías (ejemplo: Entradas, Platos Principales, Bebidas, Postres).
* **Capa Aditiva de Maquetación Visual (Canvas Mode):** Modo visual opcional donde el administrador puede definir una disposición libre de platos sobre un lienzo gráfico, manteniendo intacto el catálogo de datos de negocio.
* **Editor Visual Interactivo en Panel de Administración:** Herramienta interactiva dentro del CMS para arrastrar, escalar, rotar y posicionar libremente tarjetas o elementos de platos sobre el lienzo.
* **Personalización de Fondo y Capas:** Configuración de color de fondo o imagen personalizada (subida asíncrona a SeaweedFS) y ordenamiento de profundidad de capas (`z-index`) para cada elemento del lienzo.
* **Filtros e Indicadores Nutricionales:** Filtrado e identificación visual de alérgenos y etiquetas dietarias (ejemplo: Apto Celíacos / Gluten-Free, Vegano, Vegetariano).
* **Personalización mediante Modificadores:** Modal interactivo para seleccionar opciones de personalización de un plato (ejemplo: punto de cocción, acompañamientos, agregados con deltas de precio).
* **Identificación de Mesa en Salón:** Captura del token de seguridad de la mesa (`table_token`) mediante la URL del QR para vincular la sesión del usuario a una ubicación física en el local.
* **Adaptación Responsiva de Lienzo:** Escalado proporcional automático del lienzo a diferentes resoluciones de pantallas móviles (iOS y Android) evitando desbordamientos de interfaz.
* **Fallback Automático de Resiliencia:** Conmutación inmediata y transparente a la plantilla predeterminada secuencial si la configuración del lienzo no está activa, falla al cargar o contiene un esquema corrupto.

### Funcionalidades Excluidas (Out-of-Scope - MVP)
* **Animaciones Complejas en Video o 3D:** Renderizado de elementos tridimensionales interactivos o fondos animados en video de alto peso.
* **Edición Directa de Código CSS/HTML:** Inyección de estilos libres o scripts por parte de los usuarios administradores.
* **Registro o Autenticación de Clientes:** La visualización de la Carta QR es 100% anónima; no se solicita login ni registro de usuario.
* **Pagos en Línea desde la Carta:** Integración con pasarelas de pago (diferido para iteraciones posteriores).
* **Llamada Digital a Mozo:** Botón de solicitud de atención física en mesa desde el celular (diferido).

---

## 3. Restricciones y Asunciones
* **Presupuesto de Latencia y Rendimiento de Entrega (< 2s LCP):** La entrega del artefacto estático compilado desde la CDN perimetral al comensal no debe superar los 2 segundos de tiempo total de respuesta (< 2.0s LCP) bajo redes móviles 3G/4G/5G, tanto en la plantilla estándar como en la maquetación de lienzo Canvas.
* **Restricción de Rendimiento de Compilación AOT (< 3s Pipeline):** El pipeline de compilación Ahead-Of-Time (AOT) en el backend debe completarse en menos de 3 segundos tras la confirmación de publicación (`POST /api/v1/admin/menu/publish`) desde el panel administrativo.
* **Gestión de Activos y Variantes Adaptativas:** Todas las imágenes del lienzo (fondos y platos) deben ser procesadas y entregadas mediante variantes adaptativas (`srcset`) optimizadas para pantallas móviles en formatos modernos WebP y AVIF a partir de los originales almacenados en SeaweedFS.
* **Almacenamiento y Caché Perimetral (CDN):** El menú público se sirve a través de la red perimetral (`ADR-0005` y `ADR-0006`) con cabeceras de caché HTTP (`Cache-Control: public, max-age=3600, s-maxage=86400`). El backend emite una orden de purgado de caché inmediata al publicar cambios.
* **Adaptación de Escala Responsiva:** El lienzo renderizado debe normalizar las coordenadas relativas respecto a un ancho base estándar garantizando legibilidad en terminales móviles sin scroll horizontal indeseado.
* **Desacoplamiento Estricto de Datos y Vista:** La configuración del lienzo se almacena como un objeto semiestructurado opcional (`layout_config`) en PostgreSQL `JSONB`, desacoplado de las entidades relacionales (`ADR-0005`).
* **Carga Asíncrona de Fondos e Imágenes:** Los fondos personalizados del lienzo emplean URLs pre-firmadas hacia SeaweedFS (`ADR-0004`).
* **Medición de Rendimiento con Trazas (OpenTelemetry):** El presupuesto de latencia se auditará exclusivamente mediante trazas distribuidas y `spans` delimitados.
* **Registro de Logs Estructurados y Privacidad:** Las excepciones operativas se registrarán en formato JSON estructurado con `tenant_id`, `http.status_code`, `error.code`, `trace_id` y `span_id`. Prohibido almacenar PII.
* **Arquitectura de API:** Consumo exclusivo a través de REST API (`ADR-0001`).

---

## 4. Decisiones Previas
* **ADR-0001:** Cumplimiento de Spec-Driven Development y Docs-as-Code.
* **ADR-0002:** Separación de repositorios (Frontend `resto-core-front`, Backend `resto-core-back`, Specs `RestoCore-Docs`).
* **ADR-0003:** Persistencia semiestructurada en PostgreSQL utilizando columnas `JSONB` e índices `GIN`.
* **ADR-0004:** Carga asíncrona de imágenes mediante URLs pre-firmadas a SeaweedFS.
* **ADR-0005:** Presupuesto de latencia < 2s LCP y caching perimetral en CDN.
* **ADR-0006:** Compilación Ahead-Of-Time (AOT) y Caché Perimetral en CDN para el Lienzo de Menú (Canvas).
* **ADR-0006 (Seguridad):** Seguridad declarativa y autorización desacoplada con OPA y Rego.
* **ADR-0007:** Procesamiento de pedidos con cola FIFO y eventos WebSockets en tiempo real.
* **ADR-0008:** Desacoplamiento entre el Catálogo de Datos y la Capa de Maquetación Visual (Canvas).

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista responsive de la Carta QR consumiendo el artefacto plano estático precompilado por la CDN.
* Implementar el renderizado de imágenes adaptativas mediante `srcset` y formatos WebP/AVIF servidos desde los nodos perimetrales.
* Implementar el editor visual interactivo en el panel de administración (arrastrar elementos, redimensionar, asignar `z-index`, seleccionar fondos y previsualizar).
* Conectar el botón de "Publicar Menú" en el CMS con el endpoint `POST /api/v1/admin/menu/publish`, mostrando el estado del trabajo de compilación AOT.
* Implementar la lógica de fallback hacia la maquetación secuencial ante errores en la carga del `layout_config`.

### Tareas de Backend (`resto-core-back`)
* Implementar el endpoint `POST /api/v1/admin/menu/publish` para desencadenar el pipeline asíncrono de compilación AOT, compresión de activos e invalidación de caché.
* Diseñar el pipeline de aplanamiento geométrico AOT en menos de 3 segundos SLA.
* Implementar el servicio de optimización de imágenes (WebP/AVIF y generación de `srcset`) conectado con SeaweedFS.
* Configurar la integración con la API de la CDN para emisión de purgado de caché selectivo por tag del tenant.
* Configurar cabeceras de respuesta HTTP (`Cache-Control: public, max-age=3600, s-maxage=86400`) en `GET /api/v1/tenants/{tenant_slug}/menu`.

---

## 6. Criterios de Verificación (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ permitir el acceso a la Carta QR pública sin solicitar credenciales de inicio de sesión ni registro previo.
* **Ubiquitous (Lienzo):** El sistema DEBERÁ generar la vista pública del menú utilizando la plantilla predeterminada ordenada por categorías cuando no exista una configuración de lienzo activa.
* **State-Driven (Lienzo):** MIENTRAS la opción de maquetación personalizada esté habilitada por el administrador, el sistema DEBERÁ aplicar las coordenadas, fondos y capas definidas en el objeto de configuración del lienzo.
* **Event-Driven:** CUANDO el cliente seleccione un plato en la carta (estándar o lienzo), el sistema DEBERÁ desplegar el modal de modificadores mostrando los deltas de precio aplicables.
* **State-Driven:** MIENTRAS el cliente mantenga seleccionado un filtro dietario (ej. "Apto Celíacos"), el sistema DEBERÁ ocultar todos los platos que no contengan dicha etiqueta de certificación.
* **Unwanted Behavior (Lienzo Fallido):** SI la carga del archivo de configuración del lienzo falla o no es válido, ENTONCES el sistema DEBERÁ alternar automáticamente al renderizado de la plantilla predeterminada.
* **Unwanted Behavior:** SI la URL del código QR contiene un `table_token` inválido o deshabilitado, ENTONCES el sistema DEBERÁ permitir la lectura del menú notificando sutilmente que la mesa no está activa para interacciones de pedido.
* **Optional Features:** DONDE la mesa posea un `table_token` activo, el sistema DEBERÁ guardar la asociación de la mesa en el contexto del navegador.

### Escenarios Gherkin

```gherkin
Feature: Visualización de Carta QR y Maquetación de Lienzo Personalizado
  Scenario: Carga pública con plantilla predeterminada por categorías
    Given que el restaurante "la-parrilla" no tiene activa la maquetación de lienzo
    When un cliente escanea el código QR de la mesa
    Then el sistema DEBERÁ renderizar el menú estructurado secuencialmente por categorías
    And el tiempo de carga del elemento principal DEBERÁ ser menor a 2 segundos (LCP < 2s)

  Scenario: Renderizado de lienzo personalizado Canvas activo
    Given que el administrador activó la maquetación de lienzo con imagen de fondo y 8 platos posicionados
    When un comensal abre la URL pública de la carta digital
    Then el sistema DEBERÁ posicionar los platos según las coordenadas x, y y capas z-index del layout_config
    And DEBERÁ escalar proporcionalmente el lienzo al ancho del dispositivo móvil

  Scenario: Resiliencia ante configuración de lienzo corrupta o inaccesible
    Given que el objeto layout_config del restaurante contiene datos geométricos inválidos
    When el cliente solicita la carta digital
    Then el sistema DEBERÁ detectar el fallo de esquema
    And DEBERÁ conmutar automáticamente al renderizado de la plantilla secuencial por categorías sin interrumpir el servicio
```
