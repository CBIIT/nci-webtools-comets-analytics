import { useRecoilState } from "recoil";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import { showTagManagerState, tagsState, newTagLabelState, newTagValuesState } from "./tag-manager.state";
import { pluralCount } from "../../../services/text";

export default function TagManager() {
  const [tags, setTags] = useRecoilState(tagsState);
  const [showTagManager, setShowTagManager] = useRecoilState(showTagManagerState);
  const [newTagLabel, setNewTagLabel] = useRecoilState(newTagLabelState);
  const [newTagValues, setNewTagValues] = useRecoilState(newTagValuesState);
  const validationState = getValidationState();

  function getValidationState() {
    let validationState = {
      newTagLabel: {
        isEmpty: !newTagLabel || newTagLabel.length === 0,
        alreadyExists: !!tags.find((tag) => tag.label === newTagLabel),
      },
      newTagValues: {
        isEmpty: !newTagValues || newTagValues.length === 0,
      },
    };

    let isValid = true;
    for (let key in validationState) {
      const value = validationState[key];
      const keyHasErrors = Object.values(value).some(Boolean);
      value.isValid = !keyHasErrors;
      if (!value.isValid) {
        isValid = false;
      }
    }

    return { isValid, ...validationState };
  }

  function createTag(event) {
    if (event) {
      event.preventDefault();
    }

    if (validationState.isValid) {
      const tag = {
        label: newTagLabel,
        value: newTagValues,
      };

      setTags([...tags, tag]);
      setNewTagLabel("");
      setNewTagValues([]);
    }
  }

  function removeTagByIndex(index) {
    setTags(tags.filter((tag, i) => i !== index));
  }

  function handleClose() {
    setShowTagManager(false);
  }

  return (
    <Modal show={showTagManager} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="text-primary">Outcomes Tag</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {newTagValues.length > 0 && (
          <Form onSubmit={createTag} className="mb-3">
            {/* <pre>{JSON.stringify({newTagLabel, newTagValues, validationState}, null, 2)}</pre> */}

            <Form.Group controlId="values" className="mb-3">
              <Form.Label>Selected Outcomes</Form.Label>
              <Form.Text className="d-block overflow-auto" style={{ maxHeight: "300px" }}>
                {newTagValues.join(", ")}
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="newTagLabel" className="mb-3">
              <Form.Label className="required">Tag Name</Form.Label>
              <Form.Control
                type="text"
                name="newTagLabel"
                value={newTagLabel || ""}
                onChange={(ev) => setNewTagLabel(ev.target.value)}
              />
              {validationState.newTagLabel.alreadyExists && (
                <Form.Text className="text-danger">Please provide a unique label.</Form.Text>
              )}
            </Form.Group>

            <div className="text-end">
              <Button variant="primary" type="submit" disabled={!validationState.isValid}>
                Create Tag
              </Button>
            </div>
          </Form>
        )}

        {newTagValues.length === 0 && (
          <div className="table-responsive rounded shadow-sm">
            <Table hover striped className="table-custom">
              <thead className="table-light text-muted">
                <tr>
                  <th>Label</th>
                  <th>Outcomes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag, index) => (
                  <tr key={tag.label}>
                    <td>{tag.label}</td>
                    <td>
                      <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                        {tag.value.join(", ")}
                      </div>
                    </td>
                    <td className="p-2">
                      <Button variant="danger" className="d-flex" size="sm" onClick={() => removeTagByIndex(index)}>
                        <i className="bi bi-trash me-1" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {!tags.length && (
                  <tr>
                    <td colSpan="3" className="text-center h6">
                      No tags have been created.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
