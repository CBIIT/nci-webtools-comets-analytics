import { useEffect } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "../../common/table";
import TagManager from "./tag-manager";
import { defaultColumn, getColumns, getSelectColumn, downloadResults } from "./model-results.utils";
import { messagesState } from "./model-results.state";
import { showTagManagerState, newTagLabelState, newTagValuesState } from "./tag-manager.state";

export default function ModelResults({ results, children = "" }) {
  const [messages, setMessages] = useRecoilState(messagesState);
  const setShowTagManager = useSetRecoilState(showTagManagerState);
  const setNewTagLabel = useSetRecoilState(newTagLabelState);
  const setNewTagValues = useSetRecoilState(newTagValuesState);

  const removeMessageByIndex = (index) =>
    setMessages((oldMessages) => oldMessages.slice(0, index).concat(oldMessages.slice(index + 1)));

  useEffect(() => {
    setMessages([]);
    if (!results) return;

    let newMessages = [];

    if (results?.error) {
      newMessages.push({
        type: "danger",
        title: "Model Error",
        body: <p>{results.message || results.error}</p>,
      });
    } else if (results?.queue) {
      newMessages.push({
        type: "primary",
        title: "Results Will Be Emailed",
        body: (
          <>
            <p>
              Your job will be sent to the queuing system for processing. Results will be sent to you via email when all
              model runs are completed.
            </p>
            <p>
              Please note: Depending on model complexity and queue length it could be up to a day before you receive
              your results. Please check your spam folder if you do not receive your results within 24 hours.
            </p>
          </>
        ),
      });
    } else {
      if (results?.Errors_Warnings?.length) {
        newMessages.push({
          type: "warning",
          title: "Model Warnings",
          body: (
            <ul className="mb-0">
              {results.Errors_Warnings.map((warning, i) => (
                <li key={`warning-${i}`}>
                  {warning.object && <span className="me-1">({warning.object})</span>}
                  {warning.message}
                </li>
              ))}
            </ul>
          ),
        });
      }
      newMessages.push({
        type: "primary",
        title: "Analyses Successful",
        body: <p>Please download the results below and submit to the lead analyst conducting the meta-analysis.</p>,
      });
    }

    setMessages(newMessages);
  }, [results, setMessages]);

  function handleSelect({ selectedFlatRows, toggleAllRowsSelected }) {
    const selectedValues = selectedFlatRows.map((row) => row.original.outcomespec);
    setShowTagManager(true);
    setNewTagLabel("");
    setNewTagValues([...selectedValues]);
    toggleAllRowsSelected(false);
  }

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
            {results.options.type || "Model Results"} - {results.options.name}
            <Button variant="primary" size="sm" onClick={(ev) => downloadResults(results)}>
              <i className="bi bi-download me-1" />
              Download Results
            </Button>
          </h2>
          <Table
            columns={[getSelectColumn(handleSelect), ...getColumns(results.Effects)]}
            data={results.Effects}
            options={{ defaultColumn }}
            onSelect={handleSelect}
            useColumnFilters
          />
          <TagManager />
        </>
      )}
    </>
  );
}
