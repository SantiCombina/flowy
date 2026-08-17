import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminDashboardProps {
  userName: string;
  monthLabel: string;
}

export function AdminDashboard({ userName, monthLabel }: AdminDashboardProps) {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={`Bienvenido, ${userName}!`} description={`Panel de administración · ${monthLabel}`} />
      <div className="flex-1 px-4 sm:px-6 pb-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la plataforma</CardTitle>
            <CardDescription>Acá vas a ver el resumen general de Flowy.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Acá vas a ver el resumen de la plataforma.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
