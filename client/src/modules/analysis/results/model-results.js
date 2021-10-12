import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "../../common/table";
import ObjectList from "../../common/object-list";
import {
  defaultColumn,
  getColumns,
  downloadResults,
} from "./model-results.utils";

export default function ModelResults({ results, children = "" }) {
  if (!results) return children;

  return (
    <>
      {results.Errors_Warnings?.length > 0 && (
        <Alert variant="warning">
          <h2 className="h4">Warnings</h2>
          <ul className="mb-0">
            {results.Errors_Warnings.map((warning, i) => (
              <li key={`warning-${i}`}>
                {warning.object && (
                  <span className="me-1">({warning.object})</span>
                )}
                {warning.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
        Effects
        <Button
          variant="primary"
          size="sm"
          onClick={(ev) => downloadResults(results)}>
          <i className="bi bi-download me-1" />
          Download Results
        </Button>
      </h2>
      <Table
        columns={getColumns(results.Effects)}
        data={results.Effects}
        options={{ defaultColumn }}
        useColumnFilters
      />
    </>
  );
}
