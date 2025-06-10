import { NavApiClient } from "./navApiClient";
// import { QueryTransactionListRequest } from './navApiTypes';

async function main() {
  const client = new NavApiClient();
  // client.queryTransactionList({
  //   page: 1,
  //   insDate: {
  //     dateTimeFrom: "2024-01-01T00:00:00Z",
  //     dateTimeTo: "2024-01-31T23:59:59Z",
  //   },
  // });
  client.queryInvoiceDigest({
    page: 1,
    insDate: {
      dateTimeFrom: "2025-06-01T00:00:00Z",
      dateTimeTo: "2025-06-30T23:59:59Z",
    },
    invoiceDirectionType:"INBOUND"
  });
  // console.log(result);
}
main();
