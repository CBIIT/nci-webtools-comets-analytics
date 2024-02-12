import Button from "react-bootstrap/Button";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { RangeFilter, TextFilter, IndeterminateCheckbox } from "../../common/table";
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

export function getSelectColumn(onSelect) {
  return {
    id: "selection",
    type: "selection",
    headerClassName: "p-2",
    minWidth: 45,
    width: 45,
    maxWidth: 45,
    Header: (props) => (
      <OverlayTrigger
        overlay={
          <Tooltip id="tagManagerTooltip">
            <span>Use tagging to create a list of outcomes for analysis.</span>
          </Tooltip>
        }>
        <Button
          variant="primary"
          className="border-0"
          size="sm"
          onClick={() => onSelect(props)}
          title="Use tagging to create a list of outcomes for analysis">
          <i className="bi bi-tags-fill text-light" />
          <span className="visually-hidden">Manage Tags</span>
        </Button>
      </OverlayTrigger>
    ),
    SecondaryHeader: ({ getToggleAllRowsSelectedProps }) => (
      <div className="form-check">
        <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} className="form-check-input" />
      </div>
    ),
    Cell: ({ row }) => (
      <div className="form-check">
        <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} className="form-check-input" />
      </div>
    ),
  };
}

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
      sortType: isNumericColumn ? "basic" : "alphanumeric",
      ...columnFilter,
      ...columnWidth,
    };
  });
}

export function downloadResults(results, filename) {
  const sheetNames = ["ModelSummary", "Effects", "ChemEnrich", "Errors_Warnings", "Table1", "Info"].filter(
    (sheet) => results[sheet]
  );
  const sheets = sheetNames.map((name) => ({ name, data: results[name] }));
  const d = new Date();
  const pad = (e) => String(e).padStart(2, "0");
  const timestamp = [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    // "_",
    // pad(d.getHours()),
    // pad(d.getMinutes()),
    // pad(d.getSeconds()),
  ].join("-");
  const modelName = results.options?.name?.replace(/\s+/g, "_");
  const cohort = results.Info?.filter((e) => e.name === "cohort")[0]?.value?.replace(/\s+/g, "_");
  filename = filename || `${modelName}__${cohort}__${timestamp}.xlsx`;
  downloadTables(sheets, filename);

  window.gtag("event", "download", {
    event_category: "results",
    event_label: "model output",
  });
}
