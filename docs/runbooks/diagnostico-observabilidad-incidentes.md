# Runbook Operativo: Diagnóstico de Incidentes con Logs Estructurados y Trazas Distribuidas

Este Runbook interactivo (estándar Runme.dev) formaliza el procedimiento operativo para la detección, filtrado y resolución de incidencias en producción utilizando la correlación de telemetría de OpenTelemetry en RestoCore.

---

## 1. Contexto Operativo y Requisitos Previos

En entornos de alta concurrencia, el diagnóstico de incidentes se apoya en dos pilares complementarios:
* **Trazas (Traces):** Indican qué ruta siguió una solicitud y qué componente consumió más tiempo (latencia y cuellos de botella).
* **Logs Estructurados:** Proveen el detalle contextual exacto (stack trace, excepciones, código de error) de un evento en un punto del tiempo.

### Variables de Entorno Requeridas
Asegurar la configuración de las variables de conexión antes de iniciar la sesión de depuración:

```bash {"name": "setup-env"}
export OTLP_ENDPOINT="${OTLP_ENDPOINT:-http://localhost:4317}"
export LOGS_API_URL="${LOGS_API_URL:-http://localhost:3100}"
export JAEGER_QUERY_URL="${JAEGER_QUERY_URL:-http://localhost:16686}"
```

---

## 2. Paso 1: Verificación de Salud del Colector de Telemetría

Verificar que el colector de OpenTelemetry y el servicio de ingesta de logs se encuentren operativos:

```bash {"name": "check-telemetry-health"}
curl -s -o /dev/null -w "%{http_code}\n" "${JAEGER_QUERY_URL}"
```

---

## 3. Paso 2: Filtrado de Logs Estructurados por Atributos Clave

Buscar eventos de error recientes filtrando por atributos estructurados (`http.status_code >= 500` o `error.code`):

### 3.1. Detección de Errores por Tenant
Filtrar las excepciones del último intervalo para un restaurante específico (`tenant_id`):

```bash {"name": "filter-logs-by-tenant"}
# Reemplazar $TENANT_ID por el UUID del restaurante afectado
curl -G -s "${LOGS_API_URL}/loki/api/v1/query_range" \
  --data-urlencode 'query={app="resto-core-back"} | json | tenant_id="'"$TENANT_ID"'" | status_code >= 500' \
  --data-urlencode 'limit=20' | jq '.data.result[].values[][1] | fromjson'
```

### 3.2. Detección de Excepciones No Controladas
Obtener los últimos eventos de nivel `Error` o `Fatal` conteniendo stack traces:

```bash {"name": "filter-fatal-logs"}
curl -G -s "${LOGS_API_URL}/loki/api/v1/query_range" \
  --data-urlencode 'query={app="resto-core-back", level=~"Error|Fatal"} | json' \
  --data-urlencode 'limit=10' | jq '.data.result[].values[][1] | fromjson | {timestamp, error: .error.message, code: .error.code, trace_id, span_id}'
```

---

## 4. Paso 3: Correlación Bidireccional hacia la Traza Distribuida

Una vez identificado el log problemático, extraer su `trace_id` para evaluar el recorrido completo de la solicitud:

### 4.1. Extracción del Identificador de Traza
```bash {"name": "extract-trace-id"}
export TARGET_TRACE_ID=$(curl -G -s "${LOGS_API_URL}/loki/api/v1/query_range" \
  --data-urlencode 'query={app="resto-core-back"} | json | status_code >= 500' \
  --data-urlencode 'limit=1' | jq -r '.data.result[].values[][1] | fromjson | .trace_id')

echo "Trace ID correlacionado: ${TARGET_TRACE_ID}"
```

### 4.2. Inspección del Árbol de Spans
Consultar los detalles de latencia y componentes involucrados en la traza:

```bash {"name": "inspect-trace-spans"}
curl -s "${JAEGER_QUERY_URL}/api/traces/${TARGET_TRACE_ID}" | jq '.data[0].spans[] | {operationName, duration_ms: (.duration / 1000), tags: .tags}'
```

---

## 5. Paso 4: Diagnóstico de Cuellos de Botella de Latencia (SLA Carta QR)

Si la alerta operacional reporta una violación del presupuesto de latencia (< 2s en carta pública) sin generar código HTTP 500:

```bash {"name": "detect-slow-spans"}
# Filtrar trazas del endpoint público con duración superior a 2000ms
curl -G -s "${JAEGER_QUERY_URL}/api/traces" \
  --data-urlencode 'service=resto-core-back' \
  --data-urlencode 'operation=GET /api/v1/tenants/{tenant_slug}/menu' \
  --data-urlencode 'minDuration=2000ms' \
  --data-urlencode 'limit=5' | jq '.data[] | {traceID, duration_ms: (.spans[0].duration / 1000), spans_count: (.spans | length)}'
```

---

## 6. Paso 5: Verificación de Causa Raíz (PostgreSQL / SeaweedFS)

Validar si el tiempo degradado corresponde a bloqueos en base de datos o fallos en generación de URLs pre-firmadas:

```bash {"name": "inspect-db-spans"}
# Aislar spans correspondientes a consultas de persistencia (Npgsql / PostgreSQL)
curl -s "${JAEGER_QUERY_URL}/api/traces/${TARGET_TRACE_ID}" | jq '.data[0].spans[] | select(.tags[].key == "db.system") | {operationName, duration_ms: (.duration / 1000)}'
```

---

## 7. Criterios de Cierre del Incidente
1. La causa raíz fue identificada a través del log estructurado correspondiente al `trace_id`.
2. No se detectan transgresiones a las políticas de privacidad (PII) en los mensajes registrados.
3. Las métricas de latencia p95 retornaron a valores inferiores al umbral de 500ms en backend y 2000ms en renderizado de cliente.
