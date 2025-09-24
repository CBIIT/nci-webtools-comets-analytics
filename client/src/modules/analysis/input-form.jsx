import { useRef, useState } from "react";
import { useRecoilState, useRecoilValue, useResetRecoilState } from "recoil";
import Select from "react-select";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import ObjectList from "../common/object-list";
import { isNull, omitBy } from "lodash";
import { cohortsState, defaultCustomModelOptions, formValuesState, variablesState } from "./input-form.state";
import { integrityCheckResultsState } from "./analysis.state";

export default function InputForm({ onSubmitIntegrityCheck, onSubmitModel, onSubmitMetaAnalysis, onReset, onTabSelect }) {
  const [activeTab, setActiveTab] = useState("cohort-analysis");
  const cohorts = useRecoilValue(cohortsState);
  const integrityCheckResults = useRecoilValue(integrityCheckResultsState);
  const variables = useRecoilValue(variablesState);
  const [formValues, setFormValues] = useRecoilState(formValuesState);
  const resetFormValues = useResetRecoilState(formValuesState);
  const mergeFormValues = (values) => setFormValues((oldFormValues) => ({ ...oldFormValues, ...values }));
  const selectedModelType = getModelType(formValues.modelType);
  const nonMetaboliteVariables = variables.filter(
    (variable) => !variable.isMetabolite && variable.value !== "All metabolites"
  );
  const inputFileRef = useRef(null);
  const metaAnalysisFileRef = useRef(null);

  function handleChange(event) {
    let { name, value, type, files, checked } = event.target;

    if (type === "checkbox") {
      value = checked;
    }

    if (type === "file") {
      if (files && files.length) {
        // Handle multiple files - store file names as array or count
        if (files.length === 1) {
          value = files[0].name;
        } else if (files.length <= 100) {
          value = `${files.length} files selected`;
        } else {
          // Limit to 100 files
          event.target.value = '';
          alert('Maximum 100 files allowed. Please select fewer files.');
          return;
        }
      } else {
        value = null;
      }
    }

    if (name === "showPredefinedModelTypes") {
      mergeFormValues({
        selectedModelType: "",
        selectedModelName: null,
      });
    }

    if (name === "showCustomModelTypes") {
      mergeFormValues({
        modelType: "",
      });
    }

    if (name === "selectedModelType") {
      mergeFormValues({ selectedModelName: null, selectedModelNames: [] });
    }

    if (name === "modelType") {
      const options = getOptions(value);
      const modelName = [options.model, ...Object.values(options["model.options"])].filter(Boolean).join(" - ");
      mergeFormValues({
        ...defaultCustomModelOptions,
        modelName,
      });
    }

    // Validate multiple emails if it's the email field
    if (name === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails = value.split(';').map(email => email.trim());
      const invalidEmails = emails.filter(email => email && !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        // Store the value but mark it as having validation errors
        mergeFormValues({ 
          [name]: value,
          emailValidationError: `Invalid email format: ${invalidEmails.join('; ')}`
        });
        return;
      } else {
        // Clear any previous validation errors
        mergeFormValues({ 
          [name]: value,
          emailValidationError: null
        });
        return;
      }
    }

    mergeFormValues({ [name]: value });
  }

  function getFileCount(inputFileValue) {
    if (!inputFileValue) return 0;
    if (typeof inputFileValue === 'string') {
      // Check if it's the format "X files selected"
      const match = inputFileValue.match(/^(\d+) files selected$/);
      if (match) {
        return parseInt(match[1], 10);
      }
      // If it's a single file name, return 1
      return 1;
    }
    return 0;
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
      const asValue = (obj) => (obj ? obj.value : null);
      onSubmitModel({
        ...formValues,
        cohort: formValues.cohort === "Other/Undefined" ? formValues.customCohort : formValues.cohort,
        id: integrityCheckResults.id,
        selectedModelName: asValue(formValues.selectedModelName),
        options: getOptions(formValues.modelType, true),
        exposures: formValues.exposures.map(asValue).flat(),
        outcomes: formValues.outcomes.map(asValue).flat(),
        adjustedCovariates: formValues.adjustedCovariates.map(asValue).flat(),
        strata: formValues.strata.map(asValue).flat(),
        filters:
          formValues.filterVariable && formValues.filterOperator && formValues.filterValue
            ? [formValues.filterVariable, formValues.filterOperator, formValues.filterValue].join("")
            : null,
        time: asValue(formValues.time),
        group: asValue(formValues.group),
      });
    }
  }

  function submitMetaAnalysis(event) {
    event.preventDefault();
    if (onSubmitMetaAnalysis) {
      // Create FormData manually to avoid multipart parser issues with multiple files having the same field name
      const formData = new FormData();
      
      // Add email field
      const emailField = event.target.querySelector('input[name="email"]');
      if (emailField) {
        formData.append('email', emailField.value);
      }
      
      // Add files with unique field names to avoid Plumber multipart parser corruption
      const fileInput = event.target.querySelector('input[name="metaAnalysisFiles"]');
      if (fileInput && fileInput.files) {
        for (let i = 0; i < fileInput.files.length; i++) {
          // Use unique field names: metaAnalysisFile_1, metaAnalysisFile_2, etc.
          formData.append(`metaAnalysisFile_${i + 1}`, fileInput.files[i]);
        }
      }
      
      onSubmitMetaAnalysis(formData);
    }
  }

  function reset(event) {
    event.preventDefault();
    resetFormValues();
    if (inputFileRef?.current) {
      inputFileRef.current.value = "";
    }
    if (metaAnalysisFileRef?.current) {
      metaAnalysisFileRef.current.value = "";
    }
    if (typeof onReset === "function") {
      onReset();
    }
  }

  function handleTabSelect(key) {
    setActiveTab(key);
    if (onTabSelect) {
      onTabSelect(key);
    }
  }

  function resetMetaAnalysis(event) {
    // Reset only meta-analysis specific fields and stay on the same tab
    mergeFormValues({ 
      metaAnalysisFiles: null,
      email: "",
      emailValidationError: null
    });
    if (metaAnalysisFileRef?.current) {
      metaAnalysisFileRef.current.value = "";
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

  function getModelType(modelTypeName) {
    return integrityCheckResults?.modelTypes?.find((modelType) => modelType?.name === modelTypeName);
  }

  function getOptions(modelTypeName, includeGlobalOptions = false) {
    const modelSpecifier = getModelType(modelTypeName);
    let options =
      modelTypeName && modelSpecifier
        ? {
            "model": modelSpecifier.model,
            "model.options": modelSpecifier.modelOptions,
          }
        : {
            "model": "correlation",
            "model.options": {
              method: "pearson",
            },
          };

    if (includeGlobalOptions) {
      const modelChecksSpecifier = getModelType("ModelChecks") || {};
      const modelOutputSpecifier = getModelType("ModelOutput") || {};

      options = {
        ...options,
        ...modelChecksSpecifier?.modelOptions,
        ...modelOutputSpecifier?.modelOptions,
      };
    }

    // override global options if they are specified in the model type
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

  function ModelOptions({ modelTypeName }) {
    const modelSpecifier = getModelType(modelTypeName);
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
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabSelect}
            className="mb-4"
            id="analysis-tabs"
            variant="tabs"
          >
            <Tab eventKey="cohort-analysis" title="Cohort-Specific Analyses">
              <Form onSubmit={submitIntegrityCheck} onReset={reset}>
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

                {formValues.cohort === "Other/Undefined" && (
                  <Form.Group controlId="customCohort" className="mb-3">
                    <Form.Label className="required">Custom Cohort</Form.Label>
                    <Form.Control
                      type="text"
                      name="customCohort"
                      value={formValues.customCohort}
                      onChange={handleChange}
                      disabled={integrityCheckResults?.id}
                    />
                    <Form.Text>
                      If there are multiple datasets to be meta-analyzed from a single cohort, be sure to use a unique
                      custom name for each dataset
                    </Form.Text>
                  </Form.Group>
                )}

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
                    <a
                      href="files/cometsInputAge.xlsx"
                      onClick={(ev) =>
                        window.gtag("event", "download", {
                          event_category: "file",
                          event_label: "sample input",
                        })
                      }>
                      Download Sample Input
                    </a>
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
            </Tab>
            
            <Tab eventKey="meta-analysis" title="Meta-Analysis">
              <Form onSubmit={submitMetaAnalysis} onReset={reset}>
                <Form.Group controlId="metaAnalysisFiles" className="mb-3">
                  <Form.Label className="required">Input Data Files</Form.Label>
                  <Form.Control
                    type="file"
                    name="metaAnalysisFiles"
                    ref={metaAnalysisFileRef}
                    onChange={handleChange}
                    disabled={integrityCheckResults?.id}
                    multiple
                    accept=".xlsx,.xls,.csv"
                  />
                  <Form.Text className="d-block">
                    Select up to 100 files. Accepted formats: .xlsx, .xls, .csv
                  </Form.Text>
                  <Form.Text>
                    <i className="bi bi-download me-1"></i>
                    <a
                      href="files/meta_analysis_sample_files.zip"
                      onClick={(ev) =>
                        window.gtag("event", "download", {
                          event_category: "file",
                          event_label: "meta analysis sample inputs",
                        })
                      }>
                      Download Sample Inputs
                    </a>
                  </Form.Text>
                </Form.Group>
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label className="required">Email(s)</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="email" 
                    onChange={handleChange} 
                    value={formValues.email}
                    placeholder="Enter email addresses separated by semicolons"
                    isInvalid={!!formValues.emailValidationError}
                  />
                  {formValues.emailValidationError && (
                    <Form.Control.Feedback type="invalid">
                      {formValues.emailValidationError}
                    </Form.Control.Feedback>
                  )}
                  <Form.Text>
                    Enter one or more email addresses separated by semicolons (e.g., user1@example.com; user2@example.com)
                  </Form.Text>
                </Form.Group>

                <div className="text-end">
                  <Button type="button" variant="danger-outline" className="me-1" onClick={resetMetaAnalysis}>
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={getFileCount(formValues.metaAnalysisFiles) < 2 || !formValues.email || !!formValues.emailValidationError}>
                    Run {formValues.metaAnalysisFiles && `(${getFileCount(formValues.metaAnalysisFiles)} files)`}
                  </Button>
                </div>
              </Form>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {integrityCheckResults && !integrityCheckResults.errors && (
        <>
          <Card className="shadow-sm mb-3 position-relative" style={{ minHeight: "100px" }}>
            <Card.Body>
              <h2 className="h5 text-primary mb-4">Method of Analyses</h2>

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
                        Run Models
                      </Button>
                    </div>
                  </>
                )}

                {formValues.method === "selectedModel" && (
                  <>
                    <div className="border p-3 mb-3">
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="showPredefinedModelTypesTooltip">
                            <span>When checked, only models of the selected Model Type can be selected below.</span>
                          </Tooltip>
                        }>
                        <Form.Group controlId="showPredefinedModelTypes" className="d-inline-block">
                          <Form.Check
                            type="checkbox"
                            className="mb-3"
                            name="showPredefinedModelTypes"
                            label={
                              <>
                                Use Model Type<i className="bi bi-info-circle ms-1"></i>
                              </>
                            }
                            onChange={handleChange}
                            checked={formValues.showPredefinedModelTypes}
                          />
                        </Form.Group>
                      </OverlayTrigger>

                      {formValues.showPredefinedModelTypes && (
                        <Form.Group controlId="selectedModelType" className="mb-3">
                          <Form.Label>Model Type</Form.Label>
                          <Form.Select
                            name="selectedModelType"
                            onChange={handleChange}
                            value={formValues.selectedModelType}>
                            <option value="">All model types</option>
                            {integrityCheckResults.modelTypes
                              .filter(
                                (modelType) =>
                                  modelType.model &&
                                  integrityCheckResults.models.find((m) => m.model_type === modelType.name)
                              )
                              .map((modelType, i) => (
                                <option value={modelType.name} key={`selected-model-type-${i}`}>
                                  {modelType.name}
                                </option>
                              ))}
                          </Form.Select>
                          {formValues.selectedModelType && (
                            <Form.Text>
                              <OverlayTrigger
                                overlay={
                                  <Tooltip id="modelTypeTooltip">
                                    <Form.Label>Model Options</Form.Label>
                                    <ModelOptions modelTypeName={formValues.selectedModelType} />
                                  </Tooltip>
                                }>
                                <span>
                                  View Model Options <i className="bi bi-info-circle"></i>
                                </span>
                              </OverlayTrigger>
                            </Form.Text>
                          )}
                        </Form.Group>
                      )}

                      <Form.Group controlId="selectedModelName" className="mb-3">
                        <Form.Label className="required">Model</Form.Label>
                        <Select
                          placeholder="No model chosen"
                          name="selectedModelName"
                          value={formValues.selectedModelName}
                          onChange={(ev) => handleSelectChange("selectedModelName", ev)}
                          defaultOptions
                          options={integrityCheckResults.models
                            .filter(
                              (m) => !formValues.selectedModelType || formValues.selectedModelType === m.model_type
                            )
                            .map((m, i) => ({
                              value: m.model,
                              label: !formValues.showPredefinedModelTypes ? m.model : `${m.model_type} - ${m.model}`,
                            }))}
                        />
                      </Form.Group>
                    </div>

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
                  <div className="border p-3 mb-3">
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="showCustomModelTypesTooltip">
                          <span>When checked, Model Type will be used to run model.</span>
                        </Tooltip>
                      }>
                      <Form.Group controlId="showCustomModelTypes" className="d-inline-block">
                        <Form.Check
                          type="checkbox"
                          className="mb-3"
                          name="showCustomModelTypes"
                          label={
                            <>
                              Use Model Type<i className="bi bi-info-circle ms-1"></i>
                            </>
                          }
                          onChange={handleChange}
                          checked={formValues.showCustomModelTypes}
                        />
                      </Form.Group>
                    </OverlayTrigger>

                    {formValues.showCustomModelTypes && (
                      <Form.Group controlId="modelType" className="mb-3">
                        <Form.Label>Model Type</Form.Label>
                        <Form.Select name="modelType" onChange={handleChange} value={formValues.modelType}>
                          <option value="">None - Use default Pearson correlation model</option>
                          {integrityCheckResults.modelTypes
                            .filter((modelType) => modelType.model)
                            .map((modelType, i) => (
                              <option value={modelType.name} key={`model-type-${i}`}>
                                {modelType.name}
                              </option>
                            ))}
                        </Form.Select>
                        {formValues.modelType && (
                          <Form.Text>
                            <OverlayTrigger
                              overlay={
                                <Tooltip id="modelTypeTooltip">
                                  <Form.Label>Model Options</Form.Label>
                                  <ModelOptions modelTypeName={formValues.modelType} />
                                </Tooltip>
                              }>
                              <span>
                                View Model Options <i className="bi bi-info-circle"></i>
                              </span>
                            </OverlayTrigger>
                          </Form.Text>
                        )}
                      </Form.Group>
                    )}

                    <Form.Group controlId="modelName" className="mb-3">
                      <Form.Label className="required">Model Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="modelName"
                        onChange={handleChange}
                        value={formValues.modelName}
                        placeholder="Enter model description"></Form.Control>
                    </Form.Group>
                  </div>
                )}

                {formValues.method === "metaAnalysis" && (
                  <>
                    <div className="border p-3 mb-3">
                      <Form.Group controlId="selectedModelType" className="mb-3">
                        <Form.Label className="required">Model Type</Form.Label>
                        <Form.Select
                          name="selectedModelType"
                          onChange={handleChange}
                          value={formValues.selectedModelType}
                          required>
                          <option value="" hidden>
                            Select model type
                          </option>
                          {integrityCheckResults.modelTypes
                            .filter(
                              (modelType) =>
                                modelType.model &&
                                integrityCheckResults.models.find((m) => m.model_type === modelType.name)
                            )
                            .map((modelType, i) => (
                              <option value={modelType.name} key={`selected-model-type-${i}`}>
                                {modelType.name}
                              </option>
                            ))}
                        </Form.Select>
                      </Form.Group>

                      <Form.Group controlId="selectedModelNames" className="mb-3">
                        <Form.Label className="required">Models</Form.Label>
                        <Select
                          isMulti
                          placeholder="No models chosen"
                          name="selectedModelNames"
                          value={formValues.selectedModelNames}
                          onChange={(ev) => handleSelectChange("selectedModelNames", ev)}
                          defaultOptions
                          options={integrityCheckResults.models
                            .filter(
                              (m) => !formValues.selectedModelType || formValues.selectedModelType === m.model_type
                            )
                            .map((m, i) => ({
                              value: m.model,
                              label: !formValues.showPredefinedModelTypes ? m.model : `${m.model_type} - ${m.model}`,
                            }))}
                        />
                      </Form.Group>

                      <Form.Group controlId="email" className="mb-3">
                        <Form.Label className="required">Email(s)</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="email" 
                          onChange={handleChange} 
                          value={formValues.email}
                          placeholder="Enter email addresses separated by semicolons"
                          isInvalid={!!formValues.emailValidationError}
                        />
                        {formValues.emailValidationError && (
                          <Form.Control.Feedback type="invalid">
                            {formValues.emailValidationError}
                          </Form.Control.Feedback>
                        )}
                        <Form.Text>
                          Enter one or more email addresses separated by semicolons (e.g., user1@example.com; user2@example.com)
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="text-end">
                      <Button type="reset" variant="danger-outline" className="me-1">
                        Reset
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          formValues.selectedModelNames?.length <= 1 || 
                          !formValues.selectedModelType || 
                          !formValues.email || 
                          !!formValues.emailValidationError
                        }>
                        Run Meta-Analysis
                      </Button>
                    </div>
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
                    <h2 className="h5 text-primary mb-4">Custom Model Parameters</h2>

                    <OverlayTrigger
                      overlay={
                        <Tooltip id="showMetabolitesTooltip">
                          This option applies to Exposures, Outcomes and Adjusted Covariates
                        </Tooltip>
                      }>
                      <Form.Group controlId="showMetabolites" className="d-inline-block">
                        <Form.Check
                          type="checkbox"
                          className="mb-3"
                          name="showMetabolites"
                          label={
                            <>
                              Show Individual Metabolites<i className="bi bi-info-circle ms-1"></i>
                            </>
                          }
                          onChange={handleChange}
                          checked={formValues.showMetabolites}
                        />
                      </Form.Group>
                    </OverlayTrigger>

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
                        // closeMenuOnSelect={false}
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
                        // closeMenuOnSelect={false}
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
                        // closeMenuOnSelect={false}
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
                        // closeMenuOnSelect={false}
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
                            <option value={v} key={`variable-${v}`}>
                              {v}
                            </option>
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

                    {selectedModelType?.model === "coxph" && (
                      <Form.Group controlId="time" className="mb-3">
                        <Form.Label>Time</Form.Label>
                        <Select
                          placeholder="No time variable chosen"
                          name="time"
                          value={formValues.time}
                          onChange={(ev) => handleSelectChange("time", ev)}
                          options={nonMetaboliteVariables}
                          // closeMenuOnSelect={true}
                          isClearable
                        />
                      </Form.Group>
                    )}

                    {selectedModelType?.model === "clogit" && (
                      <Form.Group controlId="group" className="mb-3">
                        <Form.Label>Group</Form.Label>
                        <Select
                          placeholder="No group variable chosen"
                          name="group"
                          value={formValues.group}
                          onChange={(ev) => handleSelectChange("group", ev)}
                          options={nonMetaboliteVariables}
                          // closeMenuOnSelect={true}
                          isClearable
                        />
                      </Form.Group>
                    )}

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
