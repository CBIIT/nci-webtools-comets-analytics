import { Suspense } from "react";
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
import {
  getIntegrityCheckResults,
  getModelResults,
} from "../../services/query";
import { useRecoilState, useRecoilValue, useResetRecoilState } from "recoil";
import {
  integrityCheckResultsState,
  modelResultsState,
  loadingState,
  activeResultsTabState,
  formValuesState,
  heatmapOptionsState,
} from "./analysis.state";

export default function Analysis() {
  const formValues = useRecoilValue(formValuesState);
  const [loading, setLoading] = useRecoilState(loadingState);
  const [integrityCheckResults, setIntegrityCheckResults] = useRecoilState(
    integrityCheckResultsState
  );
  const [modelResults, setModelResults] = useRecoilState(modelResultsState);
  const [activeResultsTab, setActiveResultsTab] = useRecoilState(
    activeResultsTabState
  );
  const resetHeatmapOptions = useResetRecoilState(heatmapOptionsState);
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(
    heatmapOptionsState
  );
  const mergeHeatmapOptions = (obj) =>
    setHeatmapOptions({ ...heatmapOptions, ...obj });

  async function handleSubmitIntegrityCheck(params) {
    try {
      setLoading(true);
      const results = await getIntegrityCheckResults(params);
      setActiveResultsTab("integrityCheckResults");
      setIntegrityCheckResults(results);
      console.log(results);
    } catch (e) {
      console.error("handleSubmitIntegrityCheck", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitModel(params) {
    try {
      setLoading(true);
      resetHeatmapOptions();
      const results = await getModelResults(params);

      setActiveResultsTab("modelResults");
      setModelResults(results);

      const isCorrelation = results?.options?.model === "correlation";
      mergeHeatmapOptions({
        zKey: isCorrelation ? "corr" : "estimate",
      });
    } catch (e) {
      setModelResults(e);
      console.error("handleSubmitModel", e);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setIntegrityCheckResults(null);
    setModelResults(null);
  }

  function handleSelectTab(key) {
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
                  An internal error prevented the input form from loading.
                  Please contact the website administrator if this problem
                  persists.
                </Alert>
              }>
              <Suspense fallback={<Loader>Loading Form</Loader>}>
                <InputForm
                  onSubmitIntegrityCheck={handleSubmitIntegrityCheck}
                  onSubmitModel={handleSubmitModel}
                  onReset={handleReset}
                />
              </Suspense>
            </ErrorBoundary>
          </Col>
          <Col md={8}>
            <Tab.Container
              id="results-tabs"
              activeKey={activeResultsTab}
              onSelect={handleSelectTab}>
              <Card className="shadow-sm mb-3" style={{ minHeight: "400px" }}>
                <Card.Header>
                  <Nav variant="tabs">
                    <Nav.Item>
                      <Nav.Link eventKey="integrityCheckResults">
                        Integrity Check
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link
                        eventKey="modelResults"
                        disabled={!modelResults}>
                        Results
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="heatmap" disabled={!modelResults}>
                        Heatmap
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Header>
                <Card.Body>
                  <Tab.Content>
                    <Tab.Pane eventKey="integrityCheckResults">
                      <IntegrityCheckResults results={integrityCheckResults} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="modelResults">
                      <ModelResults results={modelResults} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="heatmap">
                      <HeatmapResults
                        results={modelResults}
                        formValues={formValues}
                      />
                    </Tab.Pane>
                  </Tab.Content>
                </Card.Body>
              </Card>
            </Tab.Container>
          </Col>
        </Row>
      </Container>
    </>
  );
}
