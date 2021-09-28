import { useRecoilState, useRecoilValue, useResetRecoilState } from "recoil";
import Select from "react-select";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ObjectList from "../common/object-list";
import { isNull, omitBy } from "lodash";
import {
  cohortsState,
  formValuesState,
  integrityCheckResultsState,
  variablesState,
} from "./analysis.state";

export default function InputForm({
  onSubmitIntegrityCheck,
  onSubmitModel,
  onReset,
}) {
  const cohorts = useRecoilValue(cohortsState);
  const integrityCheckResults = useRecoilValue(integrityCheckResultsState);
  const variables = useRecoilValue(variablesState);
  const [formValues, setFormValues] = useRecoilState(formValuesState);
  const resetFormValues = useResetRecoilState(formValuesState);
  const mergeFormValues = (values) =>
    setFormValues({ ...formValues, ...values });

  function handleChange(event) {
    let { name, value, type, files, checked } = event.target;

    if (type === "checkbox") {
      value = checked;
    }

    if (type === "file") {
      value = files && files.length ? files[0].name : null;
    }

    mergeFormValues({ [name]: value });
  }

  function handleSelectChange(name, selection = []) {
    mergeFormValues({ [name]: selection });
  }

  /**
   *
   * @param {React.FormEvent} event
   */
  function submitIntegrityCheck(event) {
    event.preventDefault();
    if (onSubmitIntegrityCheck) {
      onSubmitIntegrityCheck(new FormData(event.target));
    }
  }

  function submitModel(event) {
    event.preventDefault();
    if (onSubmitModel) {
      const asValue = ({ value }) => value;
      onSubmitModel({
        ...formValues,
        id: integrityCheckResults.id,
        options: getOptions(formValues.modelSpecifier, true),
        exposures: formValues.exposures.map(asValue),
        outcomes: formValues.outcomes.map(asValue),
        adjustedCovariates: formValues.adjustedCovariates.map(asValue),
        strata: formValues.strata.map(asValue),
        filters:
          formValues.filterVariable &&
          formValues.filterOperator &&
          formValues.filterValue
            ? [
                formValues.filterVariable,
                formValues.filterOperator,
                formValues.filterValue,
              ].join("")
            : null,
      });
    }
  }

  function reset(event) {
    event.preventDefault();
    resetFormValues();
    if (onReset) {
      onReset();
    }
  }

  function filterVariable({ data }, value, limit = 100) {
    const { label, isMetabolite } = data;
    const showMetabolite =
      !isMetabolite || (isMetabolite && formValues.showMetabolites);
    if (!value || value.length < 2) {
      const belowLimit = variables.indexOf(data) < limit;
      return belowLimit && showMetabolite;
    } else {
      const includesValue = label.toLowerCase().includes(value.toLowerCase());
      return includesValue && showMetabolite;
    }
  }

  function getModelSpecifier(modelSpecifierName) {
    return integrityCheckResults?.modelSpecifiers?.find(
      (spec) => spec?.name === modelSpecifierName
    );
  }

  function getOptions(modelSpecifierName, includeGlobalOptions = false) {
    const modelSpecifier = getModelSpecifier(modelSpecifierName);
    let options = modelSpecifier
      ? {
          model: modelSpecifier.model,
          "model.options": modelSpecifier.modelOptions,
        }
      : {
          model: "correlation",
        };

    if (includeGlobalOptions) {
      const modelChecksSpecifier = getModelSpecifier("ModelChecks") || {};
      const modelOutputSpecifier = getModelSpecifier("ModelOutput") || {};

      options = {
        ...options,
        ...modelChecksSpecifier?.modelOptions,
        ...modelOutputSpecifier?.modelOptions,
      };
    }

    // override global options if they are specified in the model specifier
    for (const key in options["model.options"]) {
      if (/^(check|max|output)\./i.test(key)) {
        options[key] = options["model.options"][key];
      }
    }

    // remove any null options and global options that are specified as model options
    options = omitBy(options, isNull);
    options["model.options"] = omitBy(
      options["model.options"],
      (value, key) => isNull(value) || options.hasOwnProperty(key)
    );

    return options;
  }

  function ModelOptions({ modelSpecifierName }) {
    const modelSpecifier = getModelSpecifier(modelSpecifierName);
    if (!modelSpecifier) return null;

    const modelOptions = {
      model: modelSpecifier.model,
      ...modelSpecifier.modelOptions,
    };

    return <ObjectList obj={modelOptions} />;
  }

  return (
    <>
      <Form onSubmit={submitIntegrityCheck} onReset={reset}>
        <h2 className="h5 text-primary mb-4">Cohort-specific Analysis</h2>

        <Form.Group controlId="cohort" className="mb-3">
          <Form.Label className="required">COMETS Cohort</Form.Label>
          <Form.Select
            name="cohort"
            value={formValues.cohort}
            onChange={handleChange}
            disabled={integrityCheckResults?.id}>
            <option value="Other/Undefined">Other/Undefined</option>
            {cohorts.map((c) => (
              <option key={c.Cohort} value={c.Cohort}>
                {c.Cohort}
              </option>
            ))}
          </Form.Select>
          <Form.Text>If not COMETS-specific, choose Other/Undefined</Form.Text>
        </Form.Group>

        <Form.Group controlId="inputFile" className="mb-3">
          <Form.Label className="required">Input Data File</Form.Label>
          <Form.Control
            type="file"
            name="inputFile"
            onChange={handleChange}
            disabled={integrityCheckResults?.id}
          />
          <Form.Text>
            <i className="bi bi-download me-1"></i>
            <a href="files/cometsInputAge.xlsx">Download Sample Input</a>
          </Form.Text>
        </Form.Group>

        <div className="text-end">
          <Button
            type="reset"
            variant="danger-outline"
            className="me-1"
            disabled={integrityCheckResults?.id}>
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={integrityCheckResults?.id || !formValues.inputFile}>
            Check Integrity
          </Button>
        </div>
      </Form>

      {integrityCheckResults && !integrityCheckResults.errors && (
        <>
          <hr />

          <Form onSubmit={submitModel} onReset={reset}>
            <Form.Group controlId="method" className="mb-3">
              <Form.Label className="required">
                Specify Method Of Analyses
              </Form.Label>
              <Form.Check
                type="radio"
                name="method"
                value="allModels"
                id="allModels"
                label="All models from the input file"
                onChange={handleChange}
                checked={formValues.method === "allModels"}
              />
              <Form.Check
                type="radio"
                name="method"
                value="selectedModel"
                id="selectedModel"
                label="Pre-specified models from the input file"
                onChange={handleChange}
                checked={formValues.method === "selectedModel"}
              />
              <Form.Check
                type="radio"
                name="method"
                value="customModel"
                id="customModel"
                label="Custom model"
                onChange={handleChange}
                checked={formValues.method === "customModel"}
              />
            </Form.Group>

            {formValues.method === "allModels" && (
              <Form.Group controlId="email" className="mb-3">
                <Form.Label className="required">Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  onChange={handleChange}
                />
              </Form.Group>
            )}

            {formValues.method === "selectedModel" && (
              <Form.Group controlId="selectedModel" className="mb-3">
                <Form.Label className="required">Model</Form.Label>
                <Form.Select
                  name="selectedModel"
                  value={formValues.selectedModel}
                  onChange={handleChange}>
                  <option value="" hidden>
                    No model chosen
                  </option>
                  {integrityCheckResults.models.map((m, i) => (
                    <option value={m.model} key={i + m.model}>
                      {m.model}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {formValues.method === "customModel" && (
              <>
                <Form.Group controlId="modelName" className="mb-3">
                  <Form.Label className="required">
                    Model Description
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="modelName"
                    onChange={handleChange}
                    value={formValues.modelName}
                    placeholder="Enter model description"></Form.Control>
                </Form.Group>

                <Form.Group controlId="modelSpecifier" className="mb-3">
                  <Form.Label className="required">Model Specifier</Form.Label>
                  <Form.Select
                    name="modelSpecifier"
                    onChange={handleChange}
                    value={formValues.modelSpecifier}>
                    <option value="">Default (correlation)</option>
                    {integrityCheckResults.modelSpecifiers
                      .filter((specifier) => specifier.model)
                      .map((specifier, i) => (
                        <option
                          value={specifier.name}
                          key={`model-specifier-${i}`}>
                          {specifier.name}
                        </option>
                      ))}
                  </Form.Select>
                </Form.Group>

                {formValues.modelSpecifier && (
                  <Form.Group className="mb-3">
                    <Form.Label>Model Options</Form.Label>
                    <ModelOptions
                      modelSpecifierName={formValues.modelSpecifier}
                    />
                  </Form.Group>
                )}

                <Form.Check
                  type="checkbox"
                  className="mb-3"
                  name="showMetabolites"
                  id="showMetabolites"
                  label={
                    <>
                      Show Individual Metabolites
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="showMetabolitesTooltip">
                            This option applies to Exposures, Outcomes and
                            Adjusted Covariates
                          </Tooltip>
                        }>
                        <i class="bi bi-info-circle ms-1"></i>
                      </OverlayTrigger>
                    </>
                  }
                  onChange={handleChange}
                  checked={formValues.showMetabolites}
                />

                <Form.Group controlId="exposures" className="mb-3">
                  <Form.Label className="required">Exposures</Form.Label>
                  <Select
                    placeholder="No exposures chosen"
                    name="exposures"
                    value={formValues.exposures}
                    onChange={(ev) => handleSelectChange("exposures", ev)}
                    defaultOptions
                    options={variables}
                    filterOption={filterVariable}
                    isMulti
                    closeMenuOnSelect={false}
                  />
                </Form.Group>
                <Form.Group controlId="outcomes" className="mb-3">
                  <Form.Label className="required">Outcomes</Form.Label>
                  <Select
                    placeholder="No outcomes chosen"
                    name="outcomes"
                    value={formValues.outcomes}
                    onChange={(ev) => handleSelectChange("outcomes", ev)}
                    defaultOptions
                    options={variables}
                    filterOption={filterVariable}
                    isMulti
                    closeMenuOnSelect={false}
                  />
                </Form.Group>
                <Form.Group controlId="adjustedCovariates" className="mb-3">
                  <Form.Label>Covariates</Form.Label>
                  <Select
                    placeholder="No covariates chosen"
                    name="adjustedCovariates"
                    value={formValues.adjustedCovariates}
                    onChange={(ev) =>
                      handleSelectChange("adjustedCovariates", ev)
                    }
                    defaultOptions
                    options={variables}
                    filterOption={filterVariable}
                    isMulti
                    closeMenuOnSelect={false}
                  />
                </Form.Group>
                <Form.Group controlId="strata" className="mb-3">
                  <Form.Label>Strata</Form.Label>
                  <Select
                    placeholder="No strata chosen"
                    name="strata"
                    value={formValues.strata}
                    onChange={(ev) => handleSelectChange("strata", ev)}
                    defaultOptions
                    options={variables}
                    filterOption={filterVariable}
                    isMulti
                    closeMenuOnSelect={false}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Where</Form.Label>

                  <InputGroup className="mb-3">
                    <Form.Select
                      name="filterVariable"
                      id="filterVariable"
                      onChange={handleChange}
                      aria-label="filterVariable">
                      <option value="" hidden>
                        No variable chosen
                      </option>
                      {integrityCheckResults.variables.map((v) => (
                        <option value={v}>{v}</option>
                      ))}
                    </Form.Select>
                    <Form.Select
                      name="filterOperator"
                      id="filterOperator"
                      onChange={handleChange}
                      aria-label="filterOperator"
                      style={{ maxWidth: "80px" }}>
                      <option>=</option>
                      <option>&lt;</option>
                      <option>&lt;=</option>
                      <option>&gt;</option>
                      <option>&gt;=</option>
                    </Form.Select>
                    <Form.Control
                      name="filterValue"
                      id="filterValue"
                      onChange={handleChange}
                      aria-label="filterValue"
                    />
                  </InputGroup>
                </Form.Group>
              </>
            )}

            <div className="text-end">
              <Button type="reset" variant="danger-outline" className="me-1">
                Reset
              </Button>

              <Button type="submit" variant="primary">
                Run Model
              </Button>
            </div>
          </Form>
        </>
      )}

      {/* <pre className="mt-4">{JSON.stringify(variables, null, 2)}</pre>
      <pre className="mt-4">{JSON.stringify(formValues, null, 2)}</pre> */}
    </>
  );
}
