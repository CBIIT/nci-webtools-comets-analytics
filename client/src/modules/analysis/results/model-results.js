import { useEffect } from "react";
import { useRecoilState } from "recoil";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "../../common/table";
import {
  defaultColumn,
  getColumns,
  downloadResults,
} from "./model-results.utils";
import { messagesState } from "./model-results.state";

export default function ModelResults({ results, children = "" }) {
  const [messages, setMessages] = useRecoilState(messagesState);
  const removeMessageByIndex = (index) =>
    setMessages((oldMessages) =>
      oldMessages.slice(0, index).concat(oldMessages.slice(index + 1))
    );

  useEffect(() => {
    setMessages([]);
    if (!results) return;

    let newMessages = [];

    if (results?.error) {
      newMessages = [
        {
          type: "danger",
          title: "Model Error",
          body: <p>{results.message || results.error}</p>,
        },
      ];
    } else if (results?.Errors_Warnings?.length) {
      newMessages = [
        {
          type: "warning",
          title: "Model Warnings",
          body: (
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
          ),
        },
      ];
    } else if (results?.queue) {
      newMessages = [
        {
          type: "primary",
          title: "Results Will Be Emailed",
          body: (
            <>
              <p>
                Your job will be sent to the queuing system for processing.
                Results will be sent to you via email when all model runs are
                completed.
              </p>
              <p>
                Please note: Depending on model complexity and queue length it
                could be up to a day before you receive your results
              </p>
            </>
          ),
        },
      ];
    }

    setMessages(newMessages);
  }, [results, setMessages]);

  return !results ? (
    children
  ) : (
    <>
      {messages.map(({ type, title, body }, index) => (
        <Alert
          key={`model-results-message-${index}`}
          variant={type}
          onClose={() => removeMessageByIndex(index)}
          dismissible>
          {title && <h2 className="h5">{title}</h2>}
          {body}
        </Alert>
      ))}

      {!results.error && !results.queue && (
        <>
          <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
            {results.options.type || "Correlation"} - {results.options.name}
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
      )}
    </>
  );
}
