import { existsSync, readFileSync } from "fs";
import { NavApiClient } from "./navApiClient";
import { InvoiceDigestResultType, QueryInvoiceDigestResponseType } from "./osaTypes/invoiceApiTypes";
import path from "path";
// import { QueryTransactionListRequest } from './navApiTypes';

async function main() {
  const configPath = path.resolve(__dirname, "..", "config.json");
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${this.configPath}`);
  }
  const configFile = readFileSync(configPath, "utf-8");
  const client = new NavApiClient(JSON.parse(configFile));
  // client.queryTransactionList({
  //   page: 1,
  //   insDate: {
  //     dateTimeFrom: "2024-01-01T00:00:00Z",
  //     dateTimeTo: "2024-01-31T23:59:59Z",
  //   },
  // });
  const invoiceDigestresult: QueryInvoiceDigestResponseType = await client.queryInvoiceDigest({
    page: 1,
    insDate: {
      dateTimeFrom: "2025-06-01T00:00:00Z",
      dateTimeTo: "2025-06-30T23:59:59Z",
    },
    invoiceDirectionType: "OUTBOUND",
  });
  console.log(invoiceDigestresult.invoiceDigestResult.invoiceDigest[0].invoiceNumber);
}
main();
