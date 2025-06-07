import { NavApiClient } from './navApiClient';
import { QueryTransactionListRequest } from './navApiTypes';

async function main() {
  const client = new NavApiClient();
  const req: QueryTransactionListRequest = {
  header: { ... },
  user: { ... },
  page: 1,
  pageSize: 10,
  software: { ... },
  transactionQueryParams: {
    insDate: {
      dateFrom: "2024-01-01T00:00:00Z",
      dateTo: "2024-01-31T23:59:59Z"
    }
    // vagy completionDate, vagy transactionIdList stb.
  }
};
  const result = await client.queryTransactionList(req);
  console.log(result);
}