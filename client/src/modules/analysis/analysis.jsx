import { Suspense, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import Alert from "react-bootstrap/Alert";
import Loader from "../common/loader";
import ErrorBoundary from "../common/error-boundary";
import InputForm from "./input-form";
import ModelResults from "./results/model-results";
import HeatmapResults from "./results/heatmap-results";
import IntegrityCheckResults from "./results/integrity-check-results";
import { getIntegrityCheckResults, getModelResults, getMetaAnalysisResults } from "../../services/query";
import { useRecoilState, useRecoilValue } from "recoil";
import { integrityCheckResultsState, modelResultsState, loadingState, activeResultsTabState } from "./analysis.state";
import { defaultFormValues, formValuesState } from "./input-form.state";
import { defaultHeatmapOptions, heatmapOptionsState } from "./results/heatmap-results.state";

function cloneState(value) {
  if (value == null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function createDefaultSnapshot(tabName) {
  return {
    formValues: cloneState(defaultFormValues),
    integrityCheckResults: null,
    modelResults: null,
    activeResultsTab: tabName === "meta-analysis" ? "modelResults" : "integrityCheckResults",
    heatmapOptions: cloneState(defaultHeatmapOptions),
  };
}

export default function Analysis({ initialTab = "cohort-analysis" }) {
  const [formValues, setFormValues] = useRecoilState(formValuesState);
  const [loading, setLoading] = useRecoilState(loadingState);
  const [integrityCheckResults, setIntegrityCheckResults] = useRecoilState(integrityCheckResultsState);
  const [modelResults, setModelResults] = useRecoilState(modelResultsState);
  const [activeResultsTab, setActiveResultsTab] = useRecoilState(activeResultsTabState);
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(heatmapOptionsState);
  const isMetaAnalysisMode = initialTab === "meta-analysis";
  const previousTabRef = useRef(initialTab);
  const hasInitializedSnapshotRef = useRef(false);
  const snapshotsRef = useRef({
    "cohort-analysis": createDefaultSnapshot("cohort-analysis"),
    "meta-analysis": createDefaultSnapshot("meta-analysis"),
  });

  useEffect(() => {
    if (!hasInitializedSnapshotRef.current) {
      const initialSnapshot = snapshotsRef.current[initialTab] || createDefaultSnapshot(initialTab);

      setFormValues(cloneState(initialSnapshot.formValues));
      setIntegrityCheckResults(cloneState(initialSnapshot.integrityCheckResults));
      setModelResults(cloneState(initialSnapshot.modelResults));
      setHeatmapOptions(cloneState(initialSnapshot.heatmapOptions));
      setActiveResultsTab(initialSnapshot.activeResultsTab);

      previousTabRef.current = initialTab;
      hasInitializedSnapshotRef.current = true;
      return;
    }

    const previousTab = previousTabRef.current;

    if (previousTab === initialTab) {
      return;
    }

    snapshotsRef.current[previousTab] = {
      formValues: cloneState(formValues),
      integrityCheckResults: cloneState(integrityCheckResults),
      modelResults: cloneState(modelResults),
      activeResultsTab,
      heatmapOptions: cloneState(heatmapOptions),
    };

    const nextSnapshot = snapshotsRef.current[initialTab] || createDefaultSnapshot(initialTab);

    setFormValues(cloneState(nextSnapshot.formValues));
    setIntegrityCheckResults(cloneState(nextSnapshot.integrityCheckResults));
    setModelResults(cloneState(nextSnapshot.modelResults));
    setHeatmapOptions(cloneState(nextSnapshot.heatmapOptions));
    setActiveResultsTab(nextSnapshot.activeResultsTab);

    previousTabRef.current = initialTab;
  }, [
    activeResultsTab,
    formValues,
    heatmapOptions,
    initialTab,
    integrityCheckResults,
    modelResults,
    setActiveResultsTab,
    setFormValues,
    setHeatmapOptions,
    setIntegrityCheckResults,
    setModelResults,
  ]);

  async function handleSubmitIntegrityCheck(params) {
    try {
      setLoading(true);
      setIntegrityCheckResults(await getIntegrityCheckResults(params));
      window.gtag("event", "select", {
        event_category: "cohort",
        event_label: params.get("cohort"),
      });
    } catch (error) {
      setIntegrityCheckResults({
        errors: String(error),
      });
      console.error("handleSubmitIntegrityCheck", error);
    } finally {
      setLoading(false);
      setActiveResultsTab("integrityCheckResults");
    }
  }

  async function handleSubmitModel(params) {
    try {
      setLoading(true);
      setHeatmapOptions(cloneState(defaultHeatmapOptions));
      setModelResults(await getModelResults(params));

      const modelLabel =
        {
          allModels: "all",
          selectedModel: params.selectedModelName,
          customModel: params.modelName,
          metaAnalysis: "Meta-Analysis",
        }[params.method] || "custom";

      window.gtag("event", "run", {
        event_category: "model",
        event_label: modelLabel,
      });
    } catch (error) {
      setModelResults({
        error: error.message || String(error),
      });
      console.error("handleSubmitModel", error);
    } finally {
      setLoading(false);
      setActiveResultsTab("modelResults");
    }
  }

    async function handleSubmitMetaAnalysis(formData) {
    try {
      setLoading(true);
      const results = await getMetaAnalysisResults(formData);
      setModelResults(results);
      setActiveResultsTab("modelResults");
    } catch (error) {
      setModelResults({
        errors: String(error),
      });
      console.error("handleSubmitMetaAnalysis", error);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setIntegrityCheckResults(null);
    setModelResults(null);
  }

  function handleSelectTab(key) {
    // reflow responsive plots
    setTimeout(() => window.dispatchEvent(new Event("resize")), 10);
    setActiveResultsTab(key);
  }

  return (
    <>
      {loading && <Loader fullscreen>Loading</Loader>}
      <Container className="my-3">
        <div className="mb-3 p-3 border rounded bg-light">
          {isMetaAnalysisMode ? (
            <>
              <h2 className="h5 text-primary mb-2">Meta-Analysis</h2>
              <p className="mb-0">Introduction - TBD</p>
            </>
          ) : (
            <>
              <h2 className="h5 text-primary mb-2">Single Cohort Analysis</h2>
              <p className="mb-0">Introduction - TBD</p>
            </>
          )}
        </div>
        <Row>
          <Col md={4}>
            <ErrorBoundary
              fallback={
                <Alert variant="danger">
                  An internal error prevented the input form from loading. Please contact the website administrator if
                  this problem persists.
                </Alert>
              }>
              <Suspense fallback={<Loader>Loading Form</Loader>}>
                <InputForm
                  initialTab={initialTab}
                  onSubmitIntegrityCheck={handleSubmitIntegrityCheck}
                  onSubmitModel={handleSubmitModel}
                  onSubmitMetaAnalysis={handleSubmitMetaAnalysis}
                  onReset={handleReset}
                />
              </Suspense>
            </ErrorBoundary>
          </Col>
          <Col md={8}>
            <ErrorBoundary
              fallback={
                <Alert variant="danger">
                  An internal error prevented the results panel from loading. Please contact the website administrator if
                  this problem persists.
                </Alert>
              }>
              <Tab.Container id="results-tabs" activeKey={activeResultsTab} onSelect={handleSelectTab}>
                <Card className="shadow-sm mb-3" style={{ minHeight: "400px" }}>
                  <Card.Header>
                    <Nav variant="tabs">
                      {!isMetaAnalysisMode && (
                        <Nav.Item>
                          <Nav.Link eventKey="integrityCheckResults">Integrity Check</Nav.Link>
                        </Nav.Item>
                      )}
                      <Nav.Item>
                        <Nav.Link eventKey="modelResults" disabled={!modelResults}>
                          Results
                        </Nav.Link>
                      </Nav.Item>
                      {!isMetaAnalysisMode && (
                        <Nav.Item>
                          <Nav.Link eventKey="heatmap" disabled={!modelResults}>
                            Heatmap
                          </Nav.Link>
                        </Nav.Item>
                      )}
                    </Nav>
                  </Card.Header>
                  <Card.Body>
                    <Tab.Content>
                      {!isMetaAnalysisMode && (
                        <Tab.Pane eventKey="integrityCheckResults">
                          <ErrorBoundary fallback={<Alert variant="danger">Error loading integrity check results.</Alert>}>
                            <IntegrityCheckResults results={integrityCheckResults} />
                          </ErrorBoundary>
                        </Tab.Pane>
                      )}
                      <Tab.Pane eventKey="modelResults">
                        <ErrorBoundary fallback={<Alert variant="danger">Error loading model results.</Alert>}>
                          <ModelResults results={modelResults} />
                        </ErrorBoundary>
                      </Tab.Pane>
                      {!isMetaAnalysisMode && (
                        <Tab.Pane eventKey="heatmap">
                          <ErrorBoundary fallback={<Alert variant="danger">Error loading heatmap results.</Alert>}>
                            <HeatmapResults results={modelResults} formValues={formValues} />
                          </ErrorBoundary>
                        </Tab.Pane>
                      )}
                    </Tab.Content>
                  </Card.Body>
                </Card>
              </Tab.Container>
            </ErrorBoundary>
          </Col>
        </Row>
      </Container>
    </>
  );
}

Analysis.propTypes = {
  initialTab: PropTypes.oneOf(["cohort-analysis", "meta-analysis"]),
};
