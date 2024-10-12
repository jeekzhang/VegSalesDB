// groupby.ts

import { IServerSideGetRowsParams } from "ag-grid-community";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";

const buildGroupBy = async (
  database: AsyncDuckDB,
  params: IServerSideGetRowsParams,
  tableName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  const rowGroupLength = params.request?.rowGroupCols.length;
  const groupKeyLength = params.request?.groupKeys.length;

  const isGrouped = rowGroupLength > 0;
  const isFullyOpened = groupKeyLength > 0 && groupKeyLength === rowGroupLength;

  if (!isGrouped || isFullyOpened) {
    return "";
  }
  const groupByKeys = params.request?.rowGroupCols
    .map((key) => key.field)
    .slice(groupKeyLength, groupKeyLength + 1)
    .join(",");
  return `GROUP BY ${groupByKeys}`;
};

export default buildGroupBy;
