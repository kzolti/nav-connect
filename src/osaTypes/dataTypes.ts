/**
 * Interface definitions for the Hungarian Online Invoice System (Magyar Online Számla Rendszer)
 * Based on the XML schema version 3.0 from 2020/11/23
 */

import { AddressType, SimpleAddressType } from "./invoiceBaseTypes"

interface InvoiceData {
  invoiceNumber: string;
  invoiceIssueDate: string;
  completenessIndicator: boolean;
  invoiceMain: InvoiceMain;
}

interface InvoiceMain {
  invoice?: Invoice;
  batchInvoice?: BatchInvoice[];
}

interface BatchInvoice {
  batchIndex: number;
  invoice: Invoice;
}

interface Invoice {
  invoiceReference?: InvoiceReference;
  invoiceHead: InvoiceHead;
  invoiceLines?: Lines;
  productFeeSummary?: ProductFeeSummary[];
  invoiceSummary: Summary;
}

interface InvoiceReference {
  originalInvoiceNumber: string;
  modifyWithoutMaster: boolean;
  modificationIndex: number;
}

interface InvoiceHead {
  supplierInfo: SupplierInfo;
  customerInfo?: CustomerInfo;
  fiscalRepresentativeInfo?: FiscalRepresentative;
  invoiceDetail: InvoiceDetail;
}

interface SupplierInfo {
  supplierTaxNumber: string;
  groupMemberTaxNumber?: string;
  communityVatNumber?: string;
  supplierName: string;
  supplierAddress: Address;
  supplierBankAccountNumber?: string;
  individualExemption?: boolean;
  exciseLicenceNum?: string;
}

interface CustomerInfo {
  customerVatStatus: CustomerVatStatusType;
  customerVatData?: CustomerVatData;
  customerName?: string;
  customerAddress?: Address;
  customerBankAccountNumber?: string;
}

type CustomerVatStatusType = 'DOMESTIC' | 'OTHER' | 'PRIVATE_PERSON';

interface CustomerVatData {
  customerTaxNumber?: CustomerTaxNumber;
  communityVatNumber?: string;
  thirdStateTaxId?: string;
}

interface CustomerTaxNumber {
  groupMemberTaxNumber?: string;
}

interface FiscalRepresentative {
  fiscalRepresentativeTaxNumber: string;
  fiscalRepresentativeName: string;
  fiscalRepresentativeAddress: Address;
  fiscalRepresentativeBankAccountNumber?: string;
}

type Address = AddressType;
interface InvoiceDetail {
  invoiceCategory: string; // Assuming InvoiceCategoryType is defined elsewhere
  invoiceDeliveryDate: string;
  invoiceDeliveryPeriodStart?: string;
  invoiceDeliveryPeriodEnd?: string;
  invoiceAccountingDeliveryDate?: string;
  periodicalSettlement?: boolean;
  smallBusinessIndicator?: boolean;
  currencyCode: string;
  exchangeRate: number;
  utilitySettlementIndicator?: boolean;
  selfBillingIndicator?: boolean;
  paymentMethod?: string; // Assuming PaymentMethodType is defined elsewhere
  paymentDate?: string;
  cashAccountingIndicator?: boolean;
  invoiceAppearance: string; // Assuming InvoiceAppearanceType is defined elsewhere
  conventionalInvoiceInfo?: ConventionalInvoiceInfo;
  additionalInvoiceData?: AdditionalData[];
}

interface ConventionalInvoiceInfo {
  orderNumbers?: OrderNumbers;
  deliveryNotes?: DeliveryNotes;
  shippingDates?: ShippingDates;
  contractNumbers?: ContractNumbers;
  supplierCompanyCodes?: SupplierCompanyCodes;
  customerCompanyCodes?: CustomerCompanyCodes;
  dealerCodes?: DealerCodes;
  costCenters?: CostCenters;
  projectNumbers?: ProjectNumbers;
  generalLedgerAccountNumbers?: GeneralLedgerAccountNumbers;
  glnNumbersSupplier?: GlnNumbers;
  glnNumbersCustomer?: GlnNumbers;
  materialNumbers?: MaterialNumbers;
  itemNumbers?: ItemNumbers;
  ekaerIds?: EkaerIds;
}

interface OrderNumbers {
  orderNumber: string[];
}

interface DeliveryNotes {
  deliveryNote: string[];
}

interface ShippingDates {
  shippingDate: string[];
}

interface ContractNumbers {
  contractNumber: string[];
}

interface SupplierCompanyCodes {
  supplierCompanyCode: string[];
}

interface CustomerCompanyCodes {
  customerCompanyCode: string[];
}

interface DealerCodes {
  dealerCode: string[];
}

interface CostCenters {
  costCenter: string[];
}

interface ProjectNumbers {
  projectNumber: string[];
}

interface GeneralLedgerAccountNumbers {
  generalLedgerAccountNumber: string[];
}

interface GlnNumbers {
  glnNumber: string[];
}

interface MaterialNumbers {
  materialNumber: string[];
}

interface ItemNumbers {
  itemNumber: string[];
}

interface EkaerIds {
  ekaerId: string[];
}

interface AdditionalData {
  dataName: string;
  dataDescription: string;
  dataValue: string;
}

interface Lines {
  mergedItemIndicator: boolean;
  line: Line[];
}

interface Line {
  lineNumber: number;
  lineModificationReference?: LineModificationReference;
  referencesToOtherLines?: ReferencesToOtherLines;
  advanceData?: AdvanceData;
  productCodes?: ProductCodes;
  lineExpressionIndicator: boolean;
  lineNatureIndicator?: 'PRODUCT' | 'SERVICE' | 'OTHER';
  lineDescription?: string;
  quantity?: number;
  unitOfMeasure?: UnitOfMeasureType;
  unitOfMeasureOwn?: string;
  unitPrice?: number;
  unitPriceHUF?: number;
  lineDiscountData?: DiscountData;
  lineAmountsNormal?: LineAmountsNormal;
  lineAmountsSimplified?: LineAmountsSimplified;
  intermediatedService?: boolean;
  aggregateInvoiceLineData?: AggregateInvoiceLineData;
  newTransportMean?: NewTransportMean;
  depositIndicator?: boolean;
  obligatedForProductFee?: boolean;
  GPCExcise?: number;
  dieselOilPurchase?: DieselOilPurchase;
  netaDeclaration?: boolean;
  productFeeClause?: ProductFeeClause;
  lineProductFeeContent?: ProductFeeData[];
  conventionalLineInfo?: ConventionalInvoiceInfo;
  additionalLineData?: AdditionalData[];
}

type UnitOfMeasureType = 'PIECE' | 'KILOGRAM' | 'TON' | 'KWH' | 'DAY' | 'HOUR' | 'MINUTE' | 'MONTH' | 'LITER' | 'KILOMETER' | 'CUBIC_METER' | 'METER' | 'LINEAR_METER' | 'CARTON' | 'PACK' | 'OWN';

interface LineModificationReference {
  lineNumberReference: number;
  lineOperation: 'CREATE' | 'MODIFY';
}

interface ReferencesToOtherLines {
  referenceToOtherLine: number[];
}

interface AdvanceData {
  advanceIndicator: boolean;
  advancePaymentData?: AdvancePaymentData;
}

interface AdvancePaymentData {
  advanceOriginalInvoice: string;
  advancePaymentDate: string;
  advanceExchangeRate: number;
}

interface ProductCodes {
  productCode: ProductCode[];
}

interface ProductCode {
  productCodeCategory: ProductCodeCategoryType;
  productCodeValue?: string;
  productCodeOwnValue?: string;
}

type ProductCodeCategoryType = 'VTSZ' | 'SZJ' | 'KN' | 'AHK' | 'CSK' | 'KT' | 'EJ' | 'TESZOR' | 'OWN' | 'OTHER';

interface DiscountData {
  discountDescription?: string;
  discountValue?: number;
  discountRate?: number;
}

interface LineAmountsNormal {
  lineNetAmountData: LineNetAmountData;
  lineVatRate: VatRate;
  lineVatData?: LineVatData;
  lineGrossAmountData?: LineGrossAmountData;
}

interface LineNetAmountData {
  lineNetAmount: number;
  lineNetAmountHUF: number;
}

interface VatRate {
  vatPercentage?: number;
  vatContent?: number;
  vatExemption?: DetailedReason;
  vatOutOfScope?: DetailedReason;
  vatDomesticReverseCharge?: boolean;
  marginSchemeIndicator?: MarginSchemeType;
  vatAmountMismatch?: VatAmountMismatch;
  noVatCharge?: boolean;
}

type MarginSchemeType = 'TRAVEL_AGENCY' | 'SECOND_HAND' | 'ARTWORK' | 'ANTIQUES';

interface DetailedReason {
  case: string;
  reason: string;
}

interface VatAmountMismatch {
  vatRate: number;
  case: string;
}

interface LineVatData {
  lineVatAmount: number;
  lineVatAmountHUF: number;
}

interface LineGrossAmountData {
  lineGrossAmountNormal: number;
  lineGrossAmountNormalHUF: number;
}

interface LineAmountsSimplified {
  lineVatRate: VatRate;
  lineGrossAmountSimplified: number;
  lineGrossAmountSimplifiedHUF: number;
}

interface AggregateInvoiceLineData {
  lineExchangeRate?: number;
  lineDeliveryDate: string;
}

interface NewTransportMean {
  brand?: string;
  serialNum?: string;
  engineNum?: string;
  firstEntryIntoService?: string;
  vehicle?: Vehicle;
  vessel?: Vessel;
  aircraft?: Aircraft;
}

interface Vehicle {
  engineCapacity: number;
  enginePower: number;
  kms: number;
}

interface Vessel {
  length: number;
  activityReferred: boolean;
  sailedHours: number;
}

interface Aircraft {
  takeOffWeight: number;
  airCargo: boolean;
  operationHours: number;
}

interface DieselOilPurchase {
  purchaseLocation: SimpleAddress;
  purchaseDate: string;
  vehicleRegistrationNumber: string;
  dieselOilQuantity?: number;
}

type SimpleAddress = SimpleAddressType;

interface ProductFeeClause {
  productFeeTakeoverData?: ProductFeeTakeoverData;
  customerDeclaration?: CustomerDeclaration;
}

interface ProductFeeTakeoverData {
  takeoverReason: TakeoverType;
  takeoverAmount?: number;
}

type TakeoverType = '01' | '02_aa' | '02_ab' | '02_b' | '02_c' | '02_d' | '02_ea' | '02_eb' | '02_fa' | '02_fb' | '02_ga' | '02_gb';

interface CustomerDeclaration {
  productStream: ProductStreamType;
  productFeeWeight?: number;
}

type ProductStreamType = 'BATTERY' | 'PACKAGING' | 'OTHER_PETROL' | 'ELECTRONIC' | 'TIRE' | 'COMMERCIAL' | 'PLASTIC' | 'OTHER_CHEMICAL' | 'PAPER';

interface ProductFeeData {
  productFeeCode: ProductCode;
  productFeeQuantity: number;
  productFeeMeasuringUnit: 'DARAB' | 'KG';
  productFeeRate: number;
  productFeeAmount: number;
}

interface Summary {
  summaryNormal?: SummaryNormal;
  summarySimplified?: SummarySimplified[];
  summaryGrossData?: SummaryGrossData;
}

interface SummaryNormal {
  summaryByVatRate: SummaryByVatRate[];
  invoiceNetAmount: number;
  invoiceNetAmountHUF: number;
  invoiceVatAmount: number;
  invoiceVatAmountHUF: number;
}

interface SummaryByVatRate {
  vatRate: VatRate;
  vatRateNetData: VatRateNetData;
  vatRateVatData: VatRateVatData;
  vatRateGrossData?: VatRateGrossData;
}

interface VatRateNetData {
  vatRateNetAmount: number;
  vatRateNetAmountHUF: number;
}

interface VatRateVatData {
  vatRateVatAmount: number;
  vatRateVatAmountHUF: number;
}

interface VatRateGrossData {
  vatRateGrossAmount: number;
  vatRateGrossAmountHUF: number;
}

interface SummarySimplified {
  vatRate: VatRate;
  vatContentGrossAmount: number;
  vatContentGrossAmountHUF: number;
}

interface SummaryGrossData {
  invoiceGrossAmount: number;
  invoiceGrossAmountHUF: number;
}

interface ProductFeeSummary {
  productFeeOperation: 'REFUND' | 'DEPOSIT';
  productFeeData: ProductFeeData[];
  productChargeSum: number;
  paymentEvidenceDocumentData?: PaymentEvidenceDocumentData;
}

interface PaymentEvidenceDocumentData {
  evidenceDocumentNo: string;
  evidenceDocumentDate: string;
  obligatedName: string;
  obligatedAddress: Address;
  obligatedTaxNumber: string;
}