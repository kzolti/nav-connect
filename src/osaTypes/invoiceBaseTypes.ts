/**
 * This file contains TypeScript interfaces generated from the NAV OSA InvoiceBase XML schema
 * Original schema: http://schemas.nav.gov.hu/OSA/3.0/base
 */

import {
  AtomicStringType15,
  GenericDecimalType,
  SimpleText50NotBlankType,
  SimpleText255NotBlankType,
  CountryCodeType,
  PostalCodeType,
  TaxpayerIdType,
  VatCodeType,
  CountyCodeType
} from './commonTypes';

/**
 * Invoice appearance types
 */
type InvoiceAppearanceType = "PAPER" | "ELECTRONIC" | "EDI" | "UNKNOWN";

/**
 * Invoice category types
 */
type InvoiceCategoryType = "NORMAL" | "SIMPLIFIED" | "AGGREGATE";

/**
 * Invoice date type (YYYY-MM-DD, min 2010-01-01)
 */
type InvoiceDateType = string;

/**
 * Invoice index type (1-100)
 */
type InvoiceIndexType = number;

/**
 * Invoice timestamp type (YYYY-MM-DDTHH:MM:SS[.SSS]Z, min 2010-01-01T00:00:00Z)
 */
type InvoiceTimestampType = string;

/**
 * Unbounded invoice index type (≥1)
 */
type InvoiceUnboundedIndexType = number;

/**
 * Line number type (≥1, max 20 digits)
 */
type LineNumberType = number;

/**
 * Monetary type (18 digits max, 2 decimal places)
 */
type MonetaryType = number;

/**
 * Payment method types
 */
type PaymentMethodType = "TRANSFER" | "CASH" | "CARD" | "VOUCHER" | "OTHER";

/**
 * Address types
 */
interface AddressType {
  simpleAddress?: SimpleAddressType;
  detailedAddress?: DetailedAddressType;
}

interface DetailedAddressType {
  countryCode: CountryCodeType;
  region?: SimpleText50NotBlankType;
  postalCode: PostalCodeType;
  city: SimpleText255NotBlankType;
  streetName: SimpleText255NotBlankType;
  publicPlaceCategory: SimpleText50NotBlankType;
  number?: SimpleText50NotBlankType;
  building?: SimpleText50NotBlankType;
  staircase?: SimpleText50NotBlankType;
  floor?: SimpleText50NotBlankType;
  door?: SimpleText50NotBlankType;
  lotNumber?: SimpleText50NotBlankType;
}

interface SimpleAddressType {
  countryCode: CountryCodeType;
  region?: SimpleText50NotBlankType;
  postalCode: PostalCodeType;
  city: SimpleText255NotBlankType;
  additionalAddressDetail: SimpleText255NotBlankType;
}

/**
 * Tax number type
 */
interface TaxNumberType {
  taxpayerId: TaxpayerIdType;
  vatCode?: VatCodeType;
  countyCode?: CountyCodeType;
}

export {
  InvoiceAppearanceType,
  InvoiceCategoryType,
  InvoiceDateType,
  InvoiceIndexType,
  InvoiceTimestampType,
  InvoiceUnboundedIndexType,
  LineNumberType,
  MonetaryType,
  PaymentMethodType,
  AddressType,
  DetailedAddressType,
  SimpleAddressType,
  TaxNumberType
};