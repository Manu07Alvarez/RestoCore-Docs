# Políticas de Autorización Declarativa para RestoCore (Open Policy Agent - OPA)
# Especificación bajo el estándar Security-as-Code (ADR-0006)

package restocore.authz

import future.keywords.in

# Principio de Menor Privilegio: Denegación por defecto
default allow = false

# -----------------------------------------------------------------------------
# 1. Acceso Público Libre (Sin Autenticación)
# Lectura de la Carta QR digital para clientes e ingesta de eventos de navegación
# -----------------------------------------------------------------------------
allow {
    input.method == "GET"
    input.path = ["api", "v1", "tenants", _, "menu"]
}

allow {
    input.method == "POST"
    input.path = ["api", "v1", "analytics", "collect"]
}

# -----------------------------------------------------------------------------
# 2. SuperAdmin (Administración Global del SaaS)
# Acceso ilimitado a nivel de plataforma
# -----------------------------------------------------------------------------
allow {
    "super_admin" in input.user.roles
}

# -----------------------------------------------------------------------------
# 3. Dueño / Administrador Principal (`owner` / `tenant_admin`)
# Gestión total dentro de su propio restaurante y administración de roles/permisos
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
        "archive_dish",
        "restore_dish",
        "manage_prices",
        "manage_branding",
        "manage_layout",
        "publish_menu",
        "manage_tables",
        "generate_presigned_url",
        "read_metrics",
        "manage_staff",
        "manage_roles",
        "read_orders",
        "manage_orders"
    ]
}

# -----------------------------------------------------------------------------
# 3.1. Evaluación Basada en Privilegios Dinámicos (Custom RBAC)
# Otorga acceso a cualquier acción requerida si el usuario posee dicho privilegio
# asignado a través de sus roles personalizados (input.user.permissions)
# -----------------------------------------------------------------------------
allow {
    input.user.tenant_id == input.resource.tenant_id
    input.action in input.user.permissions
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
