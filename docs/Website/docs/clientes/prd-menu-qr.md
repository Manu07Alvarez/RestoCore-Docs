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
* **Presupuesto de Latencia (< 2s LCP):** El renderizado del elemento visual principal debe completar en menos de 2.0 segundos bajo conexiones móviles 3G/4G/5G, independientemente de si se renderiza la plantilla estándar o el lienzo Canvas.
* **Adaptación de Escala Responsiva:** El lienzo renderizado debe normalizar las coordenadas relativas respecto a un ancho base estándar (ej. 1080px o porcentaje relativo) garantizando legibilidad en pantallas compactas sin scroll horizontal indeseado.
* **Desacoplamiento Estricto de Datos y Vista:** La configuración del lienzo se almacena como un objeto semiestructurado opcional (`layout_config`) desacoplado de las entidades relacionales de categorías y platos (`ADR-0005: Desacoplamiento entre Catálogo y Capa Visual Canvas`).
* **Carga Asíncrona de Fondos e Imágenes:** Los fondos personalizados del lienzo deben emplear el flujo de carga asíncrona mediante URLs pre-firmadas hacia SeaweedFS (`ADR-0004`).
* **Medición de Rendimiento con Trazas (OpenTelemetry):** El presupuesto de latencia se auditará exclusivamente mediante instrumentación de trazas distribuidas y `spans`, monitoreando tiempos en CDN, Backend y base de datos.
* **Registro de Logs Estructurados y Privacidad:** Las excepciones operativas se registrarán en formato estructurado JSON indexando `tenant_id`, `http.status_code` y `error.code`. Queda prohibido registrar PII o datos sensibles.
* **Almacenamiento en Caché Perimetral (CDN):** El menú público se sirve a través de la CDN perimetral (`ADR-0005`) utilizando el `version_hash` del Tenant. La mutación del layout invalida la caché de forma atómica.
* **Arquitectura de API:** Consumo exclusivo a través de REST API (`ADR-0001`).

---

## 4. Decisiones Previas
* **ADR-0001:** Cumplimiento de Spec-Driven Development y Docs-as-Code.
* **ADR-0002:** Separación de repositorios (Frontend `resto-core-front`, Backend `resto-core-back`, Specs `RestoCore-Docs`).
* **ADR-0003:** Persistencia semiestructurada en PostgreSQL utilizando columnas `JSONB` e índices `GIN`.
* **ADR-0004:** Carga asíncrona de imágenes mediante URLs pre-firmadas a SeaweedFS.
* **ADR-0005:** Presupuesto de latencia < 2s LCP y caching perimetral en CDN.
* **ADR-0006:** Seguridad declarativa y autorización desacoplada con OPA y Rego.
* **ADR-0007:** Procesamiento de pedidos con cola FIFO y eventos WebSockets en tiempo real.
* **ADR-0005 (Capa Visual):** Desacoplamiento entre el Catálogo de Datos y la Capa de Maquetación Visual (Canvas).

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista responsive de la Carta QR con soporte dual: plantilla predeterminada y vista Canvas.
* Implementar el editor visual interactivo en el panel de administración (arrastrar elementos, redimensionar, asignar `z-index`, seleccionar fondos y previsualizar).
* Diseñar el motor de escala responsiva del lienzo para terminales móviles garantizando relación de aspecto y legibilidad.
* Implementar la lógica de fallback hacia la maquetación secuencial ante errores en la carga del `layout_config`.

### Tareas de Backend (`resto-core-back`)
* Extender el endpoint público `GET /api/v1/tenants/{tenant_slug}/menu` para retornar el objeto opcional `layout_config`.
* Implementar el endpoint protegido `PUT /api/v1/admin/menu/layout` para guardar, actualizar o deshabilitar la configuración del lienzo.
* Persistir `layout_config` como columna `JSONB` en la entidad del Tenant o Menú con soporte de validación de esquema.
* Asegurar que la actualización de la maquetación visual dispare la invalidación atómica de caché en memoria y CDN.

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
