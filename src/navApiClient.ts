import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as crypto from 'crypto';
import { Software, QueryTransactionListRequest } from './navApiTypes';
import * as js2xmlparser from "js2xmlparser";
import * as libxmljs from 'libxmljs2';

interface NavApiConfig {
  baseUrl: string;
  user: string;
  password: string;
  taxNumber: string;
  signatureKey: string;
  exchangeKey?: string;
  software: Software;
}

export class NavApiClient {
  private config: NavApiConfig;
  private exchangeKey: string = '';
  private lastToken: string = '';
  private schemaDir: string;

  constructor(
    configPath: string = path.resolve(__dirname, 'config.json'),
    schemaDir: string = path.resolve(__dirname, 'schemas')
  ) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    const configFile = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configFile);
    this.schemaDir = schemaDir;
  }

  private getRequestId() {
    return 'REQ-' + Date.now();
  }

  private getTimestamp() {
    return new Date().toISOString();
  }

  private sha512(msg: string) {
    return crypto.createHash('sha512').update(msg).digest('hex').toUpperCase();
  }

  // Generikus XML generálás és séma validálás
  private generateAndValidateXml<T>(rootName: string, obj: T, xsdFilename: string): string {
    const xml = js2xmlparser.parse(rootName, obj, {
      declaration: { include: true },
      format: { pretty: true }
    });
    const xsdPath = path.join(this.schemaDir, xsdFilename);
    if (!fs.existsSync(xsdPath)) throw new Error(`XSD not found: ${xsdPath}`);
    const xsdSource = fs.readFileSync(xsdPath, "utf8");
    const xmlDoc = libxmljs.parseXml(xml);
    const xsdDoc = libxmljs.parseXml(xsdSource);
    if (!xmlDoc.validate(xsdDoc)) {
      throw new Error("XML is not valid: " + JSON.stringify(xmlDoc.validationErrors));
    }
    return xml;
  }

  async queryTransactionList(params: { page: number, pageSize: number }) {
    if (!this.exchangeKey) {
      await this.requestExchangeKey();
    }
    const req: QueryTransactionListRequest = {
      header: {
        requestId: this.getRequestId(),
        timestamp: this.getTimestamp(),
        requestVersion: "3.0"
      },
      user: {
        login: this.config.user,
        taxNumber: this.config.taxNumber,
        exchangeKey: this.exchangeKey
      },
      page: params.page,
      pageSize: params.pageSize,
      software: this.config.software
    };
    // XML generálás és validálás
    const xml = this.generateAndValidateXml("QueryTransactionListRequest", req, "QueryTransactionListRequest.xsd");

    const resp = await axios.post(
      this.config.baseUrl + '/queryTransactionList',
      xml,
      { headers: { 'Content-Type': 'application/xml' } }
    );
    return resp.data;
  }

  private async requestExchangeKey() {
    // implementáld a cserekulcs kérését, hasonló struktúrával!
    // ...
    this.exchangeKey = "EXAMPLE_EXCHANGE_KEY";
    return this.exchangeKey;
  }
}