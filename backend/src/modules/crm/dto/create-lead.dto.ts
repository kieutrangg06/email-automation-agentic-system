export class CreateLeadDto {
  email: string;
  leadScore: number;
  company?: string;
}

export class CreateInvoiceDto {
  invoice_number: string;
  vendor_name: string;
  tax_code?: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  is_valid?: boolean;
}