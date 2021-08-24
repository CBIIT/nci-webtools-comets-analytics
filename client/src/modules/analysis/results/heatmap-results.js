import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Plot from "../../common/plot";
import { useRecoilState } from "recoil";
import { groupBy, pick, cloneDeep, chunk, uniq, map } from "lodash";
import { heatmapOptionsState } from "../analysis.state";
import { getHeatmapPlot, getHeatmapDendrogramPlot } from "./heatmap-results.utils";
export default function HeatmapResults({ results }) {
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(heatmapOptionsState);
  const mergeHeatmapOptions = (value) => setHeatmapOptions({ ...heatmapOptions, ...value });

  const { xKey } = heatmapOptions;
  const records = cloneDeep(results?.Effects) || [];
  const xCategories = uniq(map(records, xKey));
  const xCategoriesSorted = cloneDeep(xCategories).sort();

  const heatmapPlot = getHeatmapPlot(results, heatmapOptions);
  const heatmapDendrogramPlot = getHeatmapDendrogramPlot(results, heatmapOptions);
  const selectedHeatmapPlot = heatmapOptions.showDendrogram ? heatmapDendrogramPlot : heatmapPlot;

  function handleChange(event) {
    let { name, value, type, checked } = event.target;
    if (type === 'checkbox')
      value = checked;
    mergeHeatmapOptions({ [name]: value });
  }

  return !results ? null : (
    <>
      <Form>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortRow">
              <Form.Label>Sort Strata By</Form.Label>
              <Form.Select name="sortRow" value={heatmapOptions.sortRow} onChange={handleChange} disabled={heatmapOptions.showDendrogram}>
                <option>All participants (no stratification)</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortColumn">
              <Form.Label>Sort Outcomes By</Form.Label>
              <Form.Select name="sortColumn" value={heatmapOptions.sortColumn} onChange={handleChange} disabled={heatmapOptions.showDendrogram}>
                {xCategoriesSorted.map(label => <option value={label} key={label}>{label}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

        </Row>

        <Form.Group className="mb-1" controlId="showAnnotations">
          <Form.Check
            type="checkbox"
            name="showAnnotations"
            checked={heatmapOptions.showAnnotations}
            onChange={handleChange}
            label="Show Annotations"
          />
        </Form.Group>

        <Form.Group className="mb-1" controlId="showDendrogram">
          <Form.Check
            type="checkbox"
            name="showDendrogram"
            checked={heatmapOptions.showDendrogram}
            onChange={handleChange}
            disabled={!results.heatmap.dendrogram}
            label={<>
              Show Hierarchical Clustering
              <OverlayTrigger
                overlay={
                  <Tooltip id="showMetabolitesTooltip">
                    Requires at least 2 exposures and outcomes
                  </Tooltip>
                }>
                <i className="bi bi-info-circle ms-1" />
              </OverlayTrigger>
            </>} />
        </Form.Group>
      </Form>

      <Plot
        {...selectedHeatmapPlot}
        useResizeHandler
        className="w-100"
        style={{ height: '800px' }}
      />
    </>
  )
}
