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
  page: number;
  pageSize: number;
  software: Software;
}