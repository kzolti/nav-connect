import axios, { AxiosInstance } from "axios";
import { Buffer } from "node:buffer";
import type {
  AnnulmentOperationType,
  BasicResultType,
  DateTimeIntervalParamType,
  InvoiceChainQueryType,
  InvoiceDigestType,
  InvoiceDirectionType,
  InvoiceNumberQueryType,
  InvoiceOperationType,
  ManageAnnulmentResponse,
  ManageInvoiceResponse,
  QueryInvoiceChainDigestRequest,
  QueryInvoiceChainDigestResponse,
  QueryInvoiceCheckResponse,
  QueryInvoiceDataRequest,
  QueryInvoiceDataResponse,
  QueryInvoiceDigestRequest,
  QueryInvoiceDigestResponse,
  QueryTaxpayerRequest,
  QueryTaxpayerResponse,
  QueryTransactionListRequest,
  QueryTransactionListResponse,
  QueryTransactionStatusRequest,
  QueryTransactionStatusResponse,
  RequestStatusType,
  TokenExchangeRequest,
  TokenExchangeResponse,
} from "nav-osa-types";
import { ApiRequestType, XsdSchemaName, validateXml, XmlValidationError } from "nav-osa-core";
import {
  NavApiError,
  NavResponseXmlValidationError,
  NavXmlValidationError,
} from "./errors.js";
import { DEFAULT_HTTP_TIMEOUT_MS, validateNavApiConfig } from "./configValidator.js";
import type { NavApiConfig } from "./configValidator.js";
import { decodeExchangeToken } from "./crypto.js";
import {
  buildRequestOrThrow,
  handleAxiosError,
  parseApiResponse,
} from "./errorMapping.js";
import { RequestQueue } from "./rateLimiter.js";
import { assertRangeWithinLimit, buildDigestChunks, parseDateTimeInterval } from "./dateRange.js";
import {
  createBasicOnlineInvoiceRequest,
  createManageAnnulmentRequest,
  createManageInvoiceRequest,
} from "./requestBuilder.js";

const DEFAULT_THROTTLE_MS = 5000;

export interface NavApiResponse<T> {
  data: T;
  xmlValidationWarnings?: string[];
}

export interface DigestAllProgress {
  currentChunk: number;
  totalChunks: number;
  currentPage: number;
  availablePages: number;
  chunkFrom: string;
  chunkTo: string;
  digestsCollected: number;
}

export class NavConnect {
  private _config: NavApiConfig;
  private _baseUrl: string;
  private _client: AxiosInstance;
  private _validateResponse: boolean;
  private _httpTimeoutMs: number;
  private _queue: RequestQueue;

  static create(config: NavApiConfig): NavConnect {
    return new NavConnect(config);
  }

  constructor(config: NavApiConfig) {
    validateNavApiConfig(config);

    this._config = config;
    this._httpTimeoutMs = config.httpTimeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
    this._queue = new RequestQueue(config.minIntervalMs ?? 0);
    this._validateResponse = config.validateResponse ?? false;
    this._baseUrl = this._config.baseUrlOverride ?? (this._config.testSystem
      ? "https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3"
      : "https://api.onlineszamla.nav.gov.hu/invoiceService/v3");

    this._client = axios.create({
      baseURL: this._baseUrl,
      headers: {
        "Content-Type": "application/xml",
      },
      timeout: this._httpTimeoutMs,
    });

    this._client.interceptors.request.use((config) => {
      this._queue.markRequestSent();
      return config;
    });
  }

  get taxNumber(): string {
    return this._config.taxNumber;
  }

  get testSystem(): boolean {
    return this._config.testSystem;
  }

  get technicalUser(): string {
    return this._config.technicalUser.user;
  }

  /**
   * Builds the request XML, posts it through the rate limiter, validates
   * the response (unless disabled), parses it and checks the result
   * field. All public operations share this single error-transformation
   * chain.
   */
  private async sendRequest<TResp extends { result?: BasicResultType }>(
    endpoint: string,
    requestType: ApiRequestType,
    reqObj: object
  ): Promise<NavApiResponse<TResp>> {
    return this._queue.enqueue(async () => {
      const requestXml = await buildRequestOrThrow(requestType, reqObj);
      try {
        const response = await this._client.post(endpoint, requestXml);

        const xmlValidationWarnings = this._validateResponse
          ? await this.validateResponseXml(response.data, XsdSchemaName.InvoiceApi)
          : [];

        const rootName = `${requestType.replace(/Request$/, "")}Response`;
        const data = await parseApiResponse<TResp>(response.data, rootName);

        return {
          data,
          ...(xmlValidationWarnings.length > 0 && { xmlValidationWarnings }),
        };
      } catch (error: unknown) {
        if (error instanceof NavApiError) throw error;
        if (error instanceof XmlValidationError) {
          throw new NavResponseXmlValidationError(error.errors);
        }
        if (axios.isAxiosError(error)) await handleAxiosError(error, this._httpTimeoutMs);
        throw new NavApiError(`${endpoint} failed`, error);
      }
    });
  }

  async queryInvoiceDigest(params: {
    page: number;
    insDate: DateTimeIntervalParamType;
    invoiceDirectionType: InvoiceDirectionType;
  }): Promise<NavApiResponse<QueryInvoiceDigestResponse>> {
    const { from, to } = parseDateTimeInterval(params.insDate, "queryInvoiceDigest");
    assertRangeWithinLimit(from, to);

    const reqObj: QueryInvoiceDigestRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
      page: params.page,
      invoiceDirection: params.invoiceDirectionType,
      invoiceQueryParams: {
        mandatoryQueryParams: {
          insDate: params.insDate,
        },
      },
    };

    return this.sendRequest<QueryInvoiceDigestResponse>(
      "/queryInvoiceDigest",
      ApiRequestType.QueryInvoiceDigestRequest,
      reqObj
    );
  }

  async queryInvoiceDigestAll(params: {
    insDate: DateTimeIntervalParamType;
    invoiceDirectionType: InvoiceDirectionType;
    throttleMs?: number;
    onProgress?: (progress: DigestAllProgress) => void;
  }): Promise<InvoiceDigestType[]> {
    const throttle = params.throttleMs ?? DEFAULT_THROTTLE_MS;
    const { from, to } = parseDateTimeInterval(params.insDate, "queryInvoiceDigestAll");
    const chunks = buildDigestChunks(from, to);

    const allDigests: InvoiceDigestType[] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      let currentPage = 1;
      let availablePage = 1;

      do {
        if (ci > 0 || currentPage > 1) {
          await RequestQueue.sleep(throttle);
        }

        const response = await this.queryInvoiceDigest({
          page: currentPage,
          invoiceDirectionType: params.invoiceDirectionType,
          insDate: {
            dateTimeFrom: chunk.from,
            dateTimeTo: chunk.to,
          },
        });

        const digestResultRaw = response.data.invoiceDigestResult;
        const digestResult = Array.isArray(digestResultRaw) ? digestResultRaw[0] : digestResultRaw;

        if (digestResult?.invoiceDigest) {
          allDigests.push(...digestResult.invoiceDigest);
        }

        availablePage = digestResult?.availablePage ? parseInt(String(digestResult.availablePage), 10) : 0;

        if (params.onProgress) {
          params.onProgress({
            currentChunk: ci + 1,
            totalChunks: chunks.length,
            currentPage,
            availablePages: availablePage,
            chunkFrom: chunk.from,
            chunkTo: chunk.to,
            digestsCollected: allDigests.length,
          });
        }

        currentPage++;
      } while (currentPage <= availablePage);
    }

    return allDigests;
  }

  private buildInvoiceNumberQueryRequest(params: InvoiceNumberQueryType): QueryInvoiceDataRequest {
    return {
      ...createBasicOnlineInvoiceRequest(this._config),
      invoiceNumberQuery: {
        invoiceNumber: params.invoiceNumber,
        invoiceDirection: params.invoiceDirection,
        supplierTaxNumber: params.supplierTaxNumber,
      },
    };
  }

  async queryInvoiceData(params: InvoiceNumberQueryType): Promise<NavApiResponse<QueryInvoiceDataResponse>> {
    return this.sendRequest<QueryInvoiceDataResponse>(
      "/queryInvoiceData",
      ApiRequestType.QueryInvoiceDataRequest,
      this.buildInvoiceNumberQueryRequest(params)
    );
  }

  async queryInvoiceCheck(params: InvoiceNumberQueryType): Promise<NavApiResponse<QueryInvoiceCheckResponse>> {
    return this.sendRequest<QueryInvoiceCheckResponse>(
      "/queryInvoiceCheck",
      ApiRequestType.QueryInvoiceCheckRequest,
      this.buildInvoiceNumberQueryRequest(params)
    );
  }

  private async validateResponseXml(xml: string, schemaType: XsdSchemaName): Promise<string[]> {
    const result = await validateXml(xml, schemaType);
    if (result.valid) return [];
    return result.errors.map((e: string) => `[Response XML validation] ${e}`);
  }

  private validateSequentialIndices(items: { index: number }[], label: string): void {
    if (!items || items.length === 0) {
      throw new NavApiError(`${label} must contain at least one item`);
    }

    for (let i = 0; i < items.length; i++) {
      const op = items[i];
      if (typeof op.index !== "number" || !Number.isInteger(op.index) || op.index < 1 || op.index > 100) {
        throw new NavApiError(
          `${label}[${i}].index must be an integer between 1 and 100, got ${JSON.stringify(op.index)}`
        );
      }
      if (i > 0 && op.index !== items[i - 1].index + 1) {
        throw new NavApiError(
          `${label} indices must be strictly increasing without gaps. ` +
          `Expected ${items[i - 1].index + 1}, got ${op.index}`
        );
      }
    }
  }

  async tokenExchange(): Promise<{
    token: string;
    tokenValidityFrom: string;
    tokenValidityTo: string;
    serverTimestamp?: string;
  }> {
    const reqObj: TokenExchangeRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
    };

    const { data } = await this.sendRequest<TokenExchangeResponse>(
      "/tokenExchange",
      ApiRequestType.TokenExchangeRequest,
      reqObj
    );

    if (!data.encodedExchangeToken) {
      throw new NavApiError("TokenExchangeResponse is missing encodedExchangeToken");
    }

    return {
      token: decodeExchangeToken(data.encodedExchangeToken, this._config.technicalUser.exchangeKey),
      tokenValidityFrom: data.tokenValidityFrom,
      tokenValidityTo: data.tokenValidityTo,
      serverTimestamp: data.header?.timestamp,
    };
  }

  async manageInvoice(params: {
    invoiceOperation: InvoiceOperationType[];
    compressedContent: boolean;
    skipXmlValidation: boolean;
    exchangeToken?: string;
  }): Promise<NavApiResponse<ManageInvoiceResponse>> {
    const { invoiceOperation, compressedContent, skipXmlValidation, exchangeToken } = params;

    this.validateSequentialIndices(invoiceOperation, "invoiceOperation");

    if (compressedContent && !skipXmlValidation) {
      throw new NavApiError(
        "Compressed content cannot be validated. Decompress the invoice data before submission, or set skipXmlValidation to true if you are certain the compressed XML is valid."
      );
    }

    if (!skipXmlValidation) {
      for (const op of invoiceOperation) {
        const xml = Buffer.from(op.invoiceData, "base64").toString("utf8");
        const result = await validateXml(xml, XsdSchemaName.Data);
        if (!result.valid) {
          throw new NavXmlValidationError(
            `invoiceData at index ${op.index} (ManageInvoiceRequest)`,
            result.errors
          );
        }
      }
    }

    const effectiveExchangeToken = exchangeToken ?? (await this.tokenExchange()).token;
    const reqObj = createManageInvoiceRequest(this._config, {
      invoiceOperation,
      compressedContent,
      exchangeToken: effectiveExchangeToken,
    });

    return this.sendRequest<ManageInvoiceResponse>(
      "/manageInvoice",
      ApiRequestType.ManageInvoiceRequest,
      reqObj
    );
  }

  async manageAnnulment(params: {
    annulmentOperations: AnnulmentOperationType[];
    exchangeToken?: string;
  }): Promise<NavApiResponse<ManageAnnulmentResponse>> {
    const { annulmentOperations, exchangeToken } = params;

    this.validateSequentialIndices(annulmentOperations, "annulmentOperations");

    const effectiveExchangeToken = exchangeToken ?? (await this.tokenExchange()).token;
    const reqObj = createManageAnnulmentRequest(this._config, {
      annulmentOperations,
      exchangeToken: effectiveExchangeToken,
    });

    return this.sendRequest<ManageAnnulmentResponse>(
      "/manageAnnulment",
      ApiRequestType.ManageAnnulmentRequest,
      reqObj
    );
  }

  async queryTransactionStatus(params: {
    transactionId: string;
    returnOriginalRequest?: boolean;
  }): Promise<NavApiResponse<QueryTransactionStatusResponse>> {
    const reqObj: QueryTransactionStatusRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
      transactionId: params.transactionId,
      ...(params.returnOriginalRequest !== undefined && { returnOriginalRequest: params.returnOriginalRequest }),
    };

    return this.sendRequest<QueryTransactionStatusResponse>(
      "/queryTransactionStatus",
      ApiRequestType.QueryTransactionStatusRequest,
      reqObj
    );
  }

  async queryTransactionList(params: {
    page: number;
    insDate: DateTimeIntervalParamType;
    requestStatus?: RequestStatusType;
  }): Promise<NavApiResponse<QueryTransactionListResponse>> {
    const reqObj: QueryTransactionListRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
      page: params.page,
      insDate: params.insDate,
      ...(params.requestStatus && { requestStatus: params.requestStatus }),
    };

    return this.sendRequest<QueryTransactionListResponse>(
      "/queryTransactionList",
      ApiRequestType.QueryTransactionListRequest,
      reqObj
    );
  }

  async queryTaxpayer(params: {
    taxNumber: string;
  }): Promise<NavApiResponse<QueryTaxpayerResponse>> {
    const reqObj: QueryTaxpayerRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
      taxNumber: params.taxNumber,
    };

    return this.sendRequest<QueryTaxpayerResponse>(
      "/queryTaxpayer",
      ApiRequestType.QueryTaxpayerRequest,
      reqObj
    );
  }

  async queryInvoiceChainDigest(params: {
    page: number;
    invoiceChainQuery: InvoiceChainQueryType;
  }): Promise<NavApiResponse<QueryInvoiceChainDigestResponse>> {
    const reqObj: QueryInvoiceChainDigestRequest = {
      ...createBasicOnlineInvoiceRequest(this._config),
      page: params.page,
      invoiceChainQuery: params.invoiceChainQuery,
    };

    return this.sendRequest<QueryInvoiceChainDigestResponse>(
      "/queryInvoiceChainDigest",
      ApiRequestType.QueryInvoiceChainDigestRequest,
      reqObj
    );
  }
}