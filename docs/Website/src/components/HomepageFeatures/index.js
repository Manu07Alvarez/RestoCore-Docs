import React from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Spec-Driven Development (SDD)',
    code: 'docs/sdd-workflow.md',
    description: (
      <>
        Ciclo de vida en 7 fases secuenciales donde la especificación ejecutable en Git es la Única Fuente de Verdad (SSOT) previa a cualquier línea de código.
      </>
    ),
  },
  {
    title: 'REST API & Latencia < 2s LCP',
    code: 'specs/openapi.yaml',
    description: (
      <>
        Contratos OpenAPI 3.1 optimizados para la renderización de la Carta QR pública en menos de 2 segundos desde dispositivos móviles.
      </>
    ),
  },
  {
    title: 'PostgreSQL con JSONB [ADR-0003]',
    code: 'docs/adr/0003-postgres',
    description: (
      <>
        Persistencia semiestructurada eficiente mediante columnas <code>JSONB</code> e índices <code>GIN</code> para menús, categorías y modificadores.
      </>
    ),
  },
  {
    title: 'SeaweedFS & URLs Pre-firmadas',
    code: 'specs/images.yaml',
    description: (
      <>
        Almacenamiento distribuido con carga asíncrona de imágenes mediante URLs pre-firmadas generadas por el backend, evitando streams multipart directos.
      </>
    ),
  },
  {
    title: 'Puerta de Calidad Spec Gate',
    code: 'skills/pr/SKILL.md',
    description: (
      <>
        Aislamiento inteligente de decisiones de arquitectura (ADRs) y Pull Requests estructurados exhaustivamente como Centro de Discusión.
      </>
    ),
  },
  {
    title: 'Multi-Tenant & Security-as-Code',
    code: 'specs/policies/opa.rego',
    description: (
      <>
        Aislamiento estricto de datos por Tenant y autorización declarativa mediante Open Policy Agent (OPA) en sintaxis Rego.
      </>
    ),
  },
];

function Feature({title, code, description}) {
  return (
    <div className={clsx('col col--4 margin-bottom--lg')}>
      <div className={clsx('card', styles.featureCard)}>
        <div className="card__header">
          <span className={styles.featureBadge}>{code}</span>
          <Heading as="h3" className="margin-top--sm">{title}</Heading>
        </div>
        <div className="card__body">
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
