import React from 'react';
import { APP_NAME, INTERNSHIP_CREDIT, INTERNSHIP_URL, DISCLAIMER } from '../config/branding';

export function Footer({ className = '', style = {} }) {
  return (
    <footer
      className={`app-branding-footer ${className}`}
      style={{
        width: '100%',
        padding: '16px 12px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--ink-3)',
        lineHeight: 1.6,
        ...style,
      }}
    >
      <p style={{ margin: '0 auto', maxWidth: 760 }}>
        <span>{APP_NAME}</span>
        {' · '}
        <a
          href={INTERNSHIP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--ink-3)',
            textDecoration: 'none',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--ink-2)';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--ink-3)';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {INTERNSHIP_CREDIT}
        </a>
        {' · '}
        <span>{DISCLAIMER}</span>
      </p>
    </footer>
  );
}
