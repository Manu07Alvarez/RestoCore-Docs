import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroDescription}>
          Portal centralizado de arquitectura, requerimientos evolutivos (PRDs), registros de decisiones (ADRs) y contratos de API para el ecosistema gastronómico multi-tenant.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/clientes/vision-y-alcance">
            Negocio & PRDs
          </Link>
          <Link
            className="button button--primary button--lg margin-left--md"
            to="/docs/developers/guia-onboarding">
            Arquitectura & API
          </Link>
          <Link
            className="button button--outline button--lg margin-left--md"
            to="/docs/usuarios/como-escanear-qr">
            Manuales de Usuario
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} | Especificaciones y Arquitectura`}
      description="Ecosistema de especificaciones y arquitectura Docs-as-Code para RestoCore">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
