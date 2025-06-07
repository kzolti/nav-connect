// Request osztályok
export interface Software {
  softwareId: string;
  softwareName: string;
  softwareOperation: string;
  softwareMainVersion: string;
  softwareDevName: string;
  softwareDevContact: string;
  softwareDevCountryCode: string;
  softwareDevTaxNumber: string;
}

export interface User {
  login: string;
  passwordHash?: string;
  taxNumber: string;
  exchangeKey?: string;
}

export interface Header {
  requestId: string;
  timestamp: string;
  requestVersion: string;
}

export interface QueryTransactionListRequest {
  header: Header;
  user: User;
  software: Software;
  page: number;
  pageSize: number;
  transactionQueryParams?: TransactionQueryParams;
}

export interface DateTimeIntervalParam {
  dateTimeFrom: string; // ISO8601 dátum pl. "2024-01-01T00:00:00Z"
  dateTimeTo: string;   // ISO8601 dátum
}

export interface DateIntervalParam {
  dateFrom: string; // "2024-01-01"
  dateTo: string;   // "2024-01-31"
}

export interface TransactionQueryParams {
  transactionIdList?: string[]; // vagy { transactionId: string[] } ha XSD szerint az a struktúra
  insDate?: DateTimeIntervalParam;
  completionDate?: DateTimeIntervalParam;
  invoiceDeliveryDate?: DateIntervalParam;
  appearance?: string; // NAV API enum
  source?: string; // NAV API enum
  invoiceCategory?: string; // NAV API enum
  invoiceDirection?: string; // NAV API enum
  taxNumber?: string;
  groupMemberTaxNumber?: string;
}