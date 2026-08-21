import type {
  AnnulmentOperationType,
  BasicOnlineInvoiceRequestType,
  BasicRequestType,
  InvoiceOperationType,
  ManageAnnulmentRequest,
  ManageInvoiceRequest,
} from "nav-osa-types";
import type { NavApiConfig } from "./configValidator.js";
import { computeManageRequestSignature, generateRequestMetadata, sha3_512, sha512 } from "./crypto.js";

function buildBasicOnlineInvoiceRequest(
  config: NavApiConfig,
  requestId: string,
  timestamp: string,
  signature: string
): BasicOnlineInvoiceRequestType {
  const basicRequest: BasicRequestType = {
    "@_xmlns": "http://schemas.nav.gov.hu/OSA/3.0/api",
    "@_xmlns:common": "http://schemas.nav.gov.hu/NTCA/1.0/common",
    header: {
      requestId,
      timestamp,
      requestVersion: "3.0",
      headerVersion: "1.0",
    },
    user: {
      login: config.technicalUser.user,
      passwordHash: {
        "@_cryptoType": "SHA-512",
        "#text": sha512(config.technicalUser.password),
      },
      taxNumber: config.taxNumber,
      requestSignature: {
        "@_cryptoType": "SHA3-512",
        "#text": signature,
      },
    },
  };
  return {
    ...basicRequest,
    software: {
      softwareId: config.software.softwareId,
      softwareName: config.software.softwareName,
      softwareOperation: config.software.softwareOperation,
      softwareMainVersion: config.software.softwareMainVersion,
      softwareDevName: config.software.softwareDevName,
      softwareDevContact: config.software.softwareDevContact,
      softwareDevCountryCode: config.software.softwareDevCountryCode,
      softwareDevTaxNumber: config.software.softwareDevTaxNumber,
    },
  };
}

export function createBasicOnlineInvoiceRequest(config: NavApiConfig): BasicOnlineInvoiceRequestType {
  const { requestId, timestamp, navTimestampForHash } = generateRequestMetadata();
  const signature = sha3_512(requestId + navTimestampForHash + config.technicalUser.signatureKey);
  return buildBasicOnlineInvoiceRequest(config, requestId, timestamp, signature);
}

function createManageRequest<T extends object>(
  config: NavApiConfig,
  params: {
    exchangeToken: string;
    operations: T;
  },
  signatureParts: { operation: string; data: string }[]
): BasicOnlineInvoiceRequestType & { exchangeToken: string } & T {
  const { requestId, timestamp, navTimestampForHash } = generateRequestMetadata();
  const signature = computeManageRequestSignature(
    requestId,
    navTimestampForHash,
    config.technicalUser.signatureKey,
    signatureParts
  );

  return {
    ...buildBasicOnlineInvoiceRequest(config, requestId, timestamp, signature),
    exchangeToken: params.exchangeToken,
    ...params.operations,
  };
}

export function createManageInvoiceRequest(
  config: NavApiConfig,
  params: {
    invoiceOperation: InvoiceOperationType[];
    compressedContent: boolean;
    exchangeToken: string;
  }
): ManageInvoiceRequest {
  return createManageRequest(
    config,
    {
      exchangeToken: params.exchangeToken,
      operations: {
        invoiceOperations: {
          compressedContent: params.compressedContent,
          invoiceOperation: params.invoiceOperation,
        },
      },
    },
    params.invoiceOperation.map((op) => ({
      operation: op.invoiceOperation,
      data: op.invoiceData,
    }))
  );
}

export function createManageAnnulmentRequest(
  config: NavApiConfig,
  params: {
    annulmentOperations: AnnulmentOperationType[];
    exchangeToken: string;
  }
): ManageAnnulmentRequest {
  return createManageRequest(
    config,
    {
      exchangeToken: params.exchangeToken,
      operations: {
        annulmentOperations: {
          annulmentOperation: params.annulmentOperations,
        },
      },
    },
    params.annulmentOperations.map((op) => ({
      operation: op.annulmentOperation,
      data: op.invoiceAnnulment,
    }))
  );
}