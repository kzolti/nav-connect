/**
 * This file contains TypeScript interfaces generated from the Hungarian Online Invoice System API XML schema
 * Original schema: http://schemas.nav.gov.hu/OSA/3.0/api
 */

import {
    // Common types
    AtomicStringType8,
    AtomicStringType15,
    AtomicStringType32,
    SimpleText50NotBlankType,
    SimpleText512NotBlankType,
    GenericTimestampType,
    BusinessResultCodeType,
    TechnicalResultCodeType,
    EntityIdType,
    LoginType,
    RequestPageType,
    ResponsePageType,
    TaxpayerIdType,
    CurrencyType,
    CountryCodeType,
    CryptoType,
    BasicHeaderType,
    BasicRequestType,
    BasicResponseType,
    BasicResultType,
    TechnicalValidationResultType,
    UserHeaderType,
    GeneralErrorHeaderResponseType,
    SimpleText100NotBlankType,
    SimpleText1024NotBlankType,
    SimpleText15NotBlankType,
    SimpleText200NotBlankType
} from './commonTypes';

import {
    // Base types
    InvoiceAppearanceType,
    InvoiceCategoryType,
    InvoiceDateType,
    InvoiceIndexType,
    InvoiceTimestampType,
    InvoiceUnboundedIndexType,
    LineNumberType,
    MonetaryType,
    PaymentMethodType,
    DetailedAddressType,
    TaxNumberType
} from './baseTypes';


/**
 * Simple types from invoiceApi.xsd
 */
export type AnnulmentVerificationStatusType = 'NOT_VERIFIABLE' | 'VERIFICATION_PENDING' | 'VERIFICATION_DONE' | 'VERIFICATION_REJECTED';
export type IncorporationType = 'ORGANIZATION' | 'SELF_EMPLOYED' | 'TAXABLE_PERSON';
export type InvoiceDirectionType = 'INBOUND' | 'OUTBOUND';
export type InvoiceStatusType = 'RECEIVED' | 'PROCESSING' | 'SAVED' | 'DONE' | 'ABORTED';
export type ManageAnnulmentOperationType = 'ANNUL';
export type ManageInvoiceOperationType = 'CREATE' | 'MODIFY' | 'STORNO';
export type OriginalRequestVersionType = '1.0' | '1.1' | '2.0' | '3.0';
export type QueryNameType = string; // SimpleText512NotBlankType with minLength 5
export type QueryOperatorType = 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE';
export type RequestStatusType = 'RECEIVED' | 'PROCESSING' | 'SAVED' | 'FINISHED' | 'NOTIFIED';
export type SoftwareIdType = string; // 18 chars, pattern [0-9A-Z\-]{18}
export type SoftwareOperationType = 'LOCAL_SOFTWARE' | 'ONLINE_SERVICE';
export type SourceType = 'WEB' | 'XML' | 'MGM' | 'OPG' | 'OSZ';
export type TaxpayerAddressTypeType = 'HQ' | 'SITE' | 'BRANCH';

/**
 * Complex types from invoiceApi.xsd
 */
export interface AdditionalQueryParamsType {
    taxNumber?: TaxpayerIdType;
    groupMemberTaxNumber?: TaxpayerIdType;
    name?: QueryNameType;
    invoiceCategory?: InvoiceCategoryType;
    paymentMethod?: PaymentMethodType;
    invoiceAppearance?: InvoiceAppearanceType;
    source?: SourceType;
    currency?: CurrencyType;
}

export interface AnnulmentDataType {
    annulmentVerificationStatus: AnnulmentVerificationStatusType;
    annulmentDecisionDate?: InvoiceTimestampType;
    annulmentDecisionUser?: LoginType;
}

export interface AnnulmentOperationListType {
    annulmentOperation: AnnulmentOperationType[];
}

export interface AnnulmentOperationType {
    index: InvoiceIndexType;
    annulmentOperation: ManageAnnulmentOperationType;
    invoiceAnnulment: string; // base64Binary
}

export interface AuditDataType {
    insdate: InvoiceTimestampType;
    insCusUser: LoginType;
    source: SourceType;
    transactionId?: EntityIdType;
    index?: InvoiceIndexType;
    batchIndex?: InvoiceUnboundedIndexType;
    originalRequestVersion: OriginalRequestVersionType;
}

export interface BasicOnlineInvoiceRequestType extends BasicRequestType {
    software: SoftwareType;
}

export interface BasicOnlineInvoiceResponseType extends BasicResponseType {
    software: SoftwareType;
}

export interface BusinessValidationResultType {
    validationResultCode: BusinessResultCodeType;
    validationErrorCode?: SimpleText100NotBlankType;
    message?: SimpleText512NotBlankType;
    pointer?: PointerType;
}

export interface DateIntervalParamType {
    dateFrom: InvoiceDateType;
    dateTo: InvoiceDateType;
}

export interface DateTimeIntervalParamType {
    dateTimeFrom: InvoiceTimestampType;
    dateTimeTo: InvoiceTimestampType;
}

export interface GeneralErrorResponseType extends GeneralErrorHeaderResponseType {
    software: SoftwareType;
    technicalValidationMessages?: TechnicalValidationResultType[];
}

export interface InvoiceChainDigestResultType {
    currentPage: ResponsePageType;
    availablePage: ResponsePageType;
    invoiceChainElement?: InvoiceChainElementType[];
}

export interface InvoiceChainDigestType {
    invoiceNumber: SimpleText50NotBlankType;
    batchIndex?: InvoiceUnboundedIndexType;
    invoiceOperation: ManageInvoiceOperationType;
    supplierTaxNumber: TaxpayerIdType;
    customerTaxNumber?: TaxpayerIdType;
    insDate: InvoiceTimestampType;
    originalRequestVersion: OriginalRequestVersionType;
}

export interface InvoiceChainElementType {
    invoiceChainDigest: InvoiceChainDigestType;
    invoiceLines?: InvoiceLinesType;
    invoiceReferenceData?: InvoiceReferenceDataType;
}

export interface InvoiceChainQueryType {
    invoiceNumber: SimpleText50NotBlankType;
    invoiceDirection: InvoiceDirectionType;
    taxNumber?: TaxpayerIdType;
}

export interface InvoiceDataResultType {
    invoiceData: string; // base64Binary
    auditData: AuditDataType;
    compressedContentIndicator: boolean;
    electronicInvoiceHash?: CryptoType;
}

export interface InvoiceDigestResultType {
    currentPage: ResponsePageType;
    availablePage: ResponsePageType;
    invoiceDigest?: InvoiceDigestType[];
}

export interface InvoiceDigestType {
    invoiceNumber: SimpleText50NotBlankType;
    batchIndex?: InvoiceUnboundedIndexType;
    invoiceOperation: ManageInvoiceOperationType;
    invoiceCategory: InvoiceCategoryType;
    invoiceIssueDate: InvoiceDateType;
    supplierTaxNumber: TaxpayerIdType;
    supplierGroupMemberTaxNumber?: TaxpayerIdType;
    supplierName: SimpleText512NotBlankType;
    customerTaxNumber?: TaxpayerIdType;
    customerGroupMemberTaxNumber?: TaxpayerIdType;
    customerName?: SimpleText512NotBlankType;
    paymentMethod?: PaymentMethodType;
    paymentDate?: InvoiceDateType;
    invoiceAppearance?: InvoiceAppearanceType;
    source?: SourceType;
    invoiceDeliveryDate?: InvoiceDateType;
    currency?: CurrencyType;
    invoiceNetAmount?: MonetaryType;
    invoiceNetAmountHUF?: MonetaryType;
    invoiceVatAmount?: MonetaryType;
    invoiceVatAmountHUF?: MonetaryType;
    transactionId?: EntityIdType;
    index?: InvoiceIndexType;
    originalInvoiceNumber?: SimpleText50NotBlankType;
    modificationIndex?: InvoiceUnboundedIndexType;
    insDate: InvoiceTimestampType;
    completenessIndicator?: boolean;
}

export interface InvoiceLinesType {
    maxLineNumber: LineNumberType;
    newCreatedLines?: NewCreatedLinesType[];
}

export interface InvoiceNumberQueryType {
    invoiceNumber: SimpleText50NotBlankType;
    invoiceDirection: InvoiceDirectionType;
    batchIndex?: InvoiceUnboundedIndexType;
    supplierTaxNumber?: TaxpayerIdType;
}

export interface InvoiceOperationListType {
    compressedContent: boolean;
    invoiceOperation: InvoiceOperationType[];
}

export interface InvoiceOperationType {
    index: InvoiceIndexType;
    invoiceOperation: ManageInvoiceOperationType;
    invoiceData: string; // base64Binary
    electronicInvoiceHash?: CryptoType;
}

export interface InvoiceQueryParamsType {
    mandatoryQueryParams: MandatoryQueryParamsType;
    additionalQueryParams?: AdditionalQueryParamsType;
    relationalQueryParams?: RelationalQueryParamsType;
    transactionQueryParams?: TransactionQueryParamsType;
}

export interface InvoiceReferenceDataType {
    originalInvoiceNumber: SimpleText50NotBlankType;
    modifyWithoutMaster: boolean;
    modificationTimestamp?: InvoiceTimestampType;
    modificationIndex?: InvoiceUnboundedIndexType;
}

export interface ManageAnnulmentRequestType extends BasicOnlineInvoiceRequestType {
    exchangeToken: SimpleText50NotBlankType;
    annulmentOperations: AnnulmentOperationListType;
}

export interface ManageInvoiceRequestType extends BasicOnlineInvoiceRequestType {
    exchangeToken: SimpleText50NotBlankType;
    invoiceOperations: InvoiceOperationListType;
}

export interface MandatoryQueryParamsType {
    invoiceIssueDate?: DateIntervalParamType;
    insDate?: DateTimeIntervalParamType;
    originalInvoiceNumber?: SimpleText50NotBlankType;
}

export interface NewCreatedLinesType {
    lineNumberIntervalStart: LineNumberType;
    lineNumberIntervalEnd: LineNumberType;
}

export interface PointerType {
    tag?: SimpleText1024NotBlankType;
    value?: SimpleText1024NotBlankType;
    line?: LineNumberType;
    originalInvoiceNumber?: SimpleText50NotBlankType;
}

export interface ProcessingResultListType {
    processingResult: ProcessingResultType[];
    originalRequestVersion: OriginalRequestVersionType;
    annulmentData?: AnnulmentDataType;
}

export interface ProcessingResultType {
    index: InvoiceIndexType;
    batchIndex?: InvoiceUnboundedIndexType;
    invoiceStatus: InvoiceStatusType;
    technicalValidationMessages?: TechnicalValidationResultType[];
    businessValidationMessages?: BusinessValidationResultType[];
    compressedContentIndicator: boolean;
    originalRequest?: string; // base64Binary
}

export interface QueryInvoiceChainDigestRequestType extends BasicOnlineInvoiceRequestType {
    page: RequestPageType;
    invoiceChainQuery: InvoiceChainQueryType;
}

export interface QueryInvoiceChainDigestResponseType extends BasicOnlineInvoiceResponseType {
    invoiceChainDigestResult: InvoiceChainDigestResultType;
}

export interface QueryInvoiceCheckResponseType extends BasicOnlineInvoiceResponseType {
    invoiceCheckResult: boolean;
}

export interface QueryInvoiceDataRequestType extends BasicOnlineInvoiceRequestType {
    invoiceNumberQuery: InvoiceNumberQueryType;
}

export interface QueryInvoiceDataResponseType extends BasicOnlineInvoiceResponseType {
    invoiceDataResult?: InvoiceDataResultType;
}

export interface QueryInvoiceDigestRequestType extends BasicOnlineInvoiceRequestType {
    page: RequestPageType;
    invoiceDirection: InvoiceDirectionType;
    invoiceQueryParams: InvoiceQueryParamsType;
}

export interface QueryInvoiceDigestResponseType extends BasicOnlineInvoiceResponseType {
    invoiceDigestResult: InvoiceDigestResultType;
}

export interface QueryTaxpayerRequestType extends BasicOnlineInvoiceRequestType {
    taxNumber: TaxpayerIdType;
}

export interface QueryTaxpayerResponseType extends BasicOnlineInvoiceResponseType {
    infoDate?: GenericTimestampType;
    taxpayerValidity?: boolean;
    taxpayerData?: TaxpayerDataType;
}

export interface QueryTransactionListRequestType extends BasicOnlineInvoiceRequestType {
    page: RequestPageType;
    insDate: DateTimeIntervalParamType;
    requestStatus?: RequestStatusType;
}

export interface QueryTransactionListResponseType extends BasicOnlineInvoiceResponseType {
    transactionListResult: TransactionListResultType;
}

export interface QueryTransactionStatusRequestType extends BasicOnlineInvoiceRequestType {
    transactionId: EntityIdType;
    returnOriginalRequest?: boolean;
}

export interface QueryTransactionStatusResponseType extends BasicOnlineInvoiceResponseType {
    processingResults?: ProcessingResultListType;
}

export interface RelationalQueryParamsType {
    invoiceDelivery?: RelationQueryDateType[];
    paymentDate?: RelationQueryDateType[];
    invoiceNetAmount?: RelationQueryMonetaryType[];
    invoiceNetAmountHUF?: RelationQueryMonetaryType[];
    invoiceVatAmount?: RelationQueryMonetaryType[];
    invoiceVatAmountHUF?: RelationQueryMonetaryType[];
}

export interface RelationQueryDateType {
    queryOperator: QueryOperatorType;
    queryValue: InvoiceDateType;
}

export interface RelationQueryMonetaryType {
    queryOperator: QueryOperatorType;
    queryValue: MonetaryType;
}

export interface SoftwareType {
    softwareId: SoftwareIdType;
    softwareName: SimpleText50NotBlankType;
    softwareOperation: SoftwareOperationType;
    softwareMainVersion: SimpleText15NotBlankType;
    softwareDevName: SimpleText512NotBlankType;
    softwareDevContact: SimpleText200NotBlankType;
    softwareDevCountryCode?: CountryCodeType;
    softwareDevTaxNumber?: SimpleText50NotBlankType;
}

export interface TaxpayerAddressItemType {
    taxpayerAddressType: TaxpayerAddressTypeType;
    taxpayerAddress: DetailedAddressType;
}

export interface TaxpayerAddressListType {
    taxpayerAddressItem: TaxpayerAddressItemType[];
}

export interface TaxpayerDataType {
    taxpayerName: SimpleText512NotBlankType;
    taxpayerShortName?: SimpleText200NotBlankType;
    taxNumberDetail: TaxNumberType;
    incorporation: IncorporationType;
    vatGroupMembership?: TaxpayerIdType;
    taxpayerAddressList?: TaxpayerAddressListType;
}

export interface TokenExchangeResponseType extends BasicOnlineInvoiceResponseType {
    encodedExchangeToken: string; // base64Binary
    tokenValidityFrom: InvoiceTimestampType;
    tokenValidityTo: InvoiceTimestampType;
}

export interface TransactionListResultType {
    currentPage: ResponsePageType;
    availablePage: ResponsePageType;
    transaction?: TransactionType[];
}

export interface TransactionQueryParamsType {
    transactionId: EntityIdType;
    index?: InvoiceIndexType;
    invoiceOperation?: ManageInvoiceOperationType;
}

export interface TransactionResponseType extends BasicOnlineInvoiceResponseType {
    transactionId: EntityIdType;
}

export interface TransactionType {
    insDate: InvoiceTimestampType;
    insCusUser: LoginType;
    source: SourceType;
    transactionId: EntityIdType;
    requestStatus: RequestStatusType;
    technicalAnnulment: boolean;
    originalRequestVersion: OriginalRequestVersionType;
    itemCount: InvoiceIndexType;
}

/**
 * Element interfaces
 */
export interface GeneralErrorResponse extends GeneralErrorResponseType {}
export interface ManageAnnulmentRequest extends ManageAnnulmentRequestType {}
export interface ManageAnnulmentResponse extends TransactionResponseType {}
export interface ManageInvoiceRequest extends ManageInvoiceRequestType {}
export interface ManageInvoiceResponse extends TransactionResponseType {}
export interface QueryInvoiceChainDigestRequest extends QueryInvoiceChainDigestRequestType {}
export interface QueryInvoiceChainDigestResponse extends QueryInvoiceChainDigestResponseType {}
export interface QueryInvoiceCheckRequest extends QueryInvoiceDataRequestType {}
export interface QueryInvoiceCheckResponse extends QueryInvoiceCheckResponseType {}
export interface QueryInvoiceDataRequest extends QueryInvoiceDataRequestType {}
export interface QueryInvoiceDataResponse extends QueryInvoiceDataResponseType {}
export interface QueryInvoiceDigestRequest extends QueryInvoiceDigestRequestType {}
export interface QueryInvoiceDigestResponse extends QueryInvoiceDigestResponseType {}
export interface QueryTaxpayerRequest extends QueryTaxpayerRequestType {}
export interface QueryTaxpayerResponse extends QueryTaxpayerResponseType {}
export interface QueryTransactionListRequest extends QueryTransactionListRequestType {}
export interface QueryTransactionListResponse extends QueryTransactionListResponseType {}
export interface QueryTransactionStatusRequest extends QueryTransactionStatusRequestType {}
export interface QueryTransactionStatusResponse extends QueryTransactionStatusResponseType {}
export interface TokenExchangeRequest extends BasicOnlineInvoiceRequestType {}
export interface TokenExchangeResponse extends TokenExchangeResponseType {}