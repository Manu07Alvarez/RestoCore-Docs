# Runbook Operativo: Pruebas de Carga y Estrés con k6 y Monitoreo OTLP

Este Runbook interactivo (estándar Runme.dev) formaliza la ejecución de pruebas de estrés, verificación de presupuestos de latencia y monitoreo de telemetría distribuida en tiempo real mediante .NET Aspire Dashboard en RestoCore.

---

## 1. Contexto Operativo y Requisitos Previos

Las pruebas de carga validan empíricamente el cumplimiento de los acuerdos de nivel de servicio (SLA):
* **Presupuesto de Latencia Dinámica:** < 500ms en endpoints dinámicos del backend (`ADR-0005`).
* **Presupuesto de Carta QR Pública:** < 150ms p95 en servidor y < 50ms al operar bajo caché condicional HTTP 304 (`ETag`).

### Requisitos de Herramientas
* Docker y Docker Compose
* k6 CLI instalado localmente o ejecutado vía contenedor
* PowerShell 7+

---

## 2. Paso 1: Levantamiento del Entorno Local con Aspire Dashboard

Iniciar los contenedores de infraestructura, incluyendo el panel de telemetría .NET Aspire Dashboard:

```bash {"name": "start-docker-env"}
docker compose -f docker-compose.dev.yml up -d
```

### Verificación de Disponibilidad del Aspire Dashboard
Verificar que la interfaz web del Aspire Dashboard responda en el puerto 18888:

```bash {"name": "check-aspire-dashboard"}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18888
```

---

## 3. Paso 2: Verificación de Preparación del Backend (`/ready`)

Asegurar que la API tenga conectividad activa con PostgreSQL, Redis, SeaweedFS y OPA:

```bash {"name": "check-backend-readiness"}
curl -s http://localhost:5000/ready | jq .
```

---

## 4. Paso 3: Ejecución de la Suite de Pruebas de Rendimiento (k6)

### 4.1. Prueba de Carga Normal sobre Carta Pública
Evaluar la estabilidad bajo flujo sostenido de comensales:

```bash {"name": "run-k6-load-test"}
k6 run scripts/k6/public-menu-load.js
```

### 4.2. Prueba de Estrés Concurrente
Evaluar el comportamiento bajo picos extremos de tráfico simultáneo:

```bash {"name": "run-k6-stress-test"}
k6 run scripts/k6/public-menu-stress.js
```

### 4.3. Validación de Caché HTTP ETag (304 Not Modified)
Validar que las peticiones con `If-None-Match` se resuelvan en menos de 50ms sin consultar la base de datos:

```bash {"name": "run-k6-etag-test"}
k6 run scripts/k6/etag-cache-test.js
```

### 4.4. Ejecución Integral Automatizada
Ejecutar la suite completa mediante el script orquestador:

```powershell {"name": "run-all-stress-tests"}
./scripts/run-stress-tests.ps1
```

---

## 5. Paso 4: Inspección de Telemetría en Aspire Dashboard

Durante y después de la ejecución de k6:
1. Abrir en el navegador: `http://localhost:18888`.
2. Navegar a la sección **Traces**:
   * Filtrar por `http.route: /api/v1/tenants/{tenant_slug}/menu`.
   * Verificar que la duración p95 de los spans no exceda 150ms.
   * Confirmar la propagación de los atributos `tenant.id` y `http.status_code`.
3. Navegar a la sección **Structured Logs**:
   * Verificar la ausencia de registros con severidad `Error` o `Fatal`.
   * Confirmar que los logs contengan `trace_id` correlacionado.

---

## 6. Criterios de Aceptación del Runbook
1. Tasa de errores HTTP (`http_req_failed`) en k6 igual al 0.00%.
2. Duración de peticiones p95 inferior a 150ms en la carta pública y < 50ms en respuestas 304 Not Modified.
3. Trazas distribuidas visibles en Aspire Dashboard sin cuellos de botella en PostgreSQL.
