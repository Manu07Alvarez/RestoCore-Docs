# Modelo C4 - Nivel 2: Diagrama de Contenedores

Este documento establece el **Diagrama de Contenedores (Nivel 2 del Modelo C4)** para el ecosistema RestoCore, detallando las aplicaciones ejecutables, servicios de API, almacenes de datos y protocolos de red acorde a los registros ADRs aceptados (`ADR-0001` a `ADR-0007`).

---

## Diagrama de Contenedores en Mermaid.js

```mermaid
graph TD
    %% Clientes y Frontend
    subgraph Capa de Presentación (Frontend SaaS)
        FrontWeb["Frontend SaaS Web/Mobile (resto-core-front)"]
    end

    %% Infraestructura Perimetral
    subgraph Capa Perimetral y Almacenamiento Estático
        CDN["CDN Perimetral (Edge Cache) [ADR-0005]"]
        SeaweedFS[("SeaweedFS Storage [ADR-0004]")]
    end

    %% Servicios de Backend y Seguridad
    subgraph Capa de Servicios Backend (resto-core-back)
        API["API REST Backend (resto-core-back) [ADR-0001]"]
        OPAMotor["OPA Engine (Rego Policies) [ADR-0006]"]
        WSServer["WebSocket Gateway [ADR-0007]"]
        OrderWorker["Order Processor Worker [ADR-0007]"]
    end

    %% Persistencia y Colas
    subgraph Capa de Persistencia y Mensajería
        PostgreSQL[("PostgreSQL DB (JSONB + GIN) [ADR-0003]")]
        RedisQueue[("Redis Streams (Cola FIFO) [ADR-0007]")]
    end

    %% Flujos de Comunicación y Protocolos
    FrontWeb -->|HTTP GET Menu < 2s LCP| CDN
    CDN -->|Miss Cache / Fetch| API
    FrontWeb -->|HTTP REST + JWT| API
    API -->|Validar Rego AuthZ| OPAMotor
    API -->|Pre-signed URL Token| FrontWeb
    FrontWeb -->|PUT Direct Binary Upload| SeaweedFS
    
    %% Flujo de Pedidos en Tiempo Real
    FrontWeb -->|POST /api/v1/orders| API
    API -->|Push Comanda FIFO| RedisQueue
    RedisQueue -->|Pop Sequenced Order| OrderWorker
    OrderWorker -->|Persistir JSONB Order| PostgreSQL
    API -->|SELECT / UPDATE JSONB| PostgreSQL
    OrderWorker -->|Broadcast ORDER_CREATED| WSServer
    WSServer -->|WebSocket Real-time < 100ms| FrontWeb
```

---

## Descripción de los Contenedores del Sistema

### 1. Capa de Presentación (Frontend)
* **`resto-core-front` (Frontend SaaS Web/Mobile):** Aplicación cliente desarrollada en React/Next.js o Vite. Contiene las vistas del cliente (Carta QR), del administrador (Panel CRUD) y del personal de cocina (Pantalla KDS).

### 2. Capa Perimetral y Almacenamiento
* **CDN Perimetral (`ADR-0005`):** Servidor perimetral responsable de almacenar en caché las respuestas de la Carta QR pública vinculadas al `version_hash` para cumplir con el SLA de latencia (< 2s LCP).
* **SeaweedFS Object Storage (`ADR-0004`):** Almacenamiento distribuido de fotos de platos y logos. El cliente sube archivos binarios directamente mediante URLs pre-firmadas generadas por la API.

### 3. Capa de Servicios Backend (`resto-core-back`)
* **API REST Backend (`ADR-0001`):** Servidor API principal sin estado (stateless) responsable de atender solicitudes CRUD protegidas y lecturas públicas.
* **OPA Engine (`ADR-0006`):** Motor Open Policy Agent que evalúa declarativamente las reglas de autorización en sintaxis Rego (`specs/policies/`) para garantizar aislamiento multi-tenant.
* **WebSocket Gateway (`ADR-0007`):** Servicio de mensajería bidireccional que transmite eventos de comanda en tiempo real (< 100ms) hacia las pantallas KDS de cocina.
* **Order Processor Worker (`ADR-0007`):** Consumidor asíncrono que procesa secuencialmente los elementos de la cola FIFO y los persiste de forma consistente.

### 4. Capa de Persistencia y Mensajería
* **PostgreSQL DB (`ADR-0003`):** Base de datos relacional principal utilizada con columnas `JSONB` e índices `GIN` para almacenar categorías, platos, modificadores, mesas y comandas.
* **Redis Streams (`ADR-0007`):** Sistema de mensajería en memoria configurado con cola FIFO estricta para erradicar condiciones de carrera en ráfagas de pedidos.
