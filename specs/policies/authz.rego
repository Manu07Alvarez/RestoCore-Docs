# Políticas de Autorización Declarativa para RestoCore (Open Policy Agent - OPA)
# Especificación bajo el estándar Security-as-Code (ADR-0006)

package restocore.authz

import future.keywords.in

# Principio de Menor Privilegio: Denegación por defecto
default allow = false

# -----------------------------------------------------------------------------
# 1. Acceso Público Libre (Sin Autenticación)
# Únicamente la lectura de la Carta QR digital para clientes
# -----------------------------------------------------------------------------
allow {
    input.method == "GET"
    input.path = ["api", "v1", "tenants", _, "menu"]
}

# -----------------------------------------------------------------------------
# 2. SuperAdmin (Administración Global del SaaS)
# Acceso ilimitado a nivel de plataforma
# -----------------------------------------------------------------------------
allow {
    "super_admin" in input.user.roles
}

# -----------------------------------------------------------------------------
# 3. Dueño / Administrador de Tenant (`owner` / `tenant_admin`)
# Gestión total dentro de su propio restaurante (Aislamiento Multi-Tenant)
# -----------------------------------------------------------------------------
allow {
    input.user.tenant_id == input.resource.tenant_id
    some role in input.user.roles
    role in ["owner", "tenant_admin"]
    input.action in [
        "read_dashboard",
        "manage_menu",
        "manage_categories",
        "manage_dishes",
        "manage_prices",
        "manage_branding",
        "manage_tables",
        "generate_presigned_url",
        "read_metrics",
        "manage_staff",
        "read_orders",
        "manage_orders"
    ]
}

# -----------------------------------------------------------------------------
# 4. Personal de Cocina (`cook` / `kitchen_staff`)
# Visión limitada al Kitchen Display System (KDS) de su Tenant
# -----------------------------------------------------------------------------
allow {
    input.user.tenant_id == input.resource.tenant_id
    some role in input.user.roles
    role in ["cook", "kitchen_staff"]
    input.method in ["GET", "PATCH"]
    input.path[0] == "api"
    input.path[1] == "v1"
    input.path[2] == "orders"
    input.action in ["read_kitchen_orders", "update_order_status"]
}

# -----------------------------------------------------------------------------
# 5. Mozo / Personal de Salón (`waiter`)
# Operación limitada a toma de comandas y estado de mesas de su Tenant
# -----------------------------------------------------------------------------
allow {
    input.user.tenant_id == input.resource.tenant_id
    some role in input.user.roles
    role == "waiter"
    input.action in ["read_tables", "create_order", "read_orders", "update_order_status"]
}
