/**
 * Hungarian taxpayer trunk (adószám-törzs) local validation.
 *
 * Works strictly on the 8-digit trunk (`TaxpayerIdType`) — the only shape
 * `queryTaxpayer` accepts. The trunk's last digit is a check digit (CDV):
 * weighted sum of the first 7 digits with multipliers [9, 7, 3, 1, 9, 7, 3],
 * check = (10 - (sum % 10)) % 10.
 *
 * This is a pre-flight guard so obviously invalid numbers never reach the
 * NAV /queryTaxpayer endpoint. NAV lookup remains the source of truth for
 * whether a number actually exists.
 */

import type { TaxpayerIdType } from "nav-osa-types";

const TRUNK_FORMAT_REGEX = /^\d{8}$/;

const CHECK_MULTIPLIERS: readonly number[] = [9, 7, 3, 1, 9, 7, 3];

export type HuTaxNumberErrorCode =
  | "TAX_NUMBER_INVALID_FORMAT"
  | "TAX_NUMBER_INVALID_CHECK_DIGIT";

export interface HuTaxNumberValidationResult {
  valid: boolean;
  errorCode?: HuTaxNumberErrorCode;
}

export function validateHuTaxNumber(taxNumber: string): HuTaxNumberValidationResult {
  if (!TRUNK_FORMAT_REGEX.test(taxNumber)) {
    return { valid: false, errorCode: "TAX_NUMBER_INVALID_FORMAT" };
  }

  const taxpayerId: TaxpayerIdType = taxNumber;

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += Number.parseInt(taxpayerId[i] ?? "", 10) * (CHECK_MULTIPLIERS[i] ?? 0);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  const actualCheck = Number.parseInt(taxpayerId[7] ?? "", 10);

  if (checkDigit !== actualCheck) {
    return { valid: false, errorCode: "TAX_NUMBER_INVALID_CHECK_DIGIT" };
  }

  return { valid: true };
}
