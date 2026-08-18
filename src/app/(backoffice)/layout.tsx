import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import '@/app/(frontend)/globals.css';

import { BackofficeLayout } from '@/components/backoffice/backoffice-layout';
import { PushRegistration } from '@/components/notifications/push-registration';
import { QueryProvider } from '@/components/providers/query-provider';
import { UserProvider } from '@/components/providers/user-provider';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: {
    default: 'Panel backoffice · Flowy',
    template: '%s · Flowy',
  },
  description: 'Panel de backoffice de Flowy.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BackofficeGroupLayout({ children }: { children: React.ReactNode }) {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser) {
    redirect('/login');
  }

  if (guardedUser.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const { user } = guardedUser;

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <UserProvider
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        >
          <QueryProvider>
            <Suspense fallback={<BackofficeLayout defaultSidebarOpen={sidebarOpen}>{children}</BackofficeLayout>}>
              <BackofficeLayout defaultSidebarOpen={sidebarOpen}>{children}</BackofficeLayout>
              <PushRegistration />
              <Toaster />
            </Suspense>
          </QueryProvider>
        </UserProvider>
      </body>
    </html>
  );
}
