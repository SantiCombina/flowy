'use client';

import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { Quote } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { ScrollReveal } from '@/components/landing/scroll-reveal';

const stats = [
  { value: 500, prefix: '+', suffix: '', label: 'distribuidoras' },
  { value: 2000000, prefix: '+', suffix: '', label: 'productos gestionados' },
  { value: 99.9, prefix: '', suffix: '%', label: 'uptime', decimals: 1 },
  { value: 24, prefix: '<', suffix: 'h', label: 'tiempo de respuesta' },
];

const testimonials = [
  {
    quote:
      'Antes usábamos planillas de Excel y nunca sabíamos el stock real. Con Flowy tengo visibilidad total de mi negocio en cualquier momento.',
    author: 'Mariana Gutiérrez',
    role: 'Dueña, Distribuidora Norte',
    initials: 'MG',
  },
  {
    quote:
      'Mis vendedores salen con el stock asignado y yo veo en tiempo real qué vendieron. La coordinación mejoró un 300%.',
    author: 'Carlos Benítez',
    role: 'Gerente, Mayorista Sur',
    initials: 'CB',
  },
  {
    quote: 'Implementamos Flowy en un día. La curva de aprendizaje es casi nula y el soporte responde al toque.',
    author: 'Lucía Fernández',
    role: 'COO, Distribuidora Centro',
    initials: 'LF',
  },
];

function formatCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
}

function AnimatedStat({ stat, index }: { stat: (typeof stats)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (stat.value >= 1000) return formatCount(Math.round(v));
    if (stat.decimals) return v.toFixed(stat.decimals);
    return Math.round(v).toFixed(0);
  });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, stat.value, {
        duration: 1.5,
        ease: 'easeOut',
      });
      return controls.stop;
    }
  }, [isInView, count, stat.value]);

  return (
    <ScrollReveal delay={index * 0.1}>
      <div ref={ref} className="text-center">
        <div
          className="text-4xl font-extrabold text-foreground sm:text-5xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span>{stat.prefix}</span>
          <motion.span>{rounded}</motion.span>
          <span>{stat.suffix}</span>
        </div>
        <div className="mt-1 text-sm font-medium text-foreground/65">{stat.label}</div>
      </div>
    </ScrollReveal>
  );
}

export function SocialProofSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[oklch(0.98_0.005_90)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <AnimatedStat key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, index) => (
            <ScrollReveal key={t.author} delay={0.1 + index * 0.15}>
              <div className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <Quote className="h-8 w-8 text-primary/30" />
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{t.quote}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-orange-100 to-orange-200 text-xs font-bold text-orange-700">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.author}</div>
                    <div className="text-xs text-foreground/65">{t.role}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
