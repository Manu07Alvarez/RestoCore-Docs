// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  clientesSidebar: [
    {
      type: 'category',
      label: 'Especificaciones de Negocio',
      collapsed: false,
      items: [
        'clientes/vision-y-alcance',
        'clientes/prd-menu-qr',
        'clientes/prd-panel-admin',
        'clientes/prd-comanda-cocina',
        {
          type: 'category',
          label: 'Propuestas en Evaluación (Pendientes de Aprobación)',
          collapsed: false,
          items: [
            'clientes/propuestas/propuesta-prd-kds-avanzado',
            'clientes/propuestas/propuesta-prd-waiter-mobile-app',
            'clientes/propuestas/propuesta-prd-inventory-recipes',
            'clientes/propuestas/propuesta-prd-loyalty-feedback',
            'clientes/propuestas/propuesta-prd-fiscal-billing'
          ]
        }
      ]
    }
  ],
  developersSidebar: [
    {
      type: 'category',
      label: 'Gobernanza y Arquitectura',
      collapsed: false,
      items: [
        'developers/guia-onboarding',
        'developers/sdd-workflow',
        'developers/glosario-dominio',
        {
          type: 'category',
          label: 'Decisiones de Arquitectura (ADR)',
          collapsed: false,
          items: [
            'developers/adr/0001-adopcion-sdd',
            'developers/adr/0002-separacion-repositorios',
            'developers/adr/0003-migracion-postgresql',
            'developers/adr/0004-carga-asincrona-de-imagenes-seaweedfs',
            'developers/adr/0005-presupuesto-latencia-y-cache-cdn',
            'developers/adr/0006-seguridad-declarativa-opa-rego',
            'developers/adr/0007-procesamiento-pedidos-cola-fifo-websockets',
            'developers/adr/0008-desacoplamiento-catalogo-y-capa-visual-canvas',
            'developers/adr/0009-compilacion-aot-y-caching-perimetral-de-lienzo-canvas',
            'developers/adr/0010-baja-suave-de-platos-y-snapshots-inmutables',
            'developers/adr/0011-jerarquia-de-metricas-analiticas-y-telemetria-de-menu',
            'developers/adr/0012-postergacion-seguimiento-ocupacion-mesas-qr',
            'developers/adr/optimizacion-persistencia-jsonb-gin-postgresql',
            'developers/adr/cache-hibrido-l1-l2-latencia-menu-qr',
            'developers/adr/optimizacion-mediador-cqrs-pipeline-behaviors',
            'developers/adr/gobernanza-telemetria-opentelemetry-y-privacidad',
            'developers/adr/procesamiento-reactivo-streams-y-ciclo-vida-sockets',
            'developers/adr/empaquetado-distribucion-licencias-perpetuas'
          ]
        }
      ]
    },
    {
      type: 'category',
      label: 'Especificaciones Técnicas',
      collapsed: false,
      items: [
        'developers/arquitectura-backend-dotnet',
        'developers/diagnostico-optimizaciones-backend',
        'developers/contrato-api',
        'developers/observabilidad-telemetria',
        'developers/modelo-c4-sistema',
        'developers/historial-cambios'
      ]
    }
  ],
  usuariosSidebar: [
    {
      type: 'category',
      label: 'Manuales de Usuario',
      collapsed: false,
      items: [
        'usuarios/como-escanear-qr',
        'usuarios/gestion-de-platos'
      ]
    }
  ]
};

export default sidebars;
