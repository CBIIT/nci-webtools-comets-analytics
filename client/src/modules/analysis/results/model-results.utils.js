import { RangeFilter, TextFilter } from "../../common/table";
import { downloadTables } from "../../../services/download";
import isNumber from "lodash/isNumber";

export const defaultColumn = {
  Header: ({ column }) => <span title={column.id}>{column.id}</span>,
  Cell: ({ value }) => (
    <div title={value} className="text-truncate">
      {value}
    </div>
  ),
  minWidth: 50,
  width: 180,
};

export function getColumns(table) {
  if (!table || !table.length) return [];

  // use first row to retrieve column names
  const [firstRow] = table;
  const columnNames = Object.keys(firstRow);
  const wideColumns = ["model", "outcome", "outcomespec"];

  return columnNames.map((columnName) => {
    // use first row to determine if column is numeric
    const isNumericColumn = isNumber(firstRow[columnName]);

    const columnFilter = isNumericColumn ? { Filter: RangeFilter, filter: "between" } : { Filter: TextFilter };

    // todo: determine column width based on avg length/clientWidth
    const columnWidth = {
      width: wideColumns.includes(columnName) ? 240 : 180,
    };

    return {
      id: columnName,
      accessor: (record) => record[columnName],
      ...columnFilter,
      ...columnWidth,
    };
  });
}

export function downloadResults(results, filename) {
  const sheetNames = ["ModelSummary", "Effects", "Errors_Warnings"];
  const sheets = sheetNames.map((name) => ({ name, data: results[name] }));
  const d = new Date();
  const pad = (e) => String(e).padStart(2, "0");
  const timestamp = [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "_",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
  console.log("download", results);
  const modelName = results.options?.name?.replace(/\s+/g, "_");
  filename = filename || `${modelName}_${timestamp}.xlsx`;
  downloadTables(sheets, filename);
}
