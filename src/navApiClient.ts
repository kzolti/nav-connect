import fs from "fs/promises";
import path, { dirname } from "path";
import axios from "axios";
import * as crypto from "crypto";

import * as js2xmlparser from "js2xmlparser";
import * as libxmljs from "libxmljs2";
import { parseStringPromise, processors } from "xml2js";
const { stripPrefix } = processors;
import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  BasicOnlineInvoiceRequestType,
  BasicOnlineInvoiceResponseType,
  DateTimeIntervalParamType,
  InvoiceDirectionType,
  QueryInvoiceDataResponse,
  QueryInvoiceDigestRequest,
  QueryInvoiceDigestResponse,
  QueryInvoiceDigestResponseType,
  QueryTransactionListRequest,
  SoftwareType,
  TokenExchangeRequest,
} from "./osaTypes/invoiceApiTypes";
import { BasicRequestType, UserHeaderType } from "./osaTypes/commonTypes";

interface technicalUser {
  user: string;
  password: string;
  signatureKey: string;
  exchangeKey: string;
}
export interface NavApiConfig {
  testSystem: boolean;
  taxNumber: string;
  technicalUser:technicalUser;
  software: SoftwareType;
}

export class NavApiClient {
  private _config: NavApiConfig;
  private _requestCounter: number = 0;
  private schemaDir: string;
  private configPath: string;
  private _baseUrl: string;

  constructor() {
    this.schemaDir = path.resolve(__dirname, "..", "OSA");
    this.configPath = path.resolve(__dirname, "..", "config.json");
    if (!existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }
    const configFile = readFileSync(this.configPath, "utf-8");
    this._config = JSON.parse(configFile);
    if (this._config.testSystem) {
      this._baseUrl = "https://api-test.onlineszamla.nav.gov.hu/invoiceService/v3/";
    } else {
      this._baseUrl = "https://api.onlineszamla.nav.gov.hu/invoiceService/v3";
    }
    // this.requestExchangeKey();
  }

  private getRequestId() {
    this._requestCounter++;
    return "REQ_" + Date.now().toString(36) + "+" + this._requestCounter.toString(36);
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
    // A hash-hez megfelelő formátum:
    const navTimestampForHash = this.formatNavTimestampForHash(timestamp);
    return {
      "@": {
        xmlns: "http://schemas.nav.gov.hu/OSA/3.0/api",
        "xmlns:common": "http://schemas.nav.gov.hu/NTCA/1.0/common",
      },
      "common:header": {
        "common:requestId": request_id,
        "common:timestamp": timestamp,
        "common:requestVersion": "3.0",
        "common:headerVersion": "1.0",
      },

      "common:user": {
        "common:login": this._config.technicalUser.user,
        "common:passwordHash": {
          "@": { cryptoType: "SHA-512" },
          "#": this.sha512(this._config.technicalUser.password),
        },
        "common:taxNumber": this._config.taxNumber,
        "common:requestSignature": {
          "@": { cryptoType: "SHA3-512" },
          "#": this.sha3_512(request_id + navTimestampForHash + this._config.technicalUser.signatureKey),
        },
      },
      software: this._config.software,
    };
  }

  // Generikus XML generálás és séma validálás
  private async generateAndValidateXml<T>(rootName: string, obj: T, xsdFilename: string): Promise<string> {
    const xsdPath = path.join(this.schemaDir, xsdFilename);
    try {
      const xml = js2xmlparser.parse(rootName, obj, {
        declaration: { include: true, encoding: "UTF-8" },
        format: { pretty: true },
      });

      // Ellenőrizzük, hogy létezik-e a fájl (fs.promises.access használata)
      await fs.access(xsdPath);

      const xsdSource = await fs.readFile(xsdPath, "utf8");
      const xmlDoc = libxmljs.parseXml(xml);
      const xsdDoc = libxmljs.parseXml(xsdSource, { baseUrl: dirname(xsdPath) });

      const valid = xmlDoc.validate(xsdDoc);
      if (valid) {
        console.log("XML is valid");
      } else {
        console.error("XML is invalid:", xmlDoc.validationErrors);
      }
      return xml;
    } catch (err) {
      // Ide érdemes lehet naplózni az xml-t is hibánál
      console.error("generateAndValidateXml error:", err, "file_path:" + xsdPath);
      throw err;
    }
  }

  async queryTransactionList(params: { page: number; insDate: DateTimeIntervalParamType }) {
    const reqObj: QueryTransactionListRequest = {
      ...this.createBasicOnlineInvoiceRequest(),
      page: params.page,
      insDate: params.insDate,
    };
    const req = await this.generateAndValidateXml("QueryTransactionListRequest", reqObj, "xsd/invoiceApi.xsd");
    console.log("PIitnKeNJMss", req);
    const resp = await axios.post(this._baseUrl + "/queryTransactionList", req, {
      headers: { "Content-Type": "application/xml" },
    });
    const xml = await parseStringPromise(resp.data);
    // const formatted_response = libxmljs.parseXml(resp.data).toString(true);
    // writeFileSync("output1.xml", formatted_response, { encoding: "utf-8" });
  }

  private async requestExchangeKey() {
    const reqObj: TokenExchangeRequest = this.createBasicOnlineInvoiceRequest();
    const req = await this.generateAndValidateXml("TokenExchangeRequest", reqObj, "xsd/invoiceApi.xsd");
    console.log("PIitnKeNJMss", req);

    const resp = await axios.post(this._baseUrl + "/tokenExchange", req, {
      headers: { "Content-Type": "application/xml" },
    });
    const xml = await parseStringPromise(resp.data);
    console.log(xml);

    return xml.ExchangeTokenResponse.exchangeToken[0];
  }

  async queryInvoiceDigest(params: {
    page: number;
    insDate: DateTimeIntervalParamType;
    invoiceDirectionType: InvoiceDirectionType;
  }) {
    const reqObj: QueryInvoiceDigestRequest = {
      ...this.createBasicOnlineInvoiceRequest(),
      page: params.page,
      invoiceDirection: params.invoiceDirectionType,
      invoiceQueryParams: {
        mandatoryQueryParams: { insDate: params.insDate },
      },
    };
    const req = await this.generateAndValidateXml("QueryInvoiceDigestRequest", reqObj, "xsd/invoiceApi.xsd");
    //console.log("usWGCsUEH", req);

    // const resp = await axios.post(this._baseUrl + "/queryInvoiceDigest", req, {
    //   headers: { "Content-Type": "application/xml" },
    // });
    // const formatted_response = libxmljs.parseXml(resp.data).toString(true);
    // writeFileSync("invoice_digest.xml", formatted_response, { encoding: "utf-8" });

    const xml = readFileSync("invoice_digest.xml", { encoding: "utf-8" });
    const xmlObj: any = await parseStringPromise(xml, {
      // tagNameProcessors: [stripPrefix],
      explicitArray: false,
      // xmlns:true
    });

    const reply: QueryInvoiceDigestResponse = xmlObj?.QueryInvoiceDigestResponse;

    console.log(
      "ELHSQQZyalmziO",
      reply.invoiceDigestResult.availablePage,
      reply.invoiceDigestResult?.invoiceDigest[0].invoiceNumber,
      reply.invoiceDigestResult.invoiceDigest[0]?.supplierName
    );

    // console.log("XsVcIfuY", JSON.stringify(xmlObj, null, 2));

    // this.exchangeKey = xml.ExchangeTokenResponse.exchangeToken[0];
    // return this.exchangeKey;
  }
}
