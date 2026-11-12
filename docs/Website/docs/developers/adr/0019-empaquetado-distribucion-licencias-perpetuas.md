# ADR-0019: Estrategia de Empaquetado y Canales de Distribución para Licencias Perpetuas (Self-Hosted)

* **Estado:** Aceptado
* **Fecha:** 2026-11-12
* **Decisores:** Equipo de Arquitectura e Ingeniería de RestoCore
* **Contexto del Sistema:** Plataforma de Gestión Gastronómica y Menú Digital (C# / .NET 10, PostgreSQL 16+, Almacenamiento Compatible con S3 vía SeaweedFS)

> *Nota de Gobernanza:* Este registro actualiza y alinea la numeración correlativa (originalmente planteada como `ADR-0002`, ya ocupado por [Separación de Repositorios](./0002-separacion-repositorios.md)) y subordina el stack de empaquetado a los lineamientos vigentes de `.NET 10`, PostgreSQL `JSONB`/`GIN` (`ADR-0003`) y SeaweedFS (`ADR-0004`).

---

## 1. Contexto y Planteamiento del Problema

El producto se comercializa bajo dos esquemas principales: suscripción en la nube gestionada (SaaS) y licencia perpetua auto-hospedada (Self-Hosted / On-Premise). Si bien la distribución mediante contenedores Docker es el estándar predominante en entornos de servidores Linux y nube privada, los clientes del sector gastronómico presentan perfiles operativos heterogéneos:

1. **Cadenas y grupos gastronómicos con infraestructura dedicada o personal de sistemas:** Disponen de servidores Linux, instancias cloud privadas o hipervisores donde la orquestación de contenedores es práctica habitual.
2. **Locales independientes con terminal única en mostrador (Windows):** Operan directamente sobre una computadora de punto de venta (POS) sin servidor dedicado ni soporte técnico permanente. En estos escenarios, exigir la instalación y operación de Docker Desktop sobre Windows introduce fricción operativa, consumo innecesario de memoria RAM por virtualización y fallos recurrentes en redes locales.

Se requiere formalizar los canales oficiales de empaquetado del binario C# / .NET 10, la arquitectura de persistencia para cada canal y los requisitos mínimos de hardware para garantizar despliegues deterministas y soportables.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Distribución Exclusiva vía Contenedores Docker + Docker Compose
* **Descripción:** Entregar únicamente imágenes Docker privadas acompañadas de un archivo `docker-compose.yml` que levanta el backend .NET 10, PostgreSQL y SeaweedFS.
* **Ventajas:** Entorno de ejecución 100% homogéneo, aislamiento de red entre servicios, control estricto de cuotas de CPU/RAM y actualizaciones atómicas por etiqueta de versión.
* **Desventajas:** Barrera técnica prohibitiva para comercios pequeños que solo poseen una PC con Windows en caja.

### Alternativa 2: Distribución Exclusiva vía Instalador Nativo de Windows/Linux
* **Descripción:** Compilar el binario .NET 10 y empaquetarlo en un instalador tradicional (MSI / Inno Setup) que instala servicios en el sistema operativo anfitrión.
* **Ventajas:** Instalación guiada sin conocimientos de infraestructura.
* **Desventajas:** Dificulta la orquestación multi-servicio (base de datos cliente-servidor, proxy inverso, almacenamiento de objetos) y expone la aplicación a conflictos con software de terceros instalado en la máquina anfitriona.

### Alternativa 3: Distribución Segmentada Dual (Docker Compose como Estándar Principal + Instalador Nativo Embebido para Nodo Único)
* **Descripción:** Mantener una única base de código C# / .NET 10 compilada a binario único (`PublishSingleFile`) y distribuirla a través de dos canales oficiales según la topología del cliente, más una plantilla de máquina virtual opcional para entornos hiperconvergentes.

---

## 3. Decisión Arquitectónica

Se adopta la **Alternativa 3 (Distribución Segmentada Dual)**, estableciendo los siguientes canales oficiales de empaquetado para la modalidad de licencia perpetua:

### Canal A: Contenedores Docker + Docker Compose (Estándar Principal - Servidores y Multi-Terminal)
* **Público objetivo:** Cadenas gastronómicas, restaurantes con múltiples terminales/KDS, o clientes con servidor Linux / VPS propio.
* **Artefactos entregados:**
  * Acceso de solo lectura al registro privado de contenedores (`ghcr.io` o registro propio) con la imagen minimalista basada en `mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled`.
  * Paquete de despliegue compuesto por `docker-compose.yml`, archivo de variables `.env.template` y script de verificación inicial.
* **Stack incluido:**
  * Servicio `app`: Binario único C# / .NET 10 (`DEPLOYMENT_MODE=SelfHosted`).
  * Servicio `db`: PostgreSQL 16+ con soporte `JSONB` e índices `GIN` (Licencia PostgreSQL, conforme a `ADR-0003`).
  * Servicio `storage`: SeaweedFS (Licencia Apache 2.0, conforme a `ADR-0004` y al blindaje de licencias OSI permisivas).
  * Servicio `proxy`: Caddy o Traefik para terminación TLS/SSL local o en red interna.

### Canal B: Instalador Nativo Autocontenido (Estándar Secundario - Nodo Único Windows POS)
* **Público objetivo:** Comercios individuales sin servidor dedicado que operan en una única estación de trabajo Windows (10/11 Pro o IoT Enterprise).
* **Artefactos entregados:**
  * Instalador nativo ejecutado mediante **Inno Setup** o **WiX Toolset** que registra el binario C# / .NET 10 (`win-x64`, `SelfContained=true`, `PublishSingleFile=true`) como un **Servicio de Windows** de inicio automático.
* **Adaptación de persistencia y almacenamiento (Subordinada a `ADR-0003` y `ADR-0004`):**
  * **Persistencia:** Para evitar dependencias de servidor externo en caja única, se contempla la abstracción de proveedor en Entity Framework Core (`Database__Provider=Sqlite` en modo WAL con respaldo automático programado hacia carpeta local o unidad externa). *Restricción arquitectónica:* Dado que `ADR-0003` define PostgreSQL con columnas `JSONB` e índices `GIN` como estándar del dominio de catálogo y menús, cualquier consulta que dependa de operadores nativos `JSONB`/`GIN` deberá contar con adaptación explícita para SQLite o bien requerir un servicio PostgreSQL local embebido en Windows.
  * **Almacenamiento multimedia:** El modo nodo único puede operar con `Storage__Provider=LocalDisk` detrás de la interfaz de almacenamiento de objetos, sirviendo activos cacheados desde el sistema de archivos local sin alterar el estándar SeaweedFS del Canal A y SaaS (`ADR-0004`).

### Canal C: Plantilla de Máquina Virtual / Contenedor de Sistema (Bajo Demanda Corporativa)
* **Público objetivo:** Grupos empresariales con hipervisores propios (Proxmox VE, VMware ESXi).
* **Artefactos entregados:** Imagen OVA o plantilla LXC basada en Debian/Ubuntu Server endurecido con el Canal A (Docker Compose) preinstalado y configurado.

---

## 4. Requisitos Mínimos de Hardware y Software por Canal

| Parámetro | Canal A: Docker Compose (Servidor / Multi-POS) | Canal B: Instalador Nativo (PC de Caja Única) |
| :--- | :--- | :--- |
| **Sistema Operativo** | Linux (Debian 12 / Ubuntu 22.04+ LTS) 64-bit | Windows 10 / 11 (64-bit) o Windows Server 2019+ |
| **Procesador (CPU)** | 2 vCPUs / 2 Núcleos físicos (x86_64 o ARM64) | Intel Core i3 (8va gen+) / AMD Ryzen 3 o superior |
| **Memoria RAM** | 4 GB mínimo (8 GB recomendado con KDS activo) | 4 GB mínimo (8 GB recomendado con POS + Navegador) |
| **Almacenamiento** | 40 GB SSD / NVMe (con volúmenes persistentes) | 20 GB libres en unidad SSD |
| **Red Local** | IP estática en LAN o dominio local con puertos 80/443 | Red LAN cableada o Wi-Fi estable (para comandera/QR) |
| **Dependencias Previas** | Docker Engine 24+ y Docker Compose v2 | Ninguna (Runtime .NET 10 embebido en el ejecutable) |

---

## 5. Consecuencias y Reglas de Gobernanza

### Positivas
* **Cobertura total del mercado:** Permite comercializar licencias perpetuas tanto a cadenas con infraestructura sofisticada como a comercios de barrio sin conocimientos técnicos.
* **Única base de código:** Ambas distribuciones compilan desde el mismo repositorio C# / .NET 10 controlando el motor de base de datos y almacenamiento mediante inyección de dependencias y configuración (`appsettings.json` / variables de entorno).
* **Blindaje de propiedad intelectual y legal:** En ambos canales se distribuye exclusivamente el binario compilado sin símbolos de depuración ni código fuente expuesto, sujeto a validación criptográfica offline (`ILicenseValidator`), utilizando exclusivamente dependencias de infraestructura bajo licencias OSI permisivas.

### Negativas y Mitigaciones
* **Matriz de pruebas de CI/CD ampliada:** Si se habilita SQLite en Canal B, el pipeline de integración continua deberá ejecutar pruebas de integración tanto contra PostgreSQL (Canal A) como contra SQLite (Canal B) antes de aprobar un release, verificando compatibilidad con los esquemas `JSONB` de `ADR-0003`.
* **Límite de escalabilidad del Canal B:** Se establece contractualmente y en la documentación técnica que el **Canal B (Nodo Único Windows)** está soportado únicamente para licencias de **1 sucursal (`max_branches = 1`)** y hasta 3 terminales concurrentes en red local. Si el cliente adquiere una segunda sucursal o supera dicho umbral, debe migrar al **Canal A (Docker + PostgreSQL + SeaweedFS)**.
