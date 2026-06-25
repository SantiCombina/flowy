'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CtaSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="relative py-24 sm:py-32 bg-neutral-50">
      <div id="contacto" className="scroll-mt-16" />

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/8 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <h2
              className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ¿Listo para modernizar tu distribuidora?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-4 text-lg text-foreground/60">
              Solicitá una demo gratuita. Te mostramos cómo Flowy se adapta a tu negocio sin compromiso.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.2} className="mt-16 mx-auto max-w-2xl">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3
                  className="mt-4 text-xl font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ¡Solicitud enviada!
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Nos pondremos en contacto con vos en menos de 24 horas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-foreground/80">
                      Nombre
                    </Label>
                    <Input id="name" name="name" placeholder="Tu nombre" autoComplete="name" required />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-foreground/80">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      autoComplete="email"
                      spellCheck={false}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="business" className="text-foreground/80">
                    Nombre del negocio
                  </Label>
                  <Input id="business" name="business" placeholder="Distribuidora..." autoComplete="organization" />
                </div>
                <div>
                  <Label htmlFor="message" className="text-foreground/80">
                    Mensaje
                  </Label>
                  <Textarea id="message" name="message" placeholder="Contanos un poco sobre tu negocio..." rows={4} />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Enviar solicitud
                </Button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
