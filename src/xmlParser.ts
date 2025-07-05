import { XMLParser } from "fast-xml-parser";

function normalizeTaxNumbers(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  // always string keys not number 
  const taxKeys = [
    "supplierTaxNumber",
    "customerTaxNumber",
    "supplierGroupMemberTaxNumber",
    "customerGroupMemberTaxNumber",
    "taxNumber",
    "vatGroupMembership",
    "groupMemberTaxNumber",


  ];

  for (const key of Object.keys(obj)) {
    if (taxKeys.includes(key) && obj[key] !== undefined && obj[key] !== null) {
      obj[key] = String(obj[key]);
    } else if (typeof obj[key] === "object") {
      // Rekurzívan mélyebbre megy, pl. tömbök, beágyazott objektumok
      obj[key] = normalizeTaxNumbers(obj[key]);
    }
  }
  return obj;
}

function normalizeArrays(obj: any): any {
  const keys = [
    "invoiceDigest",

  ]
  if (!obj || typeof obj !== "object") return obj;
  for (const key of Object.keys(obj)) {
    if (keys.includes(key)) {
      if (obj[key] === undefined) {
        obj[key] = [];
      } else if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
    }
    if (typeof obj[key] === "object") {
      obj[key] = normalizeArrays(obj[key]);
    }
  }
  return obj;
}

export async function xmlParser<T>(xmlData: string): Promise<T> {
  const parser = new XMLParser({
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    ignoreAttributes: false,
    parseAttributeValue: true,
    trimValues: true,
    parseTagValue: true,
    ignoreDeclaration: true,
    removeNSPrefix: true,
  });
  try {
    const result = parser.parse(xmlData);
    return normalizeArrays(normalizeTaxNumbers(result)) as T;  // taxNumbers always string
  } catch (err) {
    console.error("XML response processing error:", err);
    throw err;
  }
}