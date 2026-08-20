# Pruebas Unitarias para Políticas de Autorización Rego (specs/policies/authz.rego)

package restocore.authz_test

import future.keywords.in
import data.restocore.authz.allow

# Test 1: El cliente público puede leer el menú sin autenticación
test_public_menu_allowed {
    allow with input as {
        "method": "GET",
        "path": ["api", "v1", "tenants", "don-pepe", "menu"]
    }
}

# Test 2: El cliente público NO puede leer métricas de administración
test_public_metrics_denied {
    not allow with input as {
        "method": "GET",
        "path": ["api", "v1", "admin", "metrics"],
        "action": "read_metrics"
    }
}

# Test 3: El dueño del local puede gestionar el menú de su Tenant
test_owner_manage_menu_allowed {
    allow with input as {
        "user": {"roles": ["owner"], "tenant_id": "tenant_123"},
        "resource": {"tenant_id": "tenant_123"},
        "action": "manage_menu",
        "method": "PUT"
    }
}

# Test 4: El dueño NO puede modificar el menú de OTRO Tenant (Multi-Tenant Isolation)
test_owner_other_tenant_denied {
    not allow with input as {
        "user": {"roles": ["owner"], "tenant_id": "tenant_123"},
        "resource": {"tenant_id": "tenant_999"},
        "action": "manage_menu",
        "method": "PUT"
    }
}

# Test 5: El cocinero puede ver y actualizar comandas de su Tenant
test_cook_kds_allowed {
    allow with input as {
        "user": {"roles": ["cook"], "tenant_id": "tenant_123"},
        "resource": {"tenant_id": "tenant_123"},
        "action": "read_kitchen_orders",
        "method": "GET",
        "path": ["api", "v1", "orders"]
    }
}

# Test 6: El cocinero NO puede modificar precios del menú
test_cook_manage_prices_denied {
    not allow with input as {
        "user": {"roles": ["cook"], "tenant_id": "tenant_123"},
        "resource": {"tenant_id": "tenant_123"},
        "action": "manage_prices",
        "method": "PUT"
    }
}
