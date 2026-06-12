import { FunctionCodeType, TechnicalValidationResultType } from "nav-osa-types";
import { BusinessValidationResultType } from "nav-osa-types";

/**
 * Base error class for all NAV API errors.
 */
export class NavApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "NavApiError";
  }
}

/**
 * Thrown when the NAV API returns an HTTP error with a parseable XML error body.
 * Contains the structured funcCode, errorCode, message, and optional validation messages.
 */
export class NavApiResponseError extends NavApiError {
  public readonly funcCode: FunctionCodeType;
  public readonly errorCode?: string;
  public readonly httpStatus?: number;
  public readonly technicalValidationMessages?: TechnicalValidationResultType[];
  public readonly businessValidationMessages?: BusinessValidationResultType[];

  constructor(params: {
    funcCode: FunctionCodeType;
    errorCode?: string;
    message?: string;
    httpStatus?: number;
    technicalValidationMessages?: TechnicalValidationResultType[];
    businessValidationMessages?: BusinessValidationResultType[];
  }) {
    const msg = [
      `NAV API error [${params.funcCode}]`,
      params.errorCode ? `code: ${params.errorCode}` : null,
      params.message ?? null,
    ]
      .filter(Boolean)
      .join(" - ");

    super(msg);
    this.name = "NavApiResponseError";
    this.funcCode = params.funcCode;
    this.errorCode = params.errorCode;
    this.httpStatus = params.httpStatus;
    this.technicalValidationMessages = params.technicalValidationMessages;
    this.businessValidationMessages = params.businessValidationMessages;
  }
}

/**
 * Thrown when the NAV API returns an HTTP error but the body cannot be parsed.
 */
export class NavApiHttpError extends NavApiError {
  public readonly httpStatus: number;
  public readonly statusText?: string;
  public readonly responseBody?: string;

  constructor(httpStatus: number, statusText?: string, responseBody?: string) {
    super(`NAV API HTTP error ${httpStatus}${statusText ? ` ${statusText}` : ""}`);
    this.name = "NavApiHttpError";
    this.httpStatus = httpStatus;
    this.statusText = statusText;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown when the generated XML fails XSD validation before sending.
 */
export class NavXmlValidationError extends NavApiError {
  public readonly requestType: string;
  public readonly validationErrors: string[];

  constructor(requestType: string, validationErrors: string[]) {
    super(`XML validation failed for ${requestType}:\n${validationErrors.join("\n")}`);
    this.name = "NavXmlValidationError";
    this.requestType = requestType;
    this.validationErrors = validationErrors;
  }
}

/**
 * Thrown when the NAV API response XML fails XSD validation during parsing.
 * Wraps the XmlValidationError from nav-osa-types.
 */
export class NavResponseXmlValidationError extends NavApiError {
  public readonly validationErrors: string[];
  public readonly xsdPath?: string;

  constructor(validationErrors: string[], xsdPath?: string) {
    super(`NAV API response XML validation failed${xsdPath ? ` against ${xsdPath}` : ""}:\n${validationErrors.join("\n")}`);
    this.name = "NavResponseXmlValidationError";
    this.validationErrors = validationErrors;
    this.xsdPath = xsdPath;
  }
}

/**
 * Thrown when the NavApiConfig is invalid.
 */
export class NavConfigError extends NavApiError {
  public readonly validationErrors: string[];

  constructor(validationErrors: string[]) {
    super(`NavApiConfig validation failed:\n${validationErrors.join("\n")}`);
    this.name = "NavConfigError";
    this.validationErrors = validationErrors;
  }
}

/**
 * Thrown when the requested date range exceeds the NAV API limit (35 days).
 */
export class NavDateRangeError extends NavApiError {
  public readonly requestedDays: number;
  public readonly maxDays: number;

  constructor(requestedDays: number, maxDays: number = 35) {
    super(
      `Date range too large: ${requestedDays} days requested, maximum is ${maxDays} days. ` +
      `Use queryInvoiceDigestAll() to automatically split large date ranges into ${maxDays}-day chunks.`
    );
    this.name = "NavDateRangeError";
    this.requestedDays = requestedDays;
    this.maxDays = maxDays;
  }
}

