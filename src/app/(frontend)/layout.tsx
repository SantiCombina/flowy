import './globals.css';

export const metadata = {
  appleWebApp: {
    title: 'Flowy',
  },
  description: 'Sistema de gestión de negocio',
  title: 'Flowy',
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-title" content="Flowy" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
