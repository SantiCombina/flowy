import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  registerUrl: string;
  roleName: string;
  inviterName?: string;
}

export function InvitationEmail({ registerUrl, roleName, inviterName }: InvitationEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Fuiste invitado a unirte a Flowy como {roleName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>¡Fuiste invitado a Flowy!</Heading>
          <Section>
            <Text style={paragraph}>
              {inviterName ? `${inviterName} te invitó` : 'Fuiste invitado'} a unirte como <strong>{roleName}</strong>.
            </Text>
            <Text style={paragraph}>Hacé clic en el siguiente botón para crear tu cuenta:</Text>
          </Section>
          <Section style={buttonSection}>
            <Button href={registerUrl} style={button}>
              Crear Cuenta
            </Button>
          </Section>
          <Text style={footer}>Este enlace expira en 7 días.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '40px',
  borderRadius: '8px',
  maxWidth: '560px',
  border: '1px solid #e5e7eb',
};

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '24px',
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const buttonSection: React.CSSProperties = {
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#f59e0b',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
};

const footer: React.CSSProperties = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '24px 0 0',
};
