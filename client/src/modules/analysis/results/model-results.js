import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "../../common/table";
import { defaultColumn, getColumns, downloadResults } from "./model-results.utils";

export default function ModelResults({ results, children = "" }) {
  return !results ? children : (
    <>
      {results.Errors_Warnings?.length > 0 &&
        <Alert variant="warning">
          <h2 className="h4">Warnings</h2>
          <ul className="mb-0">
            {results.Errors_Warnings.map((warning, i) =>
              <li key={`warning-${i}`}>
                {warning.object && `(${warning.object})`} 
                {warning.message}
              </li>
            )}
          </ul>
        </Alert>}

      <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
        Model Summary
        <Button variant="primary" size="sm" onClick={ev => downloadResults(results, "results.xlsx")}>
          <i className="bi bi-download me-1" />
          Download Results
        </Button>
      </h2>
      <Table columns={getColumns(results.ModelSummary)} data={results.ModelSummary} options={{ defaultColumn }} useColumnFilters />

      <h2 className="h4 text-primary">Effects</h2>
      <Table columns={getColumns(results.Effects)} data={results.Effects} options={{ defaultColumn }} useColumnFilters />
    </>
  );
}
