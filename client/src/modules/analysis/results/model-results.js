import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "../../common/table";
import { correlationSummaryColumns, correlationEffectsColumns } from "./tables";
import { downloadTables } from '../../../services/download';

export default function ModelResults({results, children = ""}) {


  const defaultColumn = {
    Header: ({column }) => <span title={column.id}>{column.id}</span>,
    Cell: ({value}) => <div title={value} className="text-truncate">{value}</div>,
    minWidth: 50,
    width: 180,
  }

  function downloadResults() {
    const sheets = Object
      .entries(results)
      .map(([name, data]) => ({name, data}));
    downloadTables(sheets, `export.xlsx`);
  }

  return !results ? children : (
    <>
      {results.Errors_Warnings?.length > 0 && 
        <Alert variant="warning">
          <h2 className="h4">Warnings</h2>
          <ul className="mb-0">
            {results.Errors_Warnings.map((warning, i) => <li key={`warning-${i}`}>{warning.object && `(${warning.object})`} {warning.message}</li>)}
          </ul>
        </Alert>}

      <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
        Model Summary
        <Button variant="primary" size="sm" onClick={downloadResults}>
          <i className="bi bi-download me-1" />
          Download Results
        </Button>
      </h2>      
      <Table columns={correlationSummaryColumns} data={results.ModelSummary} options={{defaultColumn}} useColumnFilters />

      <h2 className="h4 text-primary">Effects</h2>
      <Table columns={correlationEffectsColumns} data={results.Effects} options={{defaultColumn}} useColumnFilters />


    </>
  );
}
