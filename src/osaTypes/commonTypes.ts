/**
 * This file contains TypeScript interfaces generated from the NAV NTCA Common XML schema
 * Original schema: http://schemas.nav.gov.hu/NTCA/1.0/common
 */

/**
 * Atomic string types
 */
type AtomicStringType100 = string; // 1-100 characters
type AtomicStringType1024 = string; // 1-1024 characters
type AtomicStringType128 = string; // 1-128 characters
type AtomicStringType15 = string; // 1-15 characters
type AtomicStringType16 = string; // 1-16 characters
type AtomicStringType2 = string; // 1-2 characters
type AtomicStringType200 = string; // 1-200 characters
type AtomicStringType2048 = string; // 1-2048 characters
type AtomicStringType255 = string; // 1-255 characters
type AtomicStringType256 = string; // 1-256 characters
type AtomicStringType32 = string; // 1-32 characters
type AtomicStringType4 = string; // 1-4 characters
type AtomicStringType4000 = string; // 1-4000 characters
type AtomicStringType50 = string; // 1-50 characters
type AtomicStringType512 = string; // 1-512 characters
type AtomicStringType64 = string; // 1-64 characters
type AtomicStringType8 = string; // 1-8 characters

/**
 * Generic types
 */
type GenericDateType = string; // UTC date in format "YYYY-MM-DDZ"
type GenericDecimalType = number; // Generic decimal value
type GenericTimestampType = string; // UTC timestamp in format "YYYY-MM-DDTHH:MM:SS[.SSS]Z"

/**
 * Special string types with patterns
 */
type SHA256Type = string; // 64-character hexadecimal string
type SHA512Type = string; // 128-character hexadecimal string
type SimpleText100NotBlankType = string; // 1-100 chars, not just whitespace
type SimpleText1024NotBlankType = string; // 1-1024 chars, not just whitespace
type SimpleText15NotBlankType = string; // 1-15 chars, not just whitespace
type SimpleText200NotBlankType = string; // 1-200 chars, not just whitespace
type SimpleText255NotBlankType = string; // 1-255 chars, not just whitespace
type SimpleText50NotBlankType = string; // 1-50 chars, not just whitespace
type SimpleText512NotBlankType = string; // 1-512 chars, not just whitespace

/**
 * Business catalog elements
 */
type BankAccountNumberType = string; // 15-34 chars, specific patterns for bank accounts
type CommunityVatNumberType = string; // 4-15 chars, starts with 2 letters
type CountryCodeType = string; // 2-letter ISO 3166 alpha-2 country code
type CountyCodeType = string; // 2-digit county code
type CurrencyType = string; // 3-letter ISO 4217 currency code
type PlateNumberType = string; // 2-30 chars, letters and numbers
type PostalCodeType = string; // 3-10 chars, alphanumeric with possible spaces/dashes
type TaxpayerIdType = string; // 8-digit tax number
type VatCodeType = "1" | "2" | "3" | "4" | "5"; // VAT code (1-5)

/**
 * Common API types
 */
type BusinessResultCodeType = "ERROR" | "WARN" | "INFO";
type EntityIdType = string; // 1-30 chars, alphanumeric with + and _
type FunctionCodeType = "OK" | "ERROR";
type LoginType = string; // 6-15 alphanumeric chars
type RequestPageType = number; // Positive integer (>=1)
type ResponsePageType = number; // Non-negative integer (>=0)
type TechnicalResultCodeType = "CRITICAL" | "ERROR";

/**
 * Complex types
 */

// interface BasicHeaderType {
//   $: {
//     name: "xmlns:common";
//     value: "http://schemas.nav.gov.hu/NTCA/1.0/common";
//     prefix: "xmlns";
//     local: "common";
//     uri: "http://www.w3.org/2000/xmlns/";
//   };
//   requestId: EntityIdType;
//   timestamp: GenericTimestampType;
//   requestVersion: "3.0";
//   headerVersion: "1.0";
// }

interface BasicHeaderType {
  "common:requestId": EntityIdType;
  "common:timestamp": GenericTimestampType;
  "common:requestVersion": "3.0";
  "common:headerVersion": "1.0";
}

interface BasicRequestType {
  "@": {
    xmlns: "http://schemas.nav.gov.hu/OSA/3.0/api";
    "xmlns:common": "http://schemas.nav.gov.hu/NTCA/1.0/common";
  };
  "common:header": BasicHeaderType;
  "common:user": UserHeaderType;
}

interface BasicResponseType {
  header: BasicHeaderType;
  result: BasicResultType;
}

interface BasicResultType {
  funcCode: FunctionCodeType;
  errorCode?: SimpleText50NotBlankType;
  message?: SimpleText1024NotBlankType;
  notifications?: NotificationsType;
}

interface CryptoType {
  value: SimpleText512NotBlankType;
  cryptoType: "SHA-512" | "SHA3-512";
}

interface GeneralErrorHeaderResponseType extends BasicResponseType {
  // Extends BasicResponseType with no additional fields
}

interface NotificationsType {
  notification: NotificationType[];
}

interface NotificationType {
  notificationCode: SimpleText100NotBlankType;
  notificationText: SimpleText1024NotBlankType;
}

interface TechnicalValidationResultType {
  validationResultCode: TechnicalResultCodeType;
  validationErrorCode?: SimpleText100NotBlankType;
  message?: SimpleText1024NotBlankType;
}

interface UserHeaderType {
  "common:login": LoginType;
  "common:passwordHash": {
    "@": { cryptoType: "SHA-512" }; // attribútum!
    "#": SimpleText512NotBlankType; // érték!
  };
  "common:taxNumber": TaxpayerIdType;
  "common:requestSignature": {
    "@": { cryptoType: "SHA3-512" }; // attribútum!
    "#": SimpleText512NotBlankType; // érték!
  };
}

/**
 * Element types
 */
interface GeneralErrorHeaderResponse extends GeneralErrorHeaderResponseType {
  // Extends GeneralErrorHeaderResponseType with no additional fields
}

interface GeneralExceptionResponse extends BasicResultType {
  // Extends BasicResultType with no additional fields
}

export {
  // Atomic types
  AtomicStringType100,
  AtomicStringType1024,
  AtomicStringType128,
  AtomicStringType15,
  AtomicStringType16,
  AtomicStringType2,
  AtomicStringType200,
  AtomicStringType2048,
  AtomicStringType255,
  AtomicStringType256,
  AtomicStringType32,
  AtomicStringType4,
  AtomicStringType4000,
  AtomicStringType50,
  AtomicStringType512,
  AtomicStringType64,
  AtomicStringType8,

  // Generic types
  GenericDateType,
  GenericDecimalType,
  GenericTimestampType,

  // Special string types
  SHA256Type,
  SHA512Type,
  SimpleText100NotBlankType,
  SimpleText1024NotBlankType,
  SimpleText15NotBlankType,
  SimpleText200NotBlankType,
  SimpleText255NotBlankType,
  SimpleText50NotBlankType,
  SimpleText512NotBlankType,

  // Business catalog elements
  BankAccountNumberType,
  CommunityVatNumberType,
  CountryCodeType,
  CountyCodeType,
  CurrencyType,
  PlateNumberType,
  PostalCodeType,
  TaxpayerIdType,
  VatCodeType,

  // Common API types
  BusinessResultCodeType,
  EntityIdType,
  FunctionCodeType,
  LoginType,
  RequestPageType,
  ResponsePageType,
  TechnicalResultCodeType,

  // Complex types
  BasicHeaderType,
  BasicRequestType,
  BasicResponseType,
  BasicResultType,
  CryptoType,
  GeneralErrorHeaderResponseType,
  NotificationsType,
  NotificationType,
  TechnicalValidationResultType,
  UserHeaderType,

  // Element types
  GeneralErrorHeaderResponse,
  GeneralExceptionResponse,
};
