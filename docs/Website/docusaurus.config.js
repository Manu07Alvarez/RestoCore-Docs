// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'RestoCore Docs',
  tagline: 'Ecosistema de Especificaciones y Arquitectura Docs-as-Code',
  favicon: 'img/favicon.ico',

  url: 'https://Manu07Alvarez.github.io',
  baseUrl: '/RestoCore-Docs/',

  organizationName: 'Manu07Alvarez',
  projectName: 'RestoCore-Docs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/Manu07Alvarez/RestoCore-Docs/tree/master/docs/Website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'forest' },
      },
      navbar: {
        title: 'RestoCore Docs',
        logo: {
          alt: 'RestoCore Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'clientesSidebar',
            position: 'left',
            label: 'Negocio & PRDs',
          },
          {
            type: 'docSidebar',
            sidebarId: 'developersSidebar',
            position: 'left',
            label: 'Arquitectura & API',
          },
          {
            type: 'docSidebar',
            sidebarId: 'usuariosSidebar',
            position: 'left',
            label: 'Manuales de Usuario',
          },
          {
            href: 'https://github.com/Manu07Alvarez/RestoCore-Docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentación',
            items: [
              {
                label: 'Negocio & PRDs',
                to: '/docs/clientes/vision-y-alcance',
              },
              {
                label: 'Arquitectura & API',
                to: '/docs/developers/guia-onboarding',
              },
              {
                label: 'Manuales de Usuario',
                to: '/docs/usuarios/como-escanear-qr',
              },
            ],
          },
          {
            title: 'Ecosistema',
            items: [
              {
                label: 'Repositorio Frontend',
                href: 'https://github.com/Manu07Alvarez/resto-core-front',
              },
              {
                label: 'Repositorio Backend',
                href: 'https://github.com/Manu07Alvarez/resto-core-back',
              },
            ],
          },
          {
            title: 'Más',
            items: [
              {
                label: 'GitHub Repositorio Specs',
                href: 'https://github.com/Manu07Alvarez/RestoCore-Docs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} RestoCore Project. Construido con Docusaurus y Docs-as-Code.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
