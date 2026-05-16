'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function CtaSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="contacto" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="animate-fade-up text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ¿Listo para modernizar tu distribuidora?
          </h2>
          <p className="animate-fade-up delay-100 mt-4 text-lg text-muted-foreground">
            Solicitá una demo gratuita. Te mostramos cómo Flowy se adapta a tu negocio sin compromiso.
          </p>
        </div>

        <div className="animate-fade-up delay-200 mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center" aria-live="polite">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <Mail className="h-8 w-8 text-success" aria-hidden="true" />
                </div>
                <h3
                  className="mt-4 text-xl font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ¡Solicitud enviada!
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nos pondremos en contacto con vos en menos de 24 horas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Tu nombre"
                    autoComplete="name"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    spellCheck={false}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="business">Nombre del negocio</Label>
                  <Input
                    id="business"
                    name="business"
                    placeholder="Distribuidora..."
                    autoComplete="organization"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Contanos un poco sobre tu negocio..."
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" className={cn('w-full rounded-full')}>
                  Enviar solicitud
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              ¿Preferís hablar?
            </h3>
            <p className="mt-3 text-muted-foreground">Escríbenos directamente y te respondemos a la brevedad.</p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Email</div>
                  <a
                    href="mailto:contacto@flowy.app"
                    className="text-sm text-primary transition-colors hover:underline"
                  >
                    contacto@flowy.app
                  </a>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Respondemos en menos de 24 horas.</span> No usamos bots.
                  Cada consulta la lee un humano de nuestro equipo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
