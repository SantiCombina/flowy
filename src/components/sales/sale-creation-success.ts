import type { CreatedSaleShare } from '@/lib/created-sale-share';
import type { SaleWhatsAppDetails } from '@/lib/sale-whatsapp';
import type { SaleValues } from '@/schemas/sales/sale-schema';

interface SaleCreationResultInput {
  result?: {
    success: boolean;
    sale?: CreatedSaleShare;
  };
  businessName: string | null;
}

export interface SaleCreationSuccessDetails {
  sale: SaleWhatsAppDetails;
  businessName: string | null;
}

interface SaleCreationResultDependencies {
  onCreated: (details: SaleCreationSuccessDetails) => void;
  onSuccess: () => void;
}

export interface SaleSubmissionResult {
  serverError?: string;
  data?: SaleCreationResultInput['result'];
}

interface ExecuteSaleCreationInput extends Omit<SaleCreationResultInput, 'result'> {
  values: SaleValues;
  submitSale: (values: SaleValues) => Promise<SaleSubmissionResult | undefined>;
}

interface ExecuteSaleCreationDependencies extends SaleCreationResultDependencies {
  setServerError: (error: string | null) => void;
}

export function handleSaleCreationResult(
  input: SaleCreationResultInput,
  dependencies: SaleCreationResultDependencies,
): boolean {
  if (!input.result?.success || !input.result.sale) return false;

  dependencies.onCreated({
    sale: {
      date: input.result.sale.date,
      notes: input.result.sale.notes,
      total: input.result.sale.total,
      items: input.result.sale.items.map((item) => ({
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    },
    businessName: input.businessName,
  });
  dependencies.onSuccess();

  return true;
}

export async function executeSaleCreation(
  input: ExecuteSaleCreationInput,
  dependencies: ExecuteSaleCreationDependencies,
): Promise<void> {
  dependencies.setServerError(null);
  const result = await input.submitSale(input.values);

  if (result?.serverError) {
    dependencies.setServerError(result.serverError);
    return;
  }

  handleSaleCreationResult(
    {
      result: result?.data,
      businessName: input.businessName,
    },
    dependencies,
  );
}
