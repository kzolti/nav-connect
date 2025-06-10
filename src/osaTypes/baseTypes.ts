/**
 * This file contains TypeScript interfaces generated from the Hungarian Online Invoice System XML schema
 * Original schema: http://schemas.nav.gov.hu/OSA/3.0/base
 */

import {
    AtomicStringType15,
    CountryCodeType,
    CountyCodeType,
    PostalCodeType,
    SimpleText50NotBlankType,
    SimpleText255NotBlankType,
    TaxpayerIdType,
    VatCodeType,
    GenericDecimalType
} from './commonTypes'; // Import types from common.xsd

/**
 * Invoice appearance types
 */
type InvoiceAppearanceType = 'PAPER' | 'ELECTRONIC' | 'EDI' | 'UNKNOWN';

/**
 * Invoice category types
 */
type InvoiceCategoryType = 'NORMAL' | 'SIMPLIFIED' | 'AGGREGATE';

/**
 * Invoice date type (YYYY-MM-DD, min 2010-01-01)
 */
type InvoiceDateType = string; // Pattern: \d{4}-\d{2}-\d{2}

/**
 * Invoice index type (1-100)
 */
type InvoiceIndexType = number; // Integer between 1-100

/**
 * Invoice timestamp type (min 2010-01-01T00:00:00Z)
 */
type InvoiceTimestampType = string; // Pattern: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1,3})?Z

/**
 * Unbounded invoice index type (min 1)
 */
type InvoiceUnboundedIndexType = number; // Integer >= 1

/**
 * Line number type (1-20 digits)
 */
type LineNumberType = number; // Positive integer with max 20 digits

/**
 * Monetary type (decimal with 2 fraction digits, max 18 digits total)
 */
type MonetaryType = number; // Decimal with 2 fraction digits, max 18 digits total

/**
 * Payment method types
 */
type PaymentMethodType = 'TRANSFER' | 'CASH' | 'CARD' | 'VOUCHER' | 'OTHER';

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
    // Simple types
    InvoiceAppearanceType,
    InvoiceCategoryType,
    InvoiceDateType,
    InvoiceIndexType,
    InvoiceTimestampType,
    InvoiceUnboundedIndexType,
    LineNumberType,
    MonetaryType,
    PaymentMethodType,
    
    // Complex types
    AddressType,
    DetailedAddressType,
    SimpleAddressType,
    TaxNumberType
};