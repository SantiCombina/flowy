'use client';

import { Check } from 'lucide-react';
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
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-success-muted/40 ring-8 ring-success-muted">
          <div className="flex size-14 items-center justify-center rounded-full border-4 border-success bg-card">
            <Check className="size-8 stroke-[3] text-success" aria-hidden="true" />
          </div>
        </div>

        <div role="status" aria-live="polite">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">¡Venta registrada!</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            La venta fue guardada correctamente. Ya podés compartir el comprobante con tu cliente.
          </p>
          <p className="mt-6 w-full rounded-xl border border-success/30 bg-success-muted px-4 py-3 text-left text-sm font-medium text-success-muted-foreground">
            La información de la venta está lista para enviar.
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button
            type="button"
            size="lg"
            className="w-full bg-[#25d366] text-white shadow-sm hover:bg-[#20bd5a] focus-visible:ring-[#25d366]/40 active:bg-[#1da851]"
            onClick={onShare}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Compartir por WhatsApp
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
