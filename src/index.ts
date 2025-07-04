import fs from "fs/promises";
import path, { dirname } from "path";
import axios from "axios";
import * as crypto from "crypto";
import * as libxmljs from "libxmljs2";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import {
  BasicOnlineInvoiceRequestType,
  DateTimeIntervalParamType,
  InvoiceDirectionType,
  InvoiceNumberQueryType,
  QueryInvoiceDataRequest,
  QueryInvoiceDataResponse,
  QueryInvoiceDigestRequest,
  QueryInvoiceDigestResponse,
  SoftwareType,
} from "./osaTypes/invoiceApiTypes";
import { BasicHeaderType, BasicRequestType, EntityIdType } from "./osaTypes/commonTypes";
import { processXmlResponse } from "./xmlParser";

interface technicalUser {
  user: string;
  password: string;
  signatureKey: string;
  exchangeKey: string;
}

export interface NavApiConfig {
  testSystem: boolean;
  taxNumber: string;
  technicalUser: technicalUser;
  software: SoftwareType;
}
export enum XsdSchema {
  InvoiceBase = "invoiceBase",
  InvoiceApi = "invoiceApi",
  Common = "common",
  Data = "data",
}

interface XsdDocuments extends Map<XsdSchema, libxmljs.Document> {
  set(key: XsdSchema, value: libxmljs.Document): this;
  get(key: XsdSchema): libxmljs.Document | undefined;
}
class NavConnect {
  private _config: NavApiConfig;
  private _requestCounter: number = 0;
  private _schemaDir: string;
  private _baseUrl: string;
  private _builder: XMLBuilder;
  private _requestIdPrefix: string;
  private xsdDocs: XsdDocuments;

  constructor(config: NavApiConfig) {
    this._config = config;
    //random vmi
    this._requestIdPrefix = ((Date.now() + Number(config.taxNumber)) >> 2).toString(36).slice(-3).toUpperCase();
    this._baseUrl = this._config.testSystem
      ? "https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3/"
      : "https://api.onlineszamla.nav.gov.hu/invoiceService/v3";
    this._schemaDir = path.resolve(__dirname, "..", "OSA", "xsd");
    this.xsdDocs = new Map();

    // Az XSD könyvtár tartalmának beolvasása
    const xsdFiles = readdirSync(this._schemaDir)
      .filter((file) => file.endsWith(".xsd"))
      .map((file) => path.join(this._schemaDir, file));

    // XSD-k betöltése
    for (const xsdPath of xsdFiles) {
      try {
        const xsdBuffer = readFileSync(xsdPath);
        const baseUrl = dirname(xsdPath);


        // Fájlnév kinyerése és konvertálása enum-má
        const schemaName = path.basename(xsdPath, '.xsd');
        const schemaType = Object.values(XsdSchema).find(
          value => value === schemaName
        );

        if (!schemaType) {
          throw new Error(`Invalid schema name: ${schemaName}`);
        }
        const xsdDoc = libxmljs.parseXml(xsdBuffer.toString(), {
          baseUrl,
          noblanks: true,
          nonet: true,
          huge: true,
        });
        this.xsdDocs.set(schemaType, xsdDoc);
      } catch (error) {
        console.error(`Failed to load XSD from ${xsdPath}:`, error);
        throw error;
      }
    }

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

  private addNamespacePrefix(obj: any, prefix: string): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
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
    this._requestCounter++;
    return this._requestIdPrefix + "+" + Date.now().toString(36) + "+" + this._requestCounter.toString(36);
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

  async generateAndValidateXml(requestType: string, data: any, schemaType: XsdSchema): Promise<string> {
    try {
      const xsdDoc = this.xsdDocs.get(schemaType);
      if (!xsdDoc) {
        throw new Error(`XSD schema not found for xsdDocs: ${schemaType}`);
      }
      const xml = this._builder.build({
        [requestType]: data,
      });
      const xmlDoc = libxmljs.parseXml(xml, {
        noblanks: true,
        nonet: true,
      });
      // console.log(xml);
      const isValid = xmlDoc.validate(xsdDoc);
      if (!isValid) {
        const errors = xmlDoc.validationErrors.map((error) => error.message);
        throw new Error(`[${new Date().toISOString()}] XML validation failed for ${requestType}:\n${errors.join("\n")}`);
      }

      return xml;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in generateAndValidateXml for ${requestType}:`, error);
      throw error;
    }
  }

  async queryInvoiceDigest(params: {
    page: number;
    insDate: DateTimeIntervalParamType;
    invoiceDirectionType: InvoiceDirectionType;
  }): Promise<QueryInvoiceDigestResponse> {
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

    try {
      const requestXml = await this.generateAndValidateXml(
        "QueryInvoiceDigestRequest",
        reqObj,
        XsdSchema.InvoiceApi
      );

      const response = await axios.post(this._baseUrl + "/queryInvoiceDigest", requestXml, {
        headers: { "Content-Type": "application/xml" },
      });

      const result = await processXmlResponse<{
        QueryInvoiceDigestResponse: QueryInvoiceDigestResponse;
      }>(response.data);

      return result.QueryInvoiceDigestResponse;
    } catch (error) {
      console.error("Query invoice digest error:", error);
      throw error;
    }
  }
  async queryInvoiceData(params: InvoiceNumberQueryType): Promise<QueryInvoiceDataResponse> {
    const reqObj: QueryInvoiceDataRequest = {
      ...this.createBasicOnlineInvoiceRequest(),
      invoiceNumberQuery: {
        invoiceNumber: params.invoiceNumber,
        invoiceDirection: params.invoiceDirection,
        supplierTaxNumber: params.supplierTaxNumber
      }
    };

    try {
      const requestXml = await this.generateAndValidateXml(
        "QueryInvoiceDataRequest",
        reqObj,
        XsdSchema.InvoiceApi
      );

      const response = await axios.post(this._baseUrl + "/queryInvoiceData", requestXml, {
        headers: { "Content-Type": "application/xml" },
      });
      const result = await processXmlResponse<{
        QueryInvoiceDataResponse: QueryInvoiceDataResponse;
      }>(response.data);

      return result.QueryInvoiceDataResponse;
    } catch (error) {
      console.error("Query invoice data error:", error);
      throw error;
    }
  }
}
export default NavConnect;