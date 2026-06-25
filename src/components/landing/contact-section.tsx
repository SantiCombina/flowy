'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';

import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { contactSchema, type ContactValues } from '@/schemas/contact/contact-schema';

import { sendContactAction } from './actions';

export function ContactSection() {
  const { executeAsync, isExecuting } = useAction(sendContactAction);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      business: '',
      message: '',
    },
  });

  async function onSubmit(data: ContactValues) {
    const result = await executeAsync(data);

    if (result?.serverError) {
      form.setError('root', { message: result.serverError });
      return;
    }

    if (result?.data?.success) {
      form.reset();
    }
  }

  return (
    <section className="relative py-24 sm:py-32 bg-neutral-50">
      <div id="contacto" className="scroll-mt-16" />

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 right-0 h-120 w-120 translate-x-1/3 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute bottom-1/3 left-0 h-120 w-120 -translate-x-1/3 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col justify-center">
            <ScrollReveal>
              <span className="inline-flex items-center rounded-full bg-foreground/5 px-3 py-1 text-sm font-medium text-foreground/60">
                Contacto
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2
                className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Charlá con nosotros
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <p className="mt-4 text-lg leading-relaxed text-foreground/60">
                Contanos en qué podemos ayudarte. Te mostramos cómo Flowy se adapta a tu negocio, sin compromiso.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="mt-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <MessageSquareText className="size-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Respuesta rápida</p>
                    <p className="text-xs text-foreground/50">Te contactamos en menos de 24 horas hábiles</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.25} direction="right">
            <div className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-lg sm:p-8">
              <AnimatePresence mode="wait">
                {form.formState.isSubmitSuccessful ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="relative flex items-center justify-center overflow-visible"
                    >
                      <div className="h-20 w-20 rounded-full bg-emerald-100" />
                      <div className="absolute inset-0 flex items-center justify-center overflow-visible">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-44 overflow-visible text-emerald-600 drop-shadow-sm"
                        >
                          <motion.path
                            d="M9 10 L12 14 L19 6"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.15, duration: 2, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </svg>
                      </div>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4 text-xl font-semibold text-foreground"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      ¡Mensaje enviado!
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-2 text-sm text-foreground/60"
                    >
                      Nos pondremos en contacto con vos en menos de 24 horas.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Button variant="outline" className="mt-6 rounded-full" onClick={() => form.reset()}>
                        Enviar otro mensaje
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground/80">Nombre</FormLabel>
                              <FormControl>
                                <Input placeholder="Tu nombre" autoComplete="name" maxLength={100} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground/80">Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="tu@email.com"
                                  autoComplete="email"
                                  spellCheck={false}
                                  maxLength={255}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="business"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground/80">Nombre del negocio</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Distribuidora..."
                                  autoComplete="organization"
                                  maxLength={200}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground/80">Mensaje</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Contanos un poco sobre tu negocio..."
                                  rows={4}
                                  maxLength={2000}
                                  {...field}
                                />
                              </FormControl>
                              <div className="flex items-center justify-between">
                                <FormMessage />
                                <span className="text-xs text-foreground/40 tabular-nums">
                                  {field.value?.length ?? 0}/2000
                                </span>
                              </div>
                            </FormItem>
                          )}
                        />

                        {form.formState.errors.root && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-destructive"
                          >
                            {form.formState.errors.root.message}
                          </motion.p>
                        )}

                        <Button type="submit" disabled={isExecuting} className="w-full rounded-full">
                          {isExecuting ? (
                            <span className="flex items-center gap-2">
                              <motion.span
                                className="inline-block size-4 rounded-full border-2 border-current border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                              />
                              Enviando...
                            </span>
                          ) : (
                            'Enviar mensaje'
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
