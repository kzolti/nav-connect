import { XMLParser } from "fast-xml-parser";

export async function xmlParser<T>(xmlData: string): Promise<T> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false, // nem alakít át number-ra vagy más json-type-ra
    parseAttributeValue: false,
    trimValues: true,
    ignoreDeclaration: true,
    removeNSPrefix: true,
    processEntities: true,
    isArray: (name) => {
      // Explicit tömbként kezelt elemek
      const alwaysArray = [
        // InvoiceData arrays
        "ekaerId",
        "orderNumber",
        "additionalLineData",
        "line",
        "productFeeData",
        "deliveryNote",
        "shippingDate",
        "contractNumber",
        "batchInvoice",
        "productFeeSummary",
        "additionalInvoiceData",
        "productCode",
        "referenceToOtherLine",
        "summaryByVatRate",
        "summarySimplified",
        "supplierCompanyCode",
        "customerCompanyCode",
        "dealerCode",
        "costCenter",
        "projectNumber",
        "generalLedgerAccountNumber",
        "glnNumber",
        "materialNumber",
        "itemNumber",
        "lineProductFeeContent",
        // API Response arrays
        "invoiceDigest",
        "invoiceDigestResult",
        "processingResultList"
      ];
      return alwaysArray.includes(name);
    },
    tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
      const booleanFields = [
        "completenessIndicator",
        "modifyWithoutMaster",
        "individualExemption",
        "periodicalSettlement",
        "smallBusinessIndicator",
        "utilitySettlementIndicator",
        "selfBillingIndicator",
        "cashAccountingIndicator",
        "mergedItemIndicator",
        "lineExpressionIndicator",
        "intermediatedService",
        "depositIndicator",
        "obligatedForProductFee",
        "netaDeclaration",
        "vatDomesticReverseCharge",
        "noVatCharge",
        "activityReferred",
        "airCargo",
        "advanceIndicator"
      ];
      const stringFields = [
        "supplierTaxNumber",
        "customerTaxNumber",
        "supplierGroupMemberTaxNumber",
        "customerGroupMemberTaxNumber",
        "taxNumber",
        "vatGroupMembership",
        "groupMemberTaxNumber",
        "invoiceNumber",
        "taxpayerId",
        "vatCode",
        "countyCode"
      ];

      if (booleanFields.includes(tagName)) {
        return tagValue === 'true';
      }
      if (stringFields.includes(tagName)) {
        return String(tagValue);
      }
      return tagValue;
    }
  });

  try {
    const result = parser.parse(xmlData);
    return result as T;
  } catch (err) {
    console.error("XML response processing error:", err);
    throw err;
  }
}