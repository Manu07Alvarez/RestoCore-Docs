# Documento de Requisitos de Producto (PRD): Carta QR Pública del Cliente

Este documento establece las especificaciones funcionales, límites de alcance y criterios de aceptación para el módulo de **Carta QR Pública del Cliente** (Módulo 01 del Playbook de Ingeniería y Fase 3 del Flujo de Trabajo Homologado SDD).

---

## 1. Resultados (Outcomes)
* Permitir a los clientes de un restaurante visualizar la oferta gastronómica completa (menú, categorías, platos, precios, modificadores y fotos) de forma pública e instantánea desde sus dispositivos móviles tras escanear un código QR.
* Garantizar el cumplimiento del presupuesto estricto de rendimiento, completando el renderizado principal en menos de 2 segundos (< 2s LCP) sin requerir descarga de aplicaciones ni creación de cuentas.

---

## 2. Límites de Alcance (In-Scope / Out-of-Scope)

### Funcionalidades Incluidas (In-Scope - MVP)
* **Navegación Pública del Menú:** Visualización dinámica de la oferta del restaurante estructurada por categorías (ejemplo: Entradas, Platos Principales, Bebidas, Postres).
* **Filtros e Indicadores Nutricionales:** Filtrado e identificación visual de alérgenos y etiquetas dietarias (ejemplo: Apto Celíacos / Gluten-Free, Vegano, Vegetariano).
* **Personalización mediante Modificadores:** Modal interactivo para seleccionar opciones de personalización de un plato (ejemplo: punto de cocción de la carne, acompañamientos, agregados con deltas de precio).
* **Identificación de Mesa en Salón:** Captura del token de seguridad de la mesa (`table_token`) mediante la URL del QR para vincular la sesión del usuario a una ubicación física en el local.
* **Soporte Multi-Dispositivo y Responsive:** Diseño fluido adaptado a navegadores móviles iOS y Android.
* **Carga de Imágenes Optimizada:** Muestreo de fotografías de platos servidas directamente desde la CDN perimetral o SeaweedFS con fallback predeterminado.

### Funcionalidades Excluidas (Out-of-Scope)
* **Registro o Autenticación de Clientes:** La visualización de la Carta QR es 100% anónima; no se solicita login ni registro de usuario.
* **Pagos en Línea desde la Carta:** Integración con pasarelas de pago (diferido para iteraciones posteriores).
* **Llamada Digital a Mozo:** Botón de solicitud de atención física en mesa desde el celular (diferido).

---

## 3. Restricciones y Asunciones
* **Presupuesto de Latencia (< 2s LCP):** El renderizado del elemento visual principal debe completar en menos de 2.0 segundos bajo conexiones móviles 3G/4G/5G.
* **Almacenamiento en Caché Perimetral (CDN):** El menú público se sirve a través de la CDN perimetral (`ADR-0005`) utilizando el `version_hash` del Tenant.
* **Arquitectura de API:** El cliente web consume exclusivamente solicitudes `GET` a través de REST API (`ADR-0001`). Queda descartado GraphQL.

---

## 4. Decisiones Previas
* **ADR-0001:** Cumplimiento de Spec-Driven Development y Docs-as-Code.
* **ADR-0002:** Separación de repositorios (Frontend `resto-core-front`, Backend `resto-core-back`, Specs `RestoCore-Docs`).
* **ADR-0003:** Persistencia semiestructurada en PostgreSQL utilizando columnas `JSONB` e índices `GIN`.
* **ADR-0004:** Carga asíncrona de imágenes mediante URLs pre-firmadas a SeaweedFS.
* **ADR-0005:** Presupuesto de latencia < 2s LCP y caching perimetral en CDN.

---

## 5. Desglose de Tareas Atómicas (Desarrollo en Paralelo)

### Tareas de Frontend (`resto-core-front`)
* Construir la vista responsive de la Carta QR con navegación lateral/superior por categorías.
* Implementar las tarjetas de platos con indicador de precio, fotos optimizadas e insignias de alérgenos/dietas.
* Desarrollar el modal de modificadores para la selección de agregados con cálculo dinámico de precio.
* Capturar y almacenar temporalmente el parámetro `table_token` recibido en la URL de navegación.

### Tareas de Backend (`resto-core-back`)
* Diseñar el endpoint público de lectura: `GET /api/v1/tenants/{tenant_slug}/menu`.
* Emitir cabeceras HTTP de caché (`Cache-Control`, `ETag`) vinculadas al `version_hash` del menú del Tenant.
* Implementar la validación opcional del parámetro `table_token` contra la base de datos PostgreSQL.

---

## 6. Criterios de Verificación (EARS + Escenarios Gherkin)

### Reglas en Sintaxis EARS
* **Ubiquitous:** El sistema DEBERÁ permitir el acceso a la Carta QR pública sin solicitar credenciales de inicio de sesión ni registro previo.
* **Event-Driven:** CUANDO el cliente seleccione un plato con opciones de personalización, el sistema DEBERÁ desplegar el modal de modificadores mostrando los deltas de precio aplicables.
* **State-Driven:** MIENTRAS el cliente mantenga seleccionado un filtro dietario (ej. "Apto Celíacos"), el sistema DEBERÁ ocultar todos los platos que no contengan dicha etiqueta de certificación.
* **Unwanted Behavior:** SI la URL del código QR contiene un `table_token` inválido o deshabilitado, ENTONCES el sistema DEBERÁ permitir la lectura del menú notificando sutilmente que la mesa no está activa para interacciones de pedido.
* **Optional Features:** DONDE la mesa posea un `table_token` activo, el sistema DEBERÁ guardar la asociación de la mesa en el contexto del navegador.

### Escenarios Gherkin

```gherkin
Feature: Visualización de Carta QR Pública del Cliente
  Scenario: Carga ultra-rápida del menú desde dispositivo móvil
    Given que un cliente escanea el código QR de la mesa con slug de tenant "don-pepe"
    When el navegador abre la URL del menú público "https://don-pepe.restocore.app/menu?table_token=sec_99a"
    Then el sistema DEBERÁ renderizar la estructura de categorías y platos en menos de 2 segundos (LCP < 2s)
    And DEBERÁ mostrar la insignia de la "Mesa 04" en la barra superior

  Scenario: Filtrado por preferencias dietarias y personalización de modificadores
    Given que el cliente se encuentra en la sección de "Platos Principales"
    When activa el filtro "Apto Celíacos"
    Then el sistema DEBERÁ listar únicamente los platos certificados Gluten-Free
    When el cliente presiona sobre la "Hamburguesa Gourmet"
    Then el sistema DEBERÁ abrir el modal de modificadores permitiendo seleccionar el punto de cocción y agregados
```
