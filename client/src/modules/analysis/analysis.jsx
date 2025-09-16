import { Suspense, useState } from "react";
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
import { useRecoilState, useRecoilValue, useResetRecoilState } from "recoil";
import { integrityCheckResultsState, modelResultsState, loadingState, activeResultsTabState } from "./analysis.state";
import { formValuesState } from "./input-form.state";
import { heatmapOptionsState } from "./results/heatmap-results.state";

export default function Analysis() {
  const formValues = useRecoilValue(formValuesState);
  const [loading, setLoading] = useRecoilState(loadingState);
  const [integrityCheckResults, setIntegrityCheckResults] = useRecoilState(integrityCheckResultsState);
  const [modelResults, setModelResults] = useRecoilState(modelResultsState);
  const [activeResultsTab, setActiveResultsTab] = useRecoilState(activeResultsTabState);
  const [isMetaAnalysisMode, setIsMetaAnalysisMode] = useState(false);
  const resetHeatmapOptions = useResetRecoilState(heatmapOptionsState);

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
      resetHeatmapOptions();
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

  function handleTabSelect(tabKey) {
    // Set meta-analysis mode when Meta-Analysis tab is selected
    setIsMetaAnalysisMode(tabKey === 'meta-analysis');
  }

  function handleReset() {
    setIntegrityCheckResults(null);
    setModelResults(null);
    setIsMetaAnalysisMode(false);
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
                  onSubmitIntegrityCheck={handleSubmitIntegrityCheck}
                  onSubmitModel={handleSubmitModel}
                  onSubmitMetaAnalysis={handleSubmitMetaAnalysis}
                  onReset={handleReset}
                  onTabSelect={handleTabSelect}
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
