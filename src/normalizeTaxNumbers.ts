export function normalizeTaxNumbers(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  // Kulcsok, amik mindig string típusú adószámot kell tartalmazzanak
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