import { useRef } from "react";
import { useRecoilState, useRecoilValue, useResetRecoilState } from "recoil";
import Select from "react-select";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ObjectList from "../common/object-list";
import { isNull, omitBy } from "lodash";
import { cohortsState, formValuesState, variablesState } from "./input-form.state";
import { integrityCheckResultsState } from "./analysis.state";

export default function InputForm({ onSubmitIntegrityCheck, onSubmitModel, onReset }) {
  const cohorts = useRecoilValue(cohortsState);
  const integrityCheckResults = useRecoilValue(integrityCheckResultsState);
  const variables = useRecoilValue(variablesState);
  const [formValues, setFormValues] = useRecoilState(formValuesState);
  const resetFormValues = useResetRecoilState(formValuesState);
  const mergeFormValues = (values) => setFormValues((oldFormValues) => ({ ...oldFormValues, ...values }));
  const inputFileRef = useRef(null);

  function handleChange(event) {
    let { name, value, type, files, checked } = event.target;

    if (type === "checkbox") {
      value = checked;
    }

    if (type === "file") {
      value = files && files.length ? files[0].name : null;
    }

    if (name === "selectedModelType") {
      mergeFormValues({ selectedModelName: null });
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
        selectedModelName: asValue(formValues.selectedModelName),
        options: getOptions(formValues.modelType, true),
        exposures: formValues.exposures.map(asValue),
        outcomes: formValues.outcomes.map(asValue),
        adjustedCovariates: formValues.adjustedCovariates.map(asValue),
        strata: formValues.strata.map(asValue),
        filters:
          formValues.filterVariable && formValues.filterOperator && formValues.filterValue
            ? [formValues.filterVariable, formValues.filterOperator, formValues.filterValue].join("")
            : null,
      });
    }
  }

  function reset(event) {
    event.preventDefault();
    resetFormValues();
    if (inputFileRef?.current) {
      inputFileRef.current.value = "";
    }
    if (typeof onReset === "function") {
      onReset();
    }
  }

  function filterVariable({ data }, value, limit = 100) {
    const { label, isMetabolite } = data;
    const showMetabolite = !isMetabolite || (isMetabolite && formValues.showMetabolites);
    if (!value || value.length < 2) {
      const belowLimit = variables.indexOf(data) < limit;
      return belowLimit && showMetabolite;
    } else {
      const includesValue = label.toLowerCase().includes(value.toLowerCase());
      return includesValue && showMetabolite;
    }
  }

  function getModelSpecifier(modelSpecifierName) {
    return integrityCheckResults?.modelSpecifiers?.find((spec) => spec?.name === modelSpecifierName);
  }

  function getOptions(modelSpecifierName, includeGlobalOptions = false) {
    const modelSpecifier = getModelSpecifier(modelSpecifierName);
    let options = modelSpecifier
      ? {
          "model": modelSpecifier.model,
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
      (value, key) => isNull(value) || options.hasOwnProperty(key),
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

    return <ObjectList obj={modelOptions} className="mb-1 text-start" />;
  }

  return (
    <>
      <Card className="shadow-sm mb-3 position-relative" style={{ minHeight: "100px" }}>
        <Card.Body>
          <Form onSubmit={submitIntegrityCheck} onReset={reset}>
            <h2 className="h5 text-primary mb-4">Perform Cohort-specific Analyses</h2>

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
                ref={inputFileRef}
                onChange={handleChange}
                disabled={integrityCheckResults?.id}
              />
              <Form.Text>
                <i className="bi bi-download me-1"></i>
                <a href="files/cometsInputAge.xlsx">Download Sample Input</a>
              </Form.Text>
            </Form.Group>

            <div className="text-end">
              <Button type="reset" variant="danger-outline" className="me-1" disabled={integrityCheckResults?.id}>
                Reset
              </Button>
              <Button type="submit" variant="primary" disabled={integrityCheckResults?.id || !formValues.inputFile}>
                Check Integrity
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {integrityCheckResults && !integrityCheckResults.errors && (
        <>
          <Card className="shadow-sm mb-3 position-relative" style={{ minHeight: "100px" }}>
            <Card.Body>
              <h2 className="h5 text-primary mb-4">Specify Method Of Analyses</h2>

              <Form onSubmit={submitModel} onReset={reset}>
                <Form.Group controlId="method" className="mb-3">
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
                  <>
                    <Form.Group controlId="email" className="mb-3">
                      <Form.Label className="required">Email</Form.Label>
                      <Form.Control type="email" name="email" onChange={handleChange} value={formValues.email} />
                    </Form.Group>

                    <div className="text-end">
                      <Button type="reset" variant="danger-outline" className="me-1">
                        Reset
                      </Button>

                      <Button type="submit" variant="primary" disabled={!formValues.email}>
                        Run Model
                      </Button>
                    </div>
                  </>
                )}

                {formValues.method === "selectedModel" && (
                  <>
                    <Form.Group controlId="selectedModelType" className="mb-3">
                      <Form.Label>
                        Model Type
                        {formValues.selectedModelType && (
                          <OverlayTrigger
                            overlay={
                              <Tooltip id="modelTypeTooltip">
                                <Form.Label>Model Options</Form.Label>
                                <ModelOptions modelSpecifierName={formValues.selectedModelType} />
                              </Tooltip>
                            }>
                            <i className="bi bi-info-circle ms-1"></i>
                          </OverlayTrigger>
                        )}
                      </Form.Label>
                      <Form.Select
                        name="selectedModelType"
                        onChange={handleChange}
                        value={formValues.selectedModelType}>
                        <option value="">All model types</option>
                        {integrityCheckResults.modelSpecifiers
                          .filter(
                            (specifier) =>
                              specifier.model &&
                              integrityCheckResults.models.find((m) => m.modelspec == specifier.name),
                          )
                          .map((specifier, i) => (
                            <option value={specifier.name} key={`selected-model-type-${i}`}>
                              {specifier.name}
                            </option>
                          ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group controlId="selectedModelName" className="mb-3">
                      <Form.Label className="required">Model Name</Form.Label>
                      <Select
                        placeholder="No model chosen"
                        name="selectedModelName"
                        value={formValues.selectedModelName}
                        onChange={(ev) => handleSelectChange("selectedModelName", ev)}
                        defaultOptions
                        options={integrityCheckResults.models
                          .filter((m) => !formValues.selectedModelType || formValues.selectedModelType == m.modelspec)
                          .map((m, i) => ({ value: m.model, label: m.model }))}
                      />

                      {/* <Form.Select
                        name="selectedModelName"
                        value={formValues.selectedModelName}
                        onChange={handleChange}>
                        <option value="" hidden>
                          No model chosen
                        </option>
                        {integrityCheckResults.models
                          .filter((m) => !formValues.selectedModelType || formValues.selectedModelType == m.modelspec)
                          .map((m, i) => (
                            <option value={m.model} key={i + m.model}>
                              {!formValues.selectedModelType && m.modelspec && `${m.modelspec} - `}
                              {m.model}
                            </option>
                          ))}
                      </Form.Select> */}
                    </Form.Group>

                    <div className="text-end">
                      <Button type="reset" variant="danger-outline" className="me-1">
                        Reset
                      </Button>

                      <Button type="submit" variant="primary" disabled={!formValues.selectedModelName}>
                        Run Model
                      </Button>
                    </div>
                  </>
                )}

                {formValues.method === "customModel" && (
                  <>
                    <Form.Group controlId="modelType" className="mb-3">
                      <Form.Label>
                        Model Type
                        {formValues.modelType && (
                          <OverlayTrigger
                            overlay={
                              <Tooltip id="modelTypeTooltip">
                                <Form.Label>Model Options</Form.Label>

                                <ModelOptions modelSpecifierName={formValues.modelType} />
                              </Tooltip>
                            }>
                            <i className="bi bi-info-circle ms-1"></i>
                          </OverlayTrigger>
                        )}
                      </Form.Label>
                      <Form.Select name="modelType" onChange={handleChange} value={formValues.modelType}>
                        <option value="" hidden>
                          No model type chosen
                        </option>
                        {integrityCheckResults.modelSpecifiers
                          .filter((specifier) => specifier.model)
                          .map((specifier, i) => (
                            <option value={specifier.name} key={`model-specifier-${i}`}>
                              {specifier.name}
                            </option>
                          ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group controlId="modelName" className="mb-3">
                      <Form.Label className="required">Model Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="modelName"
                        onChange={handleChange}
                        value={formValues.modelName}
                        placeholder="Enter model description"></Form.Control>
                    </Form.Group>
                  </>
                )}
              </Form>
            </Card.Body>
          </Card>

          {formValues.method === "customModel" && (
            <>
              <Card>
                <Card.Body>
                  <Form onSubmit={submitModel} onReset={reset}>
                    <h2 className="h5 text-primary mb-4">Specify Custom Model Parameters</h2>

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
                                This option applies to Exposures, Outcomes and Adjusted Covariates
                              </Tooltip>
                            }>
                            <i className="bi bi-info-circle ms-1"></i>
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
                      <Form.Label>Adjusted Covariates</Form.Label>
                      <Select
                        placeholder="No adjusted covariates chosen"
                        name="adjustedCovariates"
                        value={formValues.adjustedCovariates}
                        onChange={(ev) => handleSelectChange("adjustedCovariates", ev)}
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

                    <div className="text-end">
                      <Button type="reset" variant="danger-outline" className="me-1">
                        Reset
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!formValues.modelName || !formValues.exposures.length || !formValues.outcomes.length}>
                        Run Model
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </>
          )}
        </>
      )}

      {/* <pre className="mt-4">{JSON.stringify(variables, null, 2)}</pre>
      <pre className="mt-4">{JSON.stringify(formValues, null, 2)}</pre> */}
    </>
  );
}
