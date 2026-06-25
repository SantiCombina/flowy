import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

interface ContactEmailProps {
  name: string;
  email: string;
  business?: string;
  message?: string;
}

export function ContactEmail({ name, email, business, message }: ContactEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Nuevo contacto de {name} desde Flowy</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={header}>
            <Text style={brandName}>Flowy</Text>
          </Section>

          <Section style={body}>
            <Heading style={heading}>Nuevo contacto</Heading>

            <Section style={fieldRow}>
              <Text style={fieldLabel}>Nombre</Text>
              <Text style={fieldValue}>{name}</Text>
            </Section>

            <Section style={fieldRow}>
              <Text style={fieldLabel}>Email</Text>
              <Text style={fieldValue}>{email}</Text>
            </Section>

            {business ? (
              <Section style={fieldRow}>
                <Text style={fieldLabel}>Negocio</Text>
                <Text style={fieldValue}>{business}</Text>
              </Section>
            ) : null}

            {message ? (
              <Section style={fieldRow}>
                <Text style={fieldLabel}>Mensaje</Text>
                <Text style={fieldValue}>{message}</Text>
              </Section>
            ) : null}

            <Hr style={divider} />

            <Text style={replyHint}>Podés responder directamente a este correo para contestarle a {name}.</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>Notificación automática desde el formulario de contacto de Flowy</Text>
            <Text style={footerText}>Responder a este correo envía tu respuesta al remitente original.</Text>
            <Hr style={footerDivider} />
            <Text style={footerCopy}>© {new Date().getFullYear()} Flowy</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const wrapper: React.CSSProperties = {
  margin: '40px auto',
  maxWidth: '560px',
};

const header: React.CSSProperties = {
  backgroundColor: '#18181b',
  borderRadius: '12px 12px 0 0',
  padding: '28px 40px',
  textAlign: 'center',
};

const brandName: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  margin: '0',
};

const body: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '32px 48px',
};

const heading: React.CSSProperties = {
  color: '#18181b',
  fontSize: '20px',
  fontWeight: '700',
  letterSpacing: '-0.3px',
  margin: '0 0 24px',
};

const fieldRow: React.CSSProperties = {
  marginBottom: '16px',
};

const fieldLabel: React.CSSProperties = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const fieldValue: React.CSSProperties = {
  color: '#18181b',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-wrap',
};

const divider: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
};

const replyHint: React.CSSProperties = {
  color: '#52525b',
  fontSize: '13px',
  fontStyle: 'italic',
  margin: '0',
};

const footer: React.CSSProperties = {
  backgroundColor: '#fafafa',
  borderRadius: '0 0 12px 12px',
  padding: '24px 48px 28px',
  border: '1px solid #e4e4e7',
  borderTop: 'none',
};

const footerText: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 4px',
};

const footerDivider: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '16px 0',
};

const footerCopy: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0',
};
