# Especificación Técnica de Licenciamiento y Despliegue (SaaS vs. Self-Hosted)

Este documento especifica los requerimientos técnicos de software, empaquetado, validación criptográfica de licencias y criterios de verificación EARS necesarios para distribuir **RestoCore** en modalidades **SaaS** y **Self-Hosted (Licencia Perpetua)** desde una única base de código C# / .NET.

> Para consultar las modalidades comerciales, escalas de precios y reglas contractuales no atadas al código, véase la sección [Mercado & Licencias](../comercial/modelo-comercial-y-distribucion.md).

---

## 1. Principio de Base de Código Única

Para evitar la duplicación de código fuente o el mantenimiento de ramas divergentes, ambas modalidades de distribución se compilan desde el mismo repositorio (`resto-core-back` y `resto-core-front`) mediante banderas de configuración de despliegue, compilación y *Feature Flags*.

**Stack de Referencia:** C# / .NET 10, PostgreSQL 16+, Almacenamiento Compatible con S3 (SeaweedFS conforme a `ADR-0004`), Docker.

---

## 2. Compilación a Binario Único y Protección de Código Fuente

El proyecto backend en .NET debe configurarse para emitir un binario nativo auto-contenido, evitando distribuir ensamblados `.dll` fácilmente descompilables o código fuente en entornos On-Premise.

### 2.1. Configuración del Archivo `.csproj`

```xml
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <TargetFramework>net10.0</TargetFramework>
  <RuntimeIdentifier>linux-x64</RuntimeIdentifier>
  <SelfContained>true</SelfContained>
  <PublishSingleFile>true</PublishSingleFile>
  <PublishTrimmed>true</PublishTrimmed>
  <PublishReadyToRun>true</PublishReadyToRun>
  <DebugType>none</DebugType>
  <DebugSymbols>false</DebugSymbols>
</PropertyGroup>
```

*Nota: Evaluar la habilitación de `PublishAot=true` para compilación Native AOT cuando todas las dependencias de reflexión de Entity Framework Core y serialización lo soporten de forma estable.*

### 2.2. Frontend Estático e Imagen Docker Minimalista

1. **Frontend Estático:** Compilar el cliente web desactivando explícitamente los *Source Maps* (`GENERATE_SOURCEMAP=false` o equivalente en el bundler) y servir los activos estáticos desde el propio binario .NET o mediante un proxy inverso ligero.
2. **Imagen Docker Minimalista:** Empaquetar el binario compilado sobre imágenes base sin shell ni gestores de paquetes (por ejemplo, `mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled`) y distribuirla mediante un registro privado de contenedores junto con un archivo `docker-compose.yml` parametrizado.

---

## 3. Preservación del Modelo Multi-Tenant en Modo Single-Tenant

**Regla de Arquitectura:** No se debe eliminar la columna `tenant_id` del esquema de base de datos ni de los filtros globales de Entity Framework Core (`HasQueryFilter`).

* **Bandera de Despliegue:** Incorporar la variable de entorno `DEPLOYMENT_MODE` con valores permitidos `SaaS` o `SelfHosted`.
* **Resolución de Inquilino (`ITenantResolver`):**
  * En modo `SaaS`: Resuelve el `tenant_id` dinámicamente a partir del subdominio, cabecera HTTP `X-Tenant-ID` o claims del token JWT.
  * En modo `SelfHosted`: Inyecta de forma estática el `Guid` del único inquilino raíz registrado en la base de datos local.
* **Aprovisionamiento Inicial (Seeding):** Durante el arranque en modo `SelfHosted`, si la tabla `tenants` se encuentra vacía, el sistema crea automáticamente el registro único del comercio vinculado a los metadatos de la licencia.
* **Desactivación de Rutas Públicas:** Mediante *Feature Flags*, bloquear y ocultar los endpoints de registro público de nuevos inquilinos (`POST /api/v1/tenants`).

---

## 4. Sistema de Validación Criptográfica de Licencias Offline

El sistema debe validar la licencia localmente sin requerir conexión a servidores externos para operar en entornos sin internet o redes aisladas.

### 4.1. Estructura del Archivo de Licencia (`license.lic` / JWT)

Firmado digitalmente mediante algoritmo asimétrico **Ed25519** o **RSA-2048** utilizando la clave privada del proveedor. La clave pública reside embebida como constante o recurso incrustado en el binario .NET:

```json
{
  "license_id": "LIC-2026-8841",
  "customer_name": "Grupo Gastronomico Sur",
  "license_type": "perpetual",
  "max_branches": 2,
  "allowed_major_version": 1,
  "instance_fingerprint": "SHA256_HARDWARE_OR_DB_UUID",
  "issued_at": "2026-11-12T00:00:00Z"
}
```

### 4.2. Reglas de Verificación (`ILicenseValidator`)

1. **Validación de Firma Criptográfica:** Al iniciar el `IHostedService` de la aplicación, verificar la firma del archivo de licencia contra la clave pública embebida utilizando `System.Security.Cryptography`. Si la firma es inválida o el archivo no existe, abortar el arranque (`Environment.Exit(1)`).
2. **Control de Versión Mayor:** Comparar la constante de compilación `AssemblyVersion.Major` contra `allowed_major_version`. Si `AssemblyVersion.Major > allowed_major_version`, detener la ejecución e informar en consola que la licencia requiere renovación de mantenimiento para ejecutar dicha versión mayor.
3. **Control de Copia (Instance Fingerprinting):** En la primera activación, vincular la licencia a un identificador único generado en la base de datos local y persistido de forma inmutable (combinado con el identificador del host/contenedor), impidiendo clonar la base de datos y el archivo de licencia hacia otro servidor.
4. **Límite de Sucursales (`max_branches`):**
   * En el caso de uso de creación de sucursales (`CreateBranchCommandHandler`), validar que `SELECT COUNT(*) FROM branches WHERE is_active = true` sea estrictamente menor a `License.MaxBranches`.
   * Ejecutar esta misma verificación durante el arranque de la aplicación para prevenir alteraciones directas mediante consultas SQL manuales.

---

## 5. Desacoplamiento de Infraestructura y Operaciones

* **Almacenamiento de Objetos:** Inyectar endpoints, regiones, nombres de buckets y credenciales S3 mediante variables de entorno (`Storage__Endpoint`, `Storage__AccessKey`, `Storage__SecretKey`), permitiendo apuntar tanto a la nube del proveedor en modo `SaaS` como a una instancia local de SeaweedFS en modo `SelfHosted`.
* **Migraciones Embebidas:** Empaquetar las migraciones de base de datos (EF Core Migrations) dentro del binario ejecutando `Database.Migrate()` automáticamente al iniciar el servicio cuando se apliquen actualizaciones menores (`v1.x`).
* **Aislamiento de Telemetría y Facturación SaaS:**
  * Encapsular los exportadores de OpenTelemetry hacia servidores centrales bajo `Telemetry__EnableExternalExport=false`.
  * Deshabilitar mediante *Feature Flags* los webhooks y servicios de cobro de suscripciones propias del SaaS.
  * Incorporar un comando CLI en el binario (`./app --diagnose`) que exporte un archivo `.zip` con logs sanitizados (sin cadenas de conexión ni secretos ni PII) y métricas de estado para soporte técnico.

---

## 6. Criterios de Verificación (Sintaxis EARS)

* **Ubiquitous:** El sistema DEBERÁ mantener la columna `tenant_id` y el aislamiento lógico en todas las entidades transaccionales independientemente del modo de despliegue configurado.
* **Event-Driven:** CUANDO el binario inicie en modo `SelfHosted`, el sistema DEBERÁ validar la firma criptográfica del archivo de licencia contra la clave pública embebida antes de aceptar peticiones HTTP.
* **Unwanted Behavior:** SI el número de sucursales activas en la base de datos alcanza o supera el valor `max_branches` definido en la licencia, ENTONCES el sistema DEBERÁ rechazar la creación de nuevas sucursales devolviendo un error de dominio `403 Forbidden`.
* **Unwanted Behavior:** SI la versión mayor del binario compilado supera el campo `allowed_major_version` de la licencia perpetua, ENTONCES el sistema DEBERÁ abortar el proceso de arranque registrando un error crítico de licenciamiento.
* **Optional Features:** DONDE `DEPLOYMENT_MODE` sea igual a `SelfHosted`, el sistema DEBERÁ deshabilitar las rutas públicas de registro de inquilinos y los exportadores de telemetría externa por defecto.
