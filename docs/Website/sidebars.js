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
        'clientes/prd-panel-admin'
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
            'developers/adr/0005-presupuesto-latencia-y-cache-cdn'
          ]
        }
      ]
    },
    {
      type: 'category',
      label: 'Especificaciones Técnicas',
      collapsed: false,
      items: [
        'developers/contrato-api',
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
