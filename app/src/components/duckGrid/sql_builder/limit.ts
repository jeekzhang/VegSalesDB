// 
// limit.ts
// ===========
// 
// This script defines the limit part of the sql query
//  
//

import {
  IServerSideDatasource,
  IServerSideGetRowsParams,
} from "ag-grid-community";
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";

const buildLimit = async (
  database: AsyncDuckDB,
  params: IServerSideGetRowsParams,
) => {
  const startRow =
    params.request?.startRow !== undefined ? params.request.startRow : 0;
  const endRow =
    params.request?.endRow !== undefined ? params.request.endRow : 100;
  const pageSize = endRow - startRow;
  return " LIMIT " + (pageSize + 1) + " OFFSET " + startRow;
};

export default buildLimit;
