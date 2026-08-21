import type { AxiosError } from "axios";
import { ApiRequestType, XsdSchemaName, buildApiRequestXml, xmlParser, XmlValidationError } from "nav-osa-core";
import type { BasicResultType, GeneralErrorResponseType, TechnicalValidationResultType } from "nav-osa-types";
import {
  NavApiError,
  NavApiHttpError,
  NavApiResponseError,
  NavApiTimeoutError,
  NavXmlValidationError,
} from "./errors.js";

const TIMEOUT_ERROR_CODES: ReadonlySet<string> = new Set(["ECONNABORTED", "ETIMEDOUT"]);

function toNavApiResponseError(
  result: BasicResultType,
  httpStatus?: number,
  technicalValidationMessages?: TechnicalValidationResultType[]
): NavApiResponseError {
  return new NavApiResponseError({
    funcCode: result.funcCode,
    errorCode: result.errorCode,
    message: result.message,
    httpStatus,
    technicalValidationMessages,
  });
}

function checkResponseResult(result?: BasicResultType): void {
  if (!result) return;
  if (result.funcCode === "ERROR") {
    throw toNavApiResponseError(result);
  }
}

function throwIfGeneralError(parsed: Record<string, unknown>, httpStatus: number): void {
  const generalError = parsed.GeneralErrorResponse as GeneralErrorResponseType | undefined;
  if (generalError?.result) {
    throw toNavApiResponseError(generalError.result, httpStatus, generalError.technicalValidationMessages);
  }
}

export async function handleAxiosError(error: AxiosError, timeoutMs: number): Promise<never> {
  if (error.code !== undefined && TIMEOUT_ERROR_CODES.has(error.code)) {
    throw new NavApiTimeoutError(timeoutMs);
  }

  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const rawBody = typeof error.response?.data === "string" ? error.response.data : undefined;

  if (rawBody) {
    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = await xmlParser<Record<string, unknown>>(
        rawBody,
        XsdSchemaName.InvoiceApi,
        { validate: false }
      );
    } catch (parseErr: unknown) {
      if (parseErr instanceof XmlValidationError) {
        throw new NavApiHttpError(status ?? 0, statusText, rawBody);
      }
      throw new NavApiHttpError(status ?? 0, statusText, rawBody, parseErr);
    }

    throwIfGeneralError(parsed, status ?? 0);
  }

  throw new NavApiHttpError(status ?? 0, statusText, rawBody);
}

export async function parseApiResponse<TResp extends { result?: BasicResultType }>(
  responseXml: string,
  rootName: string
): Promise<TResp> {
  const parsed = await xmlParser<Record<string, unknown>>(responseXml, XsdSchemaName.InvoiceApi, {
    validate: false,
  });

  // Nav always answers with the "<RequestType minus Request>Response"
  // root element; anything else means we cannot interpret the reply.
  // Functional errors arrive as GeneralErrorResponse with HTTP 200, so
  // that envelope must be checked before giving up on the root element.
  const data = parsed[rootName] as TResp | undefined;
  if (!data) {
    throwIfGeneralError(parsed, 200);
    throw new NavApiError(`Unexpected NAV response: missing '${rootName}' root element`);
  }

  checkResponseResult(data.result);
  return data;
}

export async function buildRequestOrThrow<T extends object>(requestType: ApiRequestType, reqObj: T): Promise<string> {
  try {
    return await buildApiRequestXml(requestType, reqObj);
  } catch (error: unknown) {
    if (error instanceof XmlValidationError) {
      throw new NavXmlValidationError(requestType, error.errors);
    }
    throw error;
  }
}