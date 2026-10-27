# Guía de Onboarding para Desarrolladores

Bienvenido al repositorio de especificaciones de **RestoCore**.

---

## Principios Inviolables
1. **Spec-Driven Development (SDD):** No se escribe código en `resto-core-front` ni en `resto-core-back` sin una especificación aprobada previamente en `RestoCore-Docs`.
2. **Docs-as-Code:** Toda la documentación se gestiona mediante Markdown, OpenAPI y Mermaid.js en Git.
3. **Flujo de Trabajo Homologado (7 Fases):** Consulta `docs/sdd-workflow.md` para seguir la secuencia `/domain` -> `/adr` -> `/prd` + `/ears` -> `/c4` -> `/api` + `/sec` -> `/runbook` -> `/pr`.

---

## Entorno Local de Desarrollo y Cuentas Semilladas

Para interactuar con la plataforma y probar las APIs en desarrollo local (`resto-core-back` y `restocore-frontend`):

### 1. Inicialización de Servicios (`docker-compose.dev.yml`)
Desde la raíz del repositorio de backend, iniciar la infraestructura contenedorizada:
```bash
docker compose -f docker-compose.dev.yml up -d
```
O ejecutar el script de verificación automatizada:
```powershell
./scripts/verify-docker-env.ps1
```

### 2. Semillado Bajo Demanda de Base de Datos (`DatabaseSeeder`)
Al iniciar los contenedores de Docker, PostgreSQL arranca con el esquema limpio (no se siembran datos de forma automática). Para poblar el entorno local con el restaurante de muestra **El Gato Negro**, sus categorías, platos, mesas QR y cuentas de usuario en la tabla `users`, ejecutar desde la raíz de `resto-core-back`:

```powershell
# Opción recomendada (aplica migraciones si se indica -ForceMigrate y ejecuta el seeder idempotente):
./scripts/seed-db.ps1 -ForceMigrate

# O directamente mediante la CLI de .NET:
dotnet run --project src/RestoCore.Api/RestoCore.Api.csproj -- --seed
```

### 3. Cuentas de Acceso Semilladas en PostgreSQL (Tabla `users`)
Una vez ejecutado el seeder, el endpoint `POST /api/v1/auth/login` autentica contra la tabla `users` en PostgreSQL (con hashes PBKDF2-HMAC-SHA256) utilizando las siguientes credenciales de desarrollo:

| Perfil de Usuario | Correo Electrónico | Contraseña | Roles (`Roles`) | Tenant Slug / ID |
| :--- | :--- | :--- | :--- | :--- |
| **Dueño / Administrador Principal** | `admin@bistrogourmet.com` | `admin123` | `owner`, `tenant_admin`, `kitchen_staff` | `el-gato-negro`<br/>`11111111-1111-1111-1111-111111111111` |
| **Administrador Local Alternativo** | `admin@restocore.com` | `admin123` | `owner`, `tenant_admin`, `kitchen_staff` | `el-gato-negro`<br/>`11111111-1111-1111-1111-111111111111` |
| **Personal de Cocina (KDS)** | `cocina@restocore.com` | `cocina123` | `cook`, `kitchen_staff` | `el-gato-negro`<br/>`11111111-1111-1111-1111-111111111111` |
| **SuperAdmin de Plataforma** | `superadmin@restocore.com` | `admin123` | `super_admin` | Global (`TenantId: null`) |

### 4. Paneles de Herramientas y Observabilidad Local
* **Swagger UI / Contrato OpenAPI:** `http://localhost:5000/swagger`
* **Streamlit Unified Admin (Postgres, Redis, SeaweedFS):** `http://localhost:8501`
* **.NET Aspire Dashboard (Trazas, Métricas y Logs OTLP):** `http://localhost:18888`
* **SeaweedFS S3 Gateway:** `http://localhost:8333`
* **Open Policy Agent (OPA Server):** `http://localhost:8181`


