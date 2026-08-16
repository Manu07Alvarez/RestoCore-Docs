---
name: runbook
description: Diseña y estructura Runbooks Ejecutables e Interactivos en Markdown utilizando el estándar Runme.dev para operaciones y despliegues. Se activa mediante /runbook o al solicitar guías operativas.
---

# Habilidad de Agente Antigravity: Runbooks Ejecutables Interactivos (/runbook)

Esta habilidad capacita al agente de IA para actuar como un ingeniero de operaciones (SRE/DevOps), convirtiendo procedimientos estáticos en **Runbooks Ejecutables e Interactivos** utilizando el estándar **Runme.dev** respaldado por los Módulos 08 y 10 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 08 - SOPs & Runbooks Ejecutables):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-08-procesos-operativos-sops-y-manuales-de-procedimiento)
* **Playbook de Ingeniería (Módulo 10 - Spec-Driven Infrastructure):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-10-devops-cicd-e-infraestructura)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente guiará el diseño de procedimientos operacionales ejecutables:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/runbook`)
* **Acción del Agente:** Explicará los riesgos del texto plano durante emergencias y la ventaja de los Runbooks Ejecutables (`Runme.dev`) con bloques de código ejecutables desde IDE/terminal.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas:
  1. ¿Qué procedimiento operativo deseas formalizar en este Runbook (ej. Despliegue de producción, migración de esquemas PostgreSQL JSONB, o recuperación ante fallos)?
  2. ¿Qué credenciales, variables de entorno o herramientas CLI específicas (ej. `psql`, `docker`, `kubectl`) requiere esta ejecución?

### 2. Invocación con Procedimiento Operativo
* **Formato Interactivo:** Estructurará el Markdown alternando pasos explicativos con bloques de comandos ejecutables seguros que no expongan credenciales en texto plano.
* **Confirmación de Seguridad:** Incluirá explícitamente puntos de validación antes de comandos destructivos.

---

## 🛠️ Estructura del Runbook Ejecutable (`Runme.dev`)

```markdown
# 🚀 Runbook: Migración de Esquema PostgreSQL JSONB

## 📋 Diagnóstico Previo
Ejecutar la verificación de conexión a la base de datos de especificaciones antes de aplicar la migración:

```bash {"name": "db-ping"}
psql $DATABASE_URL -c "SELECT version();"
```

## ⚙️ Paso 1: Aplicación del Script de Migración
Aplicar el script de migración para las columnas JSONB e índices GIN:

```bash {"name": "apply-migration"}
psql $DATABASE_URL -f ./scripts/migrations/0003_add_jsonb_gin_indexes.sql
```

## 🔍 Paso 2: Verificación de Salud
Verificar que los índices GIN sobre la tabla de menús estén activos:

```bash {"name": "verify-indexes"}
psql $DATABASE_URL -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'menus';"
```
```

---

## 🚫 Restricciones Inviolables de Operación
* Queda estrictamente prohibido incluir contraseñas o tokens en texto plano dentro de los Runbooks.
* Todos los Runbooks deben guardarse en la carpeta `/docs/runbooks/` con la extensión `.md`.
