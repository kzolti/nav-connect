import path, { dirname } from "path";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";
import type { XsdValidator } from "libxml2-wasm";
let libxml2_wasm_module: any = null;
import { XMLBuilder } from "fast-xml-parser";
import { existsSync, readdirSync, readFileSync } from "fs";
import {
  BasicOnlineInvoiceRequestType,
  DateTimeIntervalParamType,
  GeneralErrorResponseType,
  InvoiceDigestType,
  InvoiceDirectionType,
  InvoiceNumberQueryType,
  QueryInvoiceDataRequest,
  QueryInvoiceDataResponse,
  QueryInvoiceDigestRequest,
  QueryInvoiceDigestResponse,
  SoftwareType,
} from "./osaTypes/invoiceApiTypes";
import { BasicRequestType, BasicResultType, EntityIdType } from "./osaTypes/commonTypes";
import { xmlParser } from "./xmlParser";
import { NavApiError, NavApiResponseError, NavApiHttpError, NavXmlValidationError, NavConfigError, NavDateRangeError } from "./errors";

/** Maximum date range in days allowed by the NAV API for queryInvoiceDigest */
const MAX_DIGEST_RANGE_DAYS = 35;

/** Default delay in milliseconds between API calls in queryInvoiceDigestAll */
const DEFAULT_THROTTLE_MS = 5000;

interface TechnicalUser {
  user: string;
  password: string;
  signatureKey: string;
  exchangeKey: string;
}

export interface NavApiConfig {
  testSystem: boolean;
  taxNumber: string;
  technicalUser: TechnicalUser;
  software: SoftwareType;
}

export interface NavApiResponse<T> {
  data: T;
  xmlValidationWarnings?: string[];
}

/**
 * Progress information emitted during queryInvoiceDigestAll.
 */
export interface DigestAllProgress {
  /** Current date chunk index (1-based) */
  currentChunk: number;
  /** Total number of date chunks */
  totalChunks: number;
  /** Current page within the chunk (1-based) */
  currentPage: number;
  /** Total available pages in the current chunk */
  availablePages: number;
  /** Start of the current chunk's date range */
  chunkFrom: string;
  /** End of the current chunk's date range */
  chunkTo: string;
  /** Number of digests collected so far */
  digestsCollected: number;
}
export enum XsdSchema {
  InvoiceBase = "invoiceBase",
  InvoiceApi = "invoiceApi",
  Common = "common",
  Data = "data",
}

interface XsdDocuments extends Map<XsdSchema, XsdValidator> {
  set(key: XsdSchema, value: XsdValidator): this;
  get(key: XsdSchema): XsdValidator | undefined;
}

export { xmlParser } from "./xmlParser";
export { NavApiError, NavApiResponseError, NavApiHttpError, NavXmlValidationError, NavConfigError, NavDateRangeError } from "./errors";

class NavConnect {
  private _config: NavApiConfig;
  private _schemaDir: string;
  private _baseUrl: string;
  private _builder: XMLBuilder;
  private xsdDocs: XsdDocuments;
  private _client: AxiosInstance;

  static async create(config: NavApiConfig): Promise<NavConnect> {
    if (!libxml2_wasm_module) {
      libxml2_wasm_module = await new Function('return import("libxml2-wasm")')();
      
      // Register Node.js filesystem provider to allow libxml2 to resolve XSD imports from the host FS
      try {
        const { xmlRegisterFsInputProviders } = await new Function('return import("libxml2-wasm/lib/nodejs.mjs")')();
        xmlRegisterFsInputProviders();
      } catch (e) {
        // Fallback for different package structures or environments
        console.warn('Note: Could not register libxml2-wasm Node.js FS provider. XSD imports might fail if not absolute.', e);
      }
    }
    return new NavConnect(config);
  }

  constructor(config: NavApiConfig) {
    if (!libxml2_wasm_module) {
      throw new Error("NavConnect must be instantiated using await NavConnect.create(config)");
    }
    // Validate configuration
    this.validateConfig(config);
    
    this._config = config;
    this._baseUrl = this._config.testSystem
      ? "https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3"
      : "https://api.onlineszamla.nav.gov.hu/invoiceService/v3";

    this._client = axios.create({
      baseURL: this._baseUrl,
      headers: {
        "Content-Type": "application/xml",
      },
    });

    this._schemaDir = path.resolve(__dirname, "..", "OSA", "xsd");
    this.xsdDocs = new Map();

    // Load XSD schemas with detailed error handling
    this.loadXsdSchemas();

    const xmlBuilderOptions = {
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      ignoreAttributes: false,
      format: true,
      indentBy: "\t",
      suppressEmptyNode: false,
    };
    this._builder = new XMLBuilder(xmlBuilderOptions);
  }

  private validateConfig(config: NavApiConfig): void {
    const errors: string[] = [];

    // Validate taxNumber
    if (!config.taxNumber) {
      errors.push("taxNumber is required");
    } else if (!/^\d{8}$/.test(config.taxNumber)) {
      errors.push("taxNumber must be exactly 8 digits");
    }

    // Validate technicalUser
    if (!config.technicalUser) {
      errors.push("technicalUser is required");
    } else {
      if (!config.technicalUser.user || config.technicalUser.user.trim() === "") {
        errors.push("technicalUser.user is required");
      }
      if (!config.technicalUser.password || config.technicalUser.password.trim() === "") {
        errors.push("technicalUser.password is required");
      }
      if (!config.technicalUser.signatureKey || config.technicalUser.signatureKey.trim() === "") {
        errors.push("technicalUser.signatureKey is required");
      }
      if (!config.technicalUser.exchangeKey || config.technicalUser.exchangeKey.trim() === "") {
        errors.push("technicalUser.exchangeKey is required");
      }
    }

    // Validate software
    if (!config.software) {
      errors.push("software is required");
    } else {
      if (!config.software.softwareId) {
        errors.push("software.softwareId is required");
      } else if (!/^[0-9A-Z\-]{18}$/.test(config.software.softwareId)) {
        errors.push("software.softwareId must be exactly 18 characters matching pattern [0-9A-Z\\-]");
      }

      if (!config.software.softwareName || config.software.softwareName.trim() === "") {
        errors.push("software.softwareName is required (max 50 characters)");
      } else if (config.software.softwareName.length > 50) {
        errors.push("software.softwareName must not exceed 50 characters");
      }

      if (!config.software.softwareOperation) {
        errors.push("software.softwareOperation is required");
      } else if (!["LOCAL_SOFTWARE", "ONLINE_SERVICE"].includes(config.software.softwareOperation)) {
        errors.push("software.softwareOperation must be either 'LOCAL_SOFTWARE' or 'ONLINE_SERVICE'");
      }

      if (!config.software.softwareMainVersion || config.software.softwareMainVersion.trim() === "") {
        errors.push("software.softwareMainVersion is required (max 15 characters)");
      } else if (config.software.softwareMainVersion.length > 15) {
        errors.push("software.softwareMainVersion must not exceed 15 characters");
      }

      if (!config.software.softwareDevName || config.software.softwareDevName.trim() === "") {
        errors.push("software.softwareDevName is required (max 512 characters)");
      } else if (config.software.softwareDevName.length > 512) {
        errors.push("software.softwareDevName must not exceed 512 characters");
      }

      if (!config.software.softwareDevContact || config.software.softwareDevContact.trim() === "") {
        errors.push("software.softwareDevContact is required (max 200 characters)");
      } else if (config.software.softwareDevContact.length > 200) {
        errors.push("software.softwareDevContact must not exceed 200 characters");
      }

      if (config.software.softwareDevCountryCode && !/^[A-Z]{2}$/.test(config.software.softwareDevCountryCode)) {
        errors.push("software.softwareDevCountryCode must be a 2-letter ISO-3166 alpha-2 country code");
      }

      if (config.software.softwareDevTaxNumber && config.software.softwareDevTaxNumber.length > 50) {
        errors.push("software.softwareDevTaxNumber must not exceed 50 characters");
      }
    }

    if (errors.length > 0) {
      throw new NavConfigError(errors);
    }
  }

  private loadXsdSchemas(): void {
    // Check if XSD directory exists
    if (!existsSync(this._schemaDir)) {
      throw new Error(
        `XSD schema directory not found: ${this._schemaDir}\n` +
        `This usually happens when:\n` +
        `1. The package was not installed correctly\n` +
        `2. The OSA/xsd directory is missing from the package\n` +
        `3. The package is being used from a non-standard location\n\n` +
        `Expected directory structure:\n` +
        `  node_modules/nav-connect/\n` +
        `    build/\n` +
        `    OSA/\n` +
        `      xsd/\n` +
        `        common.xsd\n` +
        `        data.xsd\n` +
        `        invoiceApi.xsd\n` +
        `        invoiceBase.xsd\n\n` +
        `Please reinstall the package or check the installation.`
      );
    }

    // Read XSD directory contents
    let xsdFiles: string[];
    try {
      xsdFiles = readdirSync(this._schemaDir)
        .filter((file) => file.endsWith(".xsd"))
        .map((file) => path.join(this._schemaDir, file));
    } catch (error) {
      throw new Error(
        `Failed to read XSD schema directory: ${this._schemaDir}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (xsdFiles.length === 0) {
      throw new Error(
        `No XSD schema files found in: ${this._schemaDir}\n` +
        `Expected files: common.xsd, data.xsd, invoiceApi.xsd, invoiceBase.xsd`
      );
    }

    // Validate that all required schemas are present
    const requiredSchemas = Object.values(XsdSchema);
    const foundSchemas = xsdFiles.map(file => path.basename(file, '.xsd'));
    const missingSchemas = requiredSchemas.filter(schema => !foundSchemas.includes(schema));
    
    if (missingSchemas.length > 0) {
      throw new Error(
        `Missing required XSD schema files in ${this._schemaDir}:\n` +
        missingSchemas.map(schema => `  - ${schema}.xsd`).join('\n') + '\n\n' +
        `Found schemas: ${foundSchemas.join(', ')}\n` +
        `Required schemas: ${requiredSchemas.join(', ')}`
      );
    }

    // Load XSD schemas
    const loadErrors: string[] = [];
    for (const xsdPath of xsdFiles) {
      try {
        const xsdBuffer = readFileSync(xsdPath);
        const baseUrl = dirname(xsdPath);

        // Extract filename and convert to enum
        const schemaName = path.basename(xsdPath, '.xsd');
        const schemaType = Object.values(XsdSchema).find(
          value => value === schemaName
        );

        if (!schemaType) {
          loadErrors.push(`Invalid schema name: ${schemaName} (file: ${xsdPath})`);
          continue;
        }

        // Parse XSD
        const xsdDoc = libxml2_wasm_module.XmlDocument.fromBuffer(xsdBuffer, {
          url: xsdPath,
          option: libxml2_wasm_module.ParseOption.XML_PARSE_NOBLANKS | libxml2_wasm_module.ParseOption.XML_PARSE_NONET | libxml2_wasm_module.ParseOption.XML_PARSE_HUGE
        });
        const xsdValidator = libxml2_wasm_module.XsdValidator.fromDoc(xsdDoc);

        this.xsdDocs.set(schemaType, xsdValidator);
      } catch (error) {
        loadErrors.push(
          `Failed to load ${path.basename(xsdPath)}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (loadErrors.length > 0) {
      throw new Error(
        `Failed to load XSD schemas:\n${loadErrors.join('\n')}\n\n` +
        `XSD directory: ${this._schemaDir}`
      );
    }

    // Verify all required schemas were loaded
    const loadedSchemas = Array.from(this.xsdDocs.keys());
    const notLoaded = requiredSchemas.filter(schema => !loadedSchemas.includes(schema));
    
    if (notLoaded.length > 0) {
      throw new Error(
        `Some required XSD schemas were not loaded:\n` +
        notLoaded.map(schema => `  - ${schema}.xsd`).join('\n')
      );
    }
  }

  private addNamespacePrefix(obj: any, prefix: string): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.addNamespacePrefix(item, prefix));
    }

    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Ha már van prefix a kulcsban vagy speciális kulcs, ne módosítsuk
      if (key.includes(":") || key.startsWith("@_") || key === "#text") {
        result[key] = value;
        continue;
      }

      const newKey = `${prefix}:${key}`;
      result[newKey] = typeof value === "object" ? this.addNamespacePrefix(value, prefix) : value;
    }

    return result;
  }

  private getRequestId(): EntityIdType {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(8).toString("hex");
    return (ts + rnd).slice(0, 30);
  }

  private getTimestamp() {
    return new Date().toISOString();
  }

  private sha512(msg: string) {
    return crypto.createHash("sha512").update(msg).digest("hex").toUpperCase();
  }

  private sha3_512(msg: string) {
    return crypto.createHash("sha3-512").update(msg).digest("hex").toUpperCase();
  }

  private formatNavTimestampForHash(isoTs: string): string {
    const d = new Date(isoTs);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds())
    );
  }

  private createBasicOnlineInvoiceRequest(): BasicOnlineInvoiceRequestType {
    const request_id: string = this.getRequestId();
    const timestamp = this.getTimestamp();
    const navTimestampForHash = this.formatNavTimestampForHash(timestamp);

    const basicRequest = (): BasicRequestType => {
      return this.addNamespacePrefix(
        {
          "@_xmlns": "http://schemas.nav.gov.hu/OSA/3.0/api",
          "@_xmlns:common": "http://schemas.nav.gov.hu/NTCA/1.0/common",
          header: {
            requestId: request_id,
            timestamp: timestamp,
            requestVersion: "3.0",
            headerVersion: "1.0",
          },
          user: {
            login: this._config.technicalUser.user,
            passwordHash: {
              "@_cryptoType": "SHA-512",
              "#text": this.sha512(this._config.technicalUser.password),
            },
            taxNumber: this._config.taxNumber,
            requestSignature: {
              "@_cryptoType": "SHA3-512",
              "#text": this.sha3_512(request_id + navTimestampForHash + this._config.technicalUser.signatureKey),
            },
          },
        },
        "common"
      );
    };
    return {
      ...basicRequest(),
      software: {
        softwareId: this._config.software.softwareId,
        softwareName: this._config.software.softwareName,
        softwareOperation: this._config.software.softwareOperation,
        softwareMainVersion: this._config.software.softwareMainVersion,
        softwareDevName: this._config.software.softwareDevName,
        softwareDevContact: this._config.software.softwareDevContact,
        softwareDevCountryCode: this._config.software.softwareDevCountryCode,
        softwareDevTaxNumber: this._config.software.softwareDevTaxNumber,
      },
    };
  }

  generateAndValidateXml<T>(requestType: string, data: T, schemaType: XsdSchema): string {
    const xsdValidator = this.xsdDocs.get(schemaType);
    if (!xsdValidator) {
      throw new NavApiError(`XSD schema not found: ${schemaType}`);
    }
    const xml = this._builder.build({
      [requestType]: data,
    });
    
    let xmlDoc;
    try {
      xmlDoc = libxml2_wasm_module.XmlDocument.fromString(xml, {
        option: libxml2_wasm_module.ParseOption.XML_PARSE_NOBLANKS | libxml2_wasm_module.ParseOption.XML_PARSE_NONET
      });
      xsdValidator.validate(xmlDoc);
      xmlDoc.dispose();
    } catch (e: any) {
      if (xmlDoc) xmlDoc.dispose();
      let errors = [e instanceof Error ? e.message : String(e)];
      if (e instanceof libxml2_wasm_module.XmlValidateError && e.details) {
        errors = e.details.map((d: any) => d.message.trim());
      }
      throw new NavXmlValidationError(requestType, errors);
    }

    return xml;
  }

  /**
   * Parses an Axios error response from the NAV API.
   * Tries to extract the structured GeneralErrorResponse from the XML body.
   * Falls back to NavApiHttpError if the body cannot be parsed.
   */
  private handleAxiosError(error: import("axios").AxiosError): never {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const rawBody = typeof error.response?.data === "string" ? error.response.data : undefined;

    // Try to parse the XML error body
    if (rawBody) {
      try {
        const parsed = xmlParser<{ GeneralErrorResponse?: GeneralErrorResponseType }>(rawBody);
        const errResp = parsed.GeneralErrorResponse;
        if (errResp?.result) {
          throw new NavApiResponseError({
            funcCode: errResp.result.funcCode,
            errorCode: errResp.result.errorCode,
            message: errResp.result.message,
            httpStatus: status,
            technicalValidationMessages: errResp.technicalValidationMessages,
          });
        }
      } catch (parseErr) {
        // If it's already a NavApiResponseError, rethrow
        if (parseErr instanceof NavApiResponseError) {
          throw parseErr;
        }
        // Otherwise fall through to generic HTTP error
      }
    }

    throw new NavApiHttpError(status ?? 0, statusText, rawBody);
  }

  async queryInvoiceDigest(params: {
      page: number;
      insDate: DateTimeIntervalParamType;
      invoiceDirectionType: InvoiceDirectionType;
    }): Promise<NavApiResponse<QueryInvoiceDigestResponse>> {
      // Validate date range (max 35 days)
      const from = new Date(params.insDate.dateTimeFrom);
      const to = new Date(params.insDate.dateTimeTo);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > MAX_DIGEST_RANGE_DAYS) {
        throw new NavDateRangeError(diffDays, MAX_DIGEST_RANGE_DAYS);
      }

      const reqObj: QueryInvoiceDigestRequest = {
        ...this.createBasicOnlineInvoiceRequest(),
        page: params.page,
        invoiceDirection: params.invoiceDirectionType,
        invoiceQueryParams: {
          mandatoryQueryParams: {
            insDate: params.insDate,
          },
        },
      };

      const requestXml = this.generateAndValidateXml(
        "QueryInvoiceDigestRequest",
        reqObj,
        XsdSchema.InvoiceApi
      );

      try {
        const response = await this._client.post("/queryInvoiceDigest", requestXml);

        const xmlValidationWarnings = this.validateResponseXml(response.data, XsdSchema.InvoiceApi);

        const result = xmlParser<{
          QueryInvoiceDigestResponse: QueryInvoiceDigestResponse;
        }>(response.data);

        this.checkResponseResult(result.QueryInvoiceDigestResponse?.result);

        return {
          data: result.QueryInvoiceDigestResponse,
          ...(xmlValidationWarnings.length > 0 && { xmlValidationWarnings }),
        };
      } catch (error) {
        if (error instanceof NavApiError) throw error;
        if (axios.isAxiosError(error)) this.handleAxiosError(error);
        throw new NavApiError("queryInvoiceDigest failed", error);
      }
    }

  /**
   * Queries all invoice digests for an arbitrary date range.
   * Automatically splits the range into ≤35-day chunks, paginates each chunk,
   * and throttles API calls to avoid overloading the NAV server.
   *
   * @param params.insDate - The full date range to query (can exceed 35 days)
   * @param params.invoiceDirectionType - INBOUND or OUTBOUND
   * @param params.throttleMs - Delay between API calls in ms (default: 5000)
   * @param params.onProgress - Optional callback to monitor progress
   */
  async queryInvoiceDigestAll(params: {
    insDate: DateTimeIntervalParamType;
    invoiceDirectionType: InvoiceDirectionType;
    throttleMs?: number;
    onProgress?: (progress: DigestAllProgress) => void;
  }): Promise<InvoiceDigestType[]> {
    console.log('[DEBUG queryInvoiceDigestAll] CALLED with params:', JSON.stringify({
      insDate: params.insDate,
      invoiceDirectionType: params.invoiceDirectionType,
      throttleMs: params.throttleMs,
    }, null, 2));

    const throttle = params.throttleMs ?? DEFAULT_THROTTLE_MS;
    const from = new Date(params.insDate.dateTimeFrom);
    const to = new Date(params.insDate.dateTimeTo);

    console.log('[DEBUG queryInvoiceDigestAll] throttle:', throttle);
    console.log('[DEBUG queryInvoiceDigestAll] from:', from.toISOString(), 'to:', to.toISOString());
    console.log('[DEBUG queryInvoiceDigestAll] from valid:', !isNaN(from.getTime()), 'to valid:', !isNaN(to.getTime()));

    // Split into ≤35-day chunks
    const chunks: { from: string; to: string }[] = [];
    let chunkStart = new Date(from);
    console.log('[DEBUG queryInvoiceDigestAll] Starting chunk splitting, chunkStart:', chunkStart.toISOString(), 'to:', to.toISOString());
    while (chunkStart < to) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setDate(chunkEnd.getDate() + MAX_DIGEST_RANGE_DAYS);
      // Don't exceed the requested end date
      const effectiveEnd = chunkEnd > to ? to : chunkEnd;
      chunks.push({
        from: chunkStart.toISOString(),
        to: effectiveEnd.toISOString(),
      });
      chunkStart = new Date(effectiveEnd);
      // Avoid infinite loop if effectiveEnd === to
      if (effectiveEnd >= to) break;
    }

    console.log('[DEBUG queryInvoiceDigestAll] Total chunks created:', chunks.length);
    console.log('[DEBUG queryInvoiceDigestAll] Chunks:', JSON.stringify(chunks, null, 2));

    const allDigests: InvoiceDigestType[] = [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      let currentPage = 1;
      let availablePage = 1;

      console.log(`[DEBUG queryInvoiceDigestAll] === Processing chunk ${ci + 1}/${chunks.length}: ${chunk.from} -> ${chunk.to} ===`);

      do {
        // Throttle before each API call (skip the very first one)
        if (ci > 0 || currentPage > 1) {
          console.log(`[DEBUG queryInvoiceDigestAll] Throttling ${throttle}ms before API call...`);
          await NavConnect.sleep(throttle);
        }

        console.log(`[DEBUG queryInvoiceDigestAll] Calling queryInvoiceDigest - chunk ${ci + 1}, page ${currentPage}`);
        console.log('[DEBUG queryInvoiceDigestAll] Request params:', JSON.stringify({
          page: currentPage,
          invoiceDirectionType: params.invoiceDirectionType,
          insDate: { dateTimeFrom: chunk.from, dateTimeTo: chunk.to },
        }, null, 2));

        let response;
        try {
          response = await this.queryInvoiceDigest({
            page: currentPage,
            invoiceDirectionType: params.invoiceDirectionType,
            insDate: {
              dateTimeFrom: chunk.from,
              dateTimeTo: chunk.to,
            },
          });
          console.log(`[DEBUG queryInvoiceDigestAll] queryInvoiceDigest response received for chunk ${ci + 1}, page ${currentPage}`);
        } catch (err) {
          console.log(`[DEBUG queryInvoiceDigestAll] ERROR in queryInvoiceDigest call:`, err);
          throw err;
        }

        console.log('[DEBUG queryInvoiceDigestAll] response.data keys:', Object.keys(response.data));
        console.log('[DEBUG queryInvoiceDigestAll] response.data.invoiceDigestResult:', JSON.stringify(response.data.invoiceDigestResult, null, 2));

        // A NAV API invoiceDigestResult-ja lehet tömb vagy objektum
        const digestResultRaw = response.data.invoiceDigestResult;
        const digestResult = Array.isArray(digestResultRaw) ? digestResultRaw[0] : digestResultRaw;
        
        if (digestResult?.invoiceDigest) {
          console.log(`[DEBUG queryInvoiceDigestAll] Found ${digestResult.invoiceDigest.length} digests in this page`);
          allDigests.push(...digestResult.invoiceDigest);
        } else {
          console.log('[DEBUG queryInvoiceDigestAll] No invoiceDigest in digestResult. digestResult:', digestResult);
        }

        availablePage = digestResult?.availablePage ? parseInt(String(digestResult.availablePage), 10) : 0;
        console.log(`[DEBUG queryInvoiceDigestAll] availablePage: ${availablePage}, currentPage: ${currentPage}`);

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
        console.log(`[DEBUG queryInvoiceDigestAll] Next page will be: ${currentPage}, will continue: ${currentPage <= availablePage}`);
      } while (currentPage <= availablePage);

      console.log(`[DEBUG queryInvoiceDigestAll] Chunk ${ci + 1} done. Total digests so far: ${allDigests.length}`);
    }

    console.log(`[DEBUG queryInvoiceDigestAll] ALL DONE. Total digests collected: ${allDigests.length}`);
    return allDigests;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async queryInvoiceData(params: InvoiceNumberQueryType): Promise<NavApiResponse<QueryInvoiceDataResponse>> {
      const reqObj: QueryInvoiceDataRequest = {
        ...this.createBasicOnlineInvoiceRequest(),
        invoiceNumberQuery: {
          invoiceNumber: params.invoiceNumber,
          invoiceDirection: params.invoiceDirection,
          supplierTaxNumber: params.supplierTaxNumber
        }
      };

      const requestXml = this.generateAndValidateXml(
        "QueryInvoiceDataRequest",
        reqObj,
        XsdSchema.InvoiceApi
      );

      try {
        const response = await this._client.post("/queryInvoiceData", requestXml);

        const xmlValidationWarnings = this.validateResponseXml(response.data, XsdSchema.InvoiceApi);

        const result = xmlParser<{
          QueryInvoiceDataResponse: QueryInvoiceDataResponse;
        }>(response.data);

        this.checkResponseResult(result.QueryInvoiceDataResponse?.result);

        return {
          data: result.QueryInvoiceDataResponse,
          ...(xmlValidationWarnings.length > 0 && { xmlValidationWarnings }),
        };
      } catch (error) {
        if (error instanceof NavApiError) throw error;
        if (axios.isAxiosError(error)) this.handleAxiosError(error);
        throw new NavApiError("queryInvoiceData failed", error);
      }
    }

  /**
   * Checks the result field of a successful NAV API response.
   * Even HTTP 200 responses can contain funcCode: "ERROR".
   */
  private checkResponseResult(result?: BasicResultType): void {
    if (!result) return;
    if (result.funcCode === "ERROR") {
      throw new NavApiResponseError({
        funcCode: result.funcCode,
        errorCode: result.errorCode,
        message: result.message,
      });
    }
  }
  /**
   * Validates response XML against XSD schema without blocking.
   * Returns validation warnings instead of throwing errors.
   */
  private validateResponseXml(xml: string, schemaType: XsdSchema): string[] {
    try {
      const xsdValidator = this.xsdDocs.get(schemaType);
      if (!xsdValidator) return [`XSD schema not found for response validation: ${schemaType}`];

      const xmlDoc = libxml2_wasm_module.XmlDocument.fromString(xml, {
        option: libxml2_wasm_module.ParseOption.XML_PARSE_NOBLANKS | libxml2_wasm_module.ParseOption.XML_PARSE_NONET
      });
      
      try {
        xsdValidator.validate(xmlDoc);
      } finally {
        xmlDoc.dispose();
      }
    } catch (e: any) {
      if (e instanceof libxml2_wasm_module.XmlValidateError && e.details) {
        return e.details.map((d: any) => `[Response XML validation] ${d.message.trim()}`);
      }
      return [`[Response XML validation] Parse error: ${e instanceof Error ? e.message : String(e)}`];
    }
    return [];
  }
}
export default NavConnect;
