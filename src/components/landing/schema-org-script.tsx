'use client';

import { useEffect } from 'react';

interface SchemaOrgScriptProps {
  data: unknown;
}

export function SchemaOrgScript({ data }: SchemaOrgScriptProps) {
  useEffect(() => {
    const id = 'schema-org-landing';
    if (document.getElementById(id)) return;

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(id);
      if (existing) {
        document.head.removeChild(existing);
      }
    };
  }, [data]);

  return null;
}
