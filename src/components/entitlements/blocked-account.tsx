import { LockKeyhole } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BlockedAccount() {
  return (
    <section
      aria-labelledby="blocked-account-title"
      className="flex min-w-0 flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-16"
    >
      <Card className="w-full max-w-2xl border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>
            <h1 id="blocked-account-title" className="text-balance">
              Cuenta temporalmente bloqueada
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <LockKeyhole aria-hidden="true" />
            <h2 className="col-start-2 min-h-4 text-balance font-medium tracking-tight">El acceso está restringido</h2>
            <AlertDescription className="text-pretty">
              La cuenta no puede usar los módulos en este momento. Intenta nuevamente más tarde o contacta a soporte.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
