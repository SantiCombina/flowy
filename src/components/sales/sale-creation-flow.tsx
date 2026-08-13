'use client';

import { Check, MessageCircle } from 'lucide-react';
import React, { useEffect, useReducer, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ResponsiveModalBody } from '@/components/ui/responsive-modal';
import { getSaleWhatsAppLink } from '@/lib/sale-whatsapp';
import type { SaleValues } from '@/schemas/sales/sale-schema';

import {
  executeSaleCreation,
  type SaleCreationSuccessDetails,
  type SaleSubmissionResult,
} from './sale-creation-success';

interface SaleCreationFlowRenderProps {
  close: () => void;
  serverError: string | null;
  submit: (values: SaleValues) => Promise<void>;
}

interface SaleCreationFlowProps {
  isOpen: boolean;
  businessName: string | null;
  submitSale: (values: SaleValues) => Promise<SaleSubmissionResult | undefined>;
  onSuccess: () => void;
  onClose: () => void;
  openShare?: (url: string, target: string) => void;
  renderForm: (props: SaleCreationFlowRenderProps) => ReactNode;
}

export interface SaleCreationFlowState {
  serverError: string | null;
  createdSale: SaleCreationSuccessDetails | null;
}

export type SaleCreationFlowEvent =
  | { type: 'reset' }
  | { type: 'submitting' }
  | { type: 'failed'; error: string }
  | { type: 'created'; details: SaleCreationSuccessDetails };

export const initialSaleCreationFlowState: SaleCreationFlowState = {
  serverError: null,
  createdSale: null,
};

export function saleCreationFlowReducer(
  state: SaleCreationFlowState,
  event: SaleCreationFlowEvent,
): SaleCreationFlowState {
  switch (event.type) {
    case 'reset':
    case 'submitting':
      return initialSaleCreationFlowState;
    case 'failed':
      return { serverError: event.error, createdSale: null };
    case 'created':
      return { serverError: null, createdSale: event.details };
    default:
      return state;
  }
}

export function getSaleCreationShareUrl(details: SaleCreationSuccessDetails): string {
  return getSaleWhatsAppLink(details.sale, details.businessName);
}

export interface SaleCreationRequestGate {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (requestId: number) => boolean;
}

export function createSaleCreationRequestGate(): SaleCreationRequestGate {
  let generation = 0;

  return {
    begin: () => {
      generation += 1;
      return generation;
    },
    invalidate: () => {
      generation += 1;
    },
    isCurrent: (requestId) => requestId === generation,
  };
}

interface GuardedSaleCreationDependencies {
  gate: SaleCreationRequestGate;
  onStateChange: (event: SaleCreationFlowEvent) => void;
  onSuccess: () => void;
}

export async function executeGuardedSaleCreation(
  input: {
    values: SaleValues;
    businessName: string | null;
    submitSale: (values: SaleValues) => Promise<SaleSubmissionResult | undefined>;
  },
  dependencies: GuardedSaleCreationDependencies,
): Promise<void> {
  const requestId = dependencies.gate.begin();

  await executeSaleCreation(input, {
    setServerError: (error) => {
      if (!dependencies.gate.isCurrent(requestId)) return;
      dependencies.onStateChange(error ? { type: 'failed', error } : { type: 'submitting' });
    },
    onCreated: (details) => {
      if (!dependencies.gate.isCurrent(requestId)) return;
      dependencies.onStateChange({ type: 'created', details });
    },
    onSuccess: () => {
      if (!dependencies.gate.isCurrent(requestId)) return;
      dependencies.onSuccess();
    },
  });
}

interface SaleCreationSuccessViewProps {
  details: SaleCreationSuccessDetails;
  onShare: () => void;
  onClose: () => void;
}

export function SaleCreationSuccessView({ onShare, onClose }: SaleCreationSuccessViewProps) {
  return (
    <ResponsiveModalBody className="flex items-center justify-center px-6 py-10 sm:px-10">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60 dark:bg-emerald-950/40 dark:ring-emerald-950/25">
          <div className="flex size-14 items-center justify-center rounded-full border-4 border-emerald-500 dark:border-emerald-400">
            <Check className="size-8 stroke-[3] text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
        </div>

        <div role="status" aria-live="polite">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">¡Venta registrada!</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            La venta fue guardada correctamente. Ya podés compartir el comprobante con tu cliente.
          </p>
          <p className="mt-6 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            La información de la venta está lista para enviar.
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button type="button" size="lg" className="w-full" onClick={onShare}>
            <MessageCircle aria-hidden="true" />
            Compartir comprobante
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </ResponsiveModalBody>
  );
}

export function SaleCreationFlow({
  isOpen,
  businessName,
  submitSale,
  onSuccess,
  onClose,
  openShare = (url, target) => window.open(url, target),
  renderForm,
}: SaleCreationFlowProps) {
  const [state, dispatch] = useReducer(saleCreationFlowReducer, initialSaleCreationFlowState);
  const [requestGate] = useState(createSaleCreationRequestGate);

  useEffect(() => {
    if (!isOpen) {
      requestGate.invalidate();
      dispatch({ type: 'reset' });
    }

    return () => requestGate.invalidate();
  }, [isOpen, requestGate]);

  const close = () => {
    requestGate.invalidate();
    dispatch({ type: 'reset' });
    onClose();
  };

  const submit = async (values: SaleValues) => {
    await executeGuardedSaleCreation(
      { values, submitSale, businessName },
      {
        gate: requestGate,
        onStateChange: dispatch,
        onSuccess,
      },
    );
  };

  const createdSale = state.createdSale;
  if (!createdSale) return renderForm({ close, serverError: state.serverError, submit });

  const share = () => {
    openShare(getSaleCreationShareUrl(createdSale), '_blank');
  };

  return <SaleCreationSuccessView details={createdSale} onShare={share} onClose={close} />;
}
