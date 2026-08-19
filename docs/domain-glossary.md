# Glosario de Lenguaje Ubicuo: RestoCore

Este documento define el vocabulario técnico y de negocio unificado para el ecosistema RestoCore bajo los principios de Domain-Driven Design (DDD - Módulo 09 del Playbook de Ingeniería). Garantiza la coincidencia semántica exacta entre las especificaciones del producto, los desarrolladores de Frontend (`resto-core-front`), Backend (`resto-core-back`), contratos de API OpenAPI 3.1 y tablas de PostgreSQL.

---

## 1. Entidad de Dominio: Tenant (Restaurante / Comercio)

### Definición de Negocio
Un **Tenant** es el establecimiento gastronómico o marca cliente suscrito a la plataforma RestoCore. Representa la unidad de aislamiento principal del sistema multi-tenant, permitiendo que cada restaurante administre su propio menú interactivo, su identidad visual (colores de marca y logo) y su configuración operativa de forma independiente.

### Atributos Clave del Negocio
* **Nombre Comercial (`name`):** Nombre público del restaurante (ejemplo: "Pizzería Don Pepe").
* **Identificador de URL / Slug (`slug`):** Cadena de texto única en la URL para acceder a la carta QR pública (ejemplo: `restocore.app/don-pepe`).
* **Identidad Visual (`branding`):** Paleta de colores de la marca en formato hexadecimal y la URL del logo almacenado en SeaweedFS.
* **Estado Operativo (`status`):** Condición del local en la plataforma (`active`, `suspended`, `inactive`).

### Reglas de Negocio y Validación (Sintaxis EARS)
* **Ubiquitous:** El sistema DEBERÁ garantizar el aislamiento estricto de los datos entre diferentes Tenants en todas las operaciones de lectura y escritura.
* **Ubiquitous:** El sistema DEBERÁ exigir que el identificador `slug` sea único, en minúsculas y sin caracteres especiales.
* **Unwanted Behavior:** SI el estado del Tenant es "suspended" o "inactive", ENTONCES el sistema DEBERÁ denegar la renderización de la carta QR pública y retornar un código HTTP 403 con el mensaje explicativo.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Esquema `TenantSchema` en `specs/openapi.yaml`.
* **Persistencia PostgreSQL:** Tabla `tenants` (`id UUID PRIMARY KEY`, `name VARCHAR`, `slug VARCHAR UNIQUE`, `branding JSONB`, `status VARCHAR`).

---

## 2. Entidad de Dominio: Carta QR (Menú Público Interactivo)

### Definición de Negocio
La **Carta QR** es la interfaz digital pública de lectura consultada por los clientes finales del restaurante desde sus dispositivos móviles tras escanear un código QR. Está optimizada para cargar y renderizarse en menos de 2 segundos (< 2s LCP) sin requerir autenticación.

### Atributos Clave del Negocio
* **Lista de Categorías (`categories`):** Estructura jerárquica de secciones activas del menú.
* **Versión de Menú (`version`):** Identificador de versión para control de almacenamiento en caché en CDN perimetral.

### Reglas de Negocio y Validación (Sintaxis EARS)
* **Event-Driven:** CUANDO un cliente escanee el código QR del restaurante, el sistema DEBERÁ cargar y renderizar la carta interactiva en menos de 2 segundos desde dispositivos móviles.
* **Unwanted Behavior:** SI la conexión a la base de datos de origen está degradada, ENTONCES el sistema DEBERÁ servir la última versión válida de la Carta QR desde la caché perimetral CDN.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Endpoint `GET /api/v1/tenants/{tenant_slug}/menu`.
* **Persistencia PostgreSQL:** Tabla `menus` con columna `categories` en formato `JSONB` e índice `GIN`.

---

## 3. Entidad de Dominio: Categoría (Sección del Menú)

### Definición de Negocio
Una **Categoría** es la agrupación lógica de productos gastronómicos afines dentro de una Carta QR (ejemplo: "Entradas", "Platos Principales", "Bebidas", "Postres").

### Atributos Clave del Negocio
* **Título (`title`):** Nombre de la categoría visible para el cliente.
* **Orden de Despliegue (`display_order`):** Posición numérica secuencial dentro del menú.
* **Lista de Platos (`items`):** Colección de productos pertenecientes a la sección.

### Reglas de Negocio y Validación (Sintaxis EARS)
* **State-Driven:** MIENTRAS una categoría no contenga platos activos disponibles, el sistema DEBERÁ ocultarla de la navegación pública del menú.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Esquema `CategorySchema` dentro de `specs/openapi.yaml`.
* **Persistencia PostgreSQL:** Almacenado como elemento del array `categories` en la columna `JSONB` de la tabla `menus`.

---

## 4. Entidad de Dominio: Plato (Producto Gastronómico)

### Definición de Negocio
Un **Plato** o producto es la unidad gastronómica ofrecida a la venta en el restaurante. Contiene la información descriptiva, precio, alérgenos, disponibilidad e imagen comercial.

### Atributos Clave del Negocio
* **Nombre (`name`):** Denominación comercial del producto.
* **Descripción (`description`):** Detalle de ingredientes y preparación.
* **Precio Base (`price`):** Valor monetario en la moneda local del Tenant.
* **Disponibilidad (`is_available`):** Indicador de stock activo o agotado.
* **Imagen del Producto (`image_url`):** Enlace directo a la imagen almacenada en SeaweedFS.

### Reglas de Negocio y Validación (Sintaxis EARS)
* **Unwanted Behavior:** SI un plato carece de una imagen válida o la URL está rota, ENTONCES el sistema DEBERÁ renderizar el placeholder gráfico predeterminado sin interrumpir la carga del menú.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Esquema `MenuItemSchema` dentro de `specs/openapi.yaml`.
* **Persistencia PostgreSQL:** Almacenado como objeto dentro del array `items` en la columna `JSONB` de la tabla `menus`.

---

## 5. Entidad de Dominio: Modificador (Opciones de Personalización)

### Definición de Negocio
Un **Modificador** representa una opción de personalización adicional u obligatoria asociada a un plato específico (ejemplo: "Punto de cocción de la carne", "Salsa extra", "Elección de guarnición").

### Atributos Clave del Negocio
* **Grupo de Modificadores (`group_name`):** Título del grupo de opciones (ejemplo: "Selecciona tu bebida").
* **Selección Mínima / Máxima (`min_selection` / `max_selection`):** Reglas de obligatoriedad y límite de selección.
* **Opciones (`options`):** Lista de alternativas con sus respectivos impactos en el precio base (`price_delta`).

### Reglas de Negocio y Validación (Sintaxis EARS)
* **Optional Features:** DONDE un grupo de modificadores sea obligatorio (`min_selection >= 1`), el sistema DEBERÁ requerir la selección de al menos una opción antes de permitir agregar el plato.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Esquema `ModifierGroupSchema` con tipo flexible (`type: object`).
* **Persistencia PostgreSQL:** Objeto flexible `modifiers` en la estructura `JSONB` de la tabla `menus`.

---

## 6. Entidad de Dominio: Mesa / QR Table (Ubicación en Salón)

### Definición de Negocio
Una **Mesa / QR Table** representa una ubicación física o área de atención en el establecimiento gastronómico de un Tenant. Cada mesa posee un código QR físico asignado que permite al cliente acceder directamente al menú digital identificando automáticamente el punto de atención sin necesidad de autenticación previa.

### Atributos Clave del Negocio
* **Número / Etiqueta de Mesa (`table_number` / `label`):** Identificador físico visible en el restaurante (ejemplo: "Mesa 04", "Barra 02", "Terraza 12").
* **Token Único de Acceso (`table_token`):** Hash o token alfanumérico inmutable embebido en el código QR para validar la autenticidad de la ubicación sin riesgo de adulteración en el navegador.
* **Sector / Zona (`zone_sector`):** Agrupación espacial del local (ejemplo: "Salón Principal", "Patio", "Barra").
* **Estado Operativo (`status`):** Condición de la mesa en el sistema (`active`, `disabled`, `maintenance`).
* **URL de Enlace QR (`qr_payload_url`):** Enlace completo codificado en la etiqueta QR (ejemplo: `https://restocore.app/don-pepe?table=tbl_9x8f7a`).

### Reglas de Negocio y Validación (Sintaxis EARS)
* **Ubiquitous:** El sistema DEBERÁ vincular de manera unívoca cada `table_token` a un único Tenant activo en la plataforma.
* **Event-Driven:** CUANDO un cliente escanee el código QR de una mesa activa (`status == "active"`), el sistema DEBERÁ renderizar la Carta QR adjuntando el contexto de la mesa sin requerir autenticación.
* **Optional Features:** DONDE la mesa tenga asignado un sector (`zone_sector`), el sistema DEBERÁ incluir la denominación del sector en el contexto de la sesión de lectura.
* **Unwanted Behavior:** SI un cliente escanee el QR de una mesa en estado inhabilitado (`status == "disabled"`), ENTONCES el sistema DEBERÁ desplegar la carta digital en modo solo lectura emitiendo una advertencia de mesa no disponible para atención.

### Mapeo Técnico
* **Contrato OpenAPI 3.1:** Esquema `TableSchema` en `specs/openapi.yaml` y parámetro de consulta opcional `table_token` en `GET /api/v1/tenants/{tenant_slug}/menu?table_token={token}`.
* **Persistencia PostgreSQL:** Tabla `tables` (`id UUID PRIMARY KEY`, `tenant_id UUID REFERENCES tenants(id)`, `table_number VARCHAR`, `table_token VARCHAR UNIQUE`, `zone_sector VARCHAR`, `status VARCHAR`).
