import { LayoutDashboard, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModuleAccess } from '@/lib/entitlements/module-access';

interface PlanCapabilityDeniedProps {
  access: ModuleAccess;
}

export function PlanCapabilityDenied({ access }: PlanCapabilityDeniedProps) {
  return (
    <section
      aria-labelledby="plan-access-denied-title"
      className="flex min-w-0 flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-16"
    >
      <Card className="w-full max-w-2xl border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>
            <h1 id="plan-access-denied-title" className="text-balance">
              Acceso no incluido en tu plan
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <ShieldAlert aria-hidden="true" />
            <h2 className="col-start-2 min-h-4 text-balance font-medium tracking-tight">
              {access.title} no está disponible
            </h2>
            <AlertDescription className="text-pretty">
              Tu plan actual no incluye el acceso a este módulo. Puedes continuar usando las funciones disponibles desde
              el dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/dashboard">
              <LayoutDashboard aria-hidden="true" data-icon="inline-start" />
              Ir al dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
