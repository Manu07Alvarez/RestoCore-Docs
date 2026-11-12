# Modelo Comercial, Distribución y Licenciamiento

Este documento define las modalidades comerciales de distribución, las reglas contractuales de licenciamiento y los lineamientos legales de empaquetado para la plataforma **RestoCore**. Su contenido es estrictamente de negocio y gobernanza comercial, desacoplado de la especificación técnica de implementación en código.

---

## 1. Propósito y Alcance

El modelo de comercialización permite ofrecer la plataforma de gestión gastronómica y menú digital bajo tres modalidades de distribución complementarias, adaptadas a distintos perfiles operativos y capacidades de infraestructura de los clientes:

1. **SaaS (Software as a Service):** Alojado y gestionado en infraestructura propia del proveedor bajo un esquema multi-tenant lógico.
2. **Modalidad Intermedia (Single-Tenant Gestionado):** Instancia aislada en infraestructura propia administrada por el proveedor.
3. **Licencia Perpetua Auto-hospedada (Self-Hosted / On-Premise):** Distribuida como artefactos compilados en contenedores Docker para despliegue en servidores del cliente.

---

## 2. Modalidades de Distribución

| Criterio | SaaS (Cloud Gestionado) | Single-Tenant Gestionado (Híbrido) | Licencia Perpetua (Self-Hosted) |
| :--- | :--- | :--- | :--- |
| **Esquema de Cobro** | Suscripción mensual o anual (MRR / ARR). | Suscripción mensual superior (instancia dedicada). | Pago único inicial (CapEx) + mantenimiento anual opcional. |
| **Infraestructura** | Proveedor (compartida multi-tenant). | Proveedor (VPS / contenedor aislado). | Cliente (servidor físico o nube privada propia). |
| **Actualizaciones** | Continuas y automáticas. | Continuas y automáticas. | Congeladas en la versión mayor adquirida (ej. `v1.x`). |
| **Backups y Seguridad** | Gestionados por el proveedor. | Gestionados por el proveedor. | Responsabilidad exclusiva del cliente. |
| **Propiedad de Datos** | En nube del proveedor (exportable). | En instancia aislada del proveedor. | Residen físicamente en servidores del cliente. |

---

## 3. Reglas Contractuales de Licenciamiento

### 3.1. Unidad de Licenciamiento
Toda licencia, tanto en modalidad **SaaS** como **Perpetua (Self-Hosted)**, se comercializa **por sucursal o punto de venta físico**. Cada local operativo adicional requiere su correspondiente cupo de sucursal habilitado en la suscripción o en el archivo de licencia.

### 3.2. Alcance de Versiones en Licencia Perpetua
* La licencia perpetua otorga derecho de uso indefinido sobre la **versión mayor adquirida** (por ejemplo, `v1.x`), incluyendo parches correctivos menores dentro de dicha rama.
* El acceso a nuevas versiones mayores (`v2.0+`), mejoras evolutivas mayores y soporte técnico prioritario requiere la contratación del **Contrato de Mantenimiento y Actualizaciones Anual** opcional.

### 3.3. Delimitación de Garantía y Soporte
La licencia perpetua cubre exclusivamente defectos propios del software correspondientes a la versión compilada entregada. Quedan excluidos de la garantía y del soporte gratuito:
* Fallos derivados de la infraestructura del cliente (cortes eléctricos, caídas de red local o WAN).
* Pérdida o corrupción de datos ocasionada por ausencia o falla de políticas de respaldo (backups) propias del cliente.
* Incidentes provocados por alteraciones manuales en la base de datos o errores de configuración en el servidor anfitrión.

---

## 4. Blindaje Legal de Dependencias en Distribución Self-Hosted

Todo el ecosistema de infraestructura empaquetado para entrega al cliente bajo modalidad auto-hospedada (base de datos, almacenamiento de objetos, proxy y servicios auxiliares) debe utilizar exclusivamente componentes con licencias de código abierto permisivas aprobadas por la **Open Source Initiative (OSI)**:

* **Licencias Permitidas:** Licencia PostgreSQL, Apache 2.0, MIT, BSD-3-Clause.
* **Licencias Excluidas:** Queda prohibido empaquetar motores o herramientas bajo licencias restrictivas o *source-available* con restricciones de comercialización (como BSL o SSPL) que puedan generar conflictos legales o de redistribución comercial.

---

## 5. Referencias Cruzadas

* Para consultar la escala de precios vigente y referencias cambiarias, véase [Escala de Precios y Referencias de Mercado](./escala-precios-mercado.md).
* Para consultar los detalles de implementación en código (.NET, validación criptográfica offline, variables de entorno y criterios EARS), véase [Especificación Técnica de Licenciamiento y Despliegue](../developers/especificacion-licenciamiento-tecnico.md).
