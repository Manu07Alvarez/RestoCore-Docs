---
name: sec
description: Diseña y valida políticas de seguridad y autorización declarativa utilizando el estándar Open Policy Agent (OPA) en sintaxis Rego. Se activa mediante /sec o al definir reglas de seguridad.
---

# Habilidad de Agente Antigravity: Security-as-Code con Open Policy Agent (/sec)

Esta habilidad capacita al agente de IA para actuar como un ingeniero de DevSecOps, formalizando reglas de autorización declarativa y políticas de acceso utilizando **Open Policy Agent (OPA)** en lenguaje **Rego** respaldado por el Módulo 11 del Playbook de Ingeniería.

## 📚 Bloque de Referencias (Playbook & Knowledge Base)
* **Playbook de Ingeniería (Módulo 11 - DevSecOps & Security-as-Code):** [Guía Playbook Ingeniería y Operaciones](../../knowledge/Guía Playbook Ingeniería y Operaciones.md#módulo-11-devsecops-y-seguridad)
* **Arquitectura Antigravity:** [Skills en Antigravity para .agent](../../knowledge/Skills en Antigravity para .agent.md)

---

## 🧭 Estrategia de Diálogo Interactivo y Revelación Progresiva (Obligatorio)

El agente guiará la definición de seguridad declarativa:

### 1. Invocación Vacía o Sin Parámetros Suficientes (ej. `/sec`)
* **Acción del Agente:** Explicará el concepto de *Security-as-Code* y la importancia de desacoplar las reglas de autorización del código de aplicación utilizando OPA/Rego.
* **Preguntas de Inicio:** Realizará exactamente dos preguntas:
  1. ¿Qué recurso REST o API deseamos proteger con reglas de autorización (ej. Modificación de precios de menú en el panel administrativo)?
  2. ¿Qué roles de usuario (`tenant_admin`, `owner`, `waiter`, `public_client`) tienen permiso para ejecutar estas acciones?

### 2. Invocación con Regla de Seguridad
* **Auditoría DevSecOps:** Garantizar que las políticas Rego se evalúen en el API Gateway y concuerden con los esquemas de OpenAPI 3.1 y la separación multi-tenant de RestoCore.

---

## 🛡️ Estructura de Política OPA / Rego (`Security-as-Code`)

```rego
package resto.authz

import future.keywords.in

default allow = false

# Permitir lectura pública de la carta QR sin autenticación
allow {
    input.method == "GET"
    input.path = ["api", "v1", "tenants", _, "menu"]
}

# Permitir modificación de menú solo a usuarios autenticados con rol tenant_admin
allow {
    input.method in ["POST", "PUT", "DELETE"]
    input.path = ["api", "v1", "tenants", tenant_id, "menu"]
    input.user.tenant_id == tenant_id
    "tenant_admin" in input.user.roles
}
```

---

## 🚫 Restricciones Inviolables de Operación
* Las reglas de autorización no deben estar cableadas (*hardcoded*) en el código fuente de las aplicaciones.
* Las políticas OPA/Rego deben persistirse en la carpeta `/specs/policies/` con la extensión `.rego`.
