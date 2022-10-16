import { useEffect, useCallback } from "react";
import { useRecoilState } from "recoil";
import { cloneDeep, uniq, map } from "lodash";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import InputGroup from "react-bootstrap/InputGroup";
import Plot from "../../common/plot";
import { defaultHeatmapOptions, heatmapOptionsState } from "./heatmap-results.state";
import { getHeatmapPlot, getHeatmapDendrogramPlot } from "./heatmap-results.utils";
export default function HeatmapResults({ results }) {
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(heatmapOptionsState);
  const mergeHeatmapOptions = useCallback(
    (value) => setHeatmapOptions({ ...heatmapOptions, ...value }),
    [heatmapOptions, setHeatmapOptions]
  );

  const { xKey } = heatmapOptions;
  const records = cloneDeep(results?.Effects) || [];
  const xCategories = uniq(map(records, xKey));
  const xCategoriesSorted = cloneDeep(xCategories).sort();

  const heatmapPlot = getHeatmapPlot(results, heatmapOptions, results?.options);
  const heatmapDendrogramPlot = getHeatmapDendrogramPlot(results, heatmapOptions, results?.options);
  const selectedHeatmapPlot = heatmapOptions.showDendrogram ? heatmapDendrogramPlot : heatmapPlot;

  function handleChange(event) {
    let { name, value, type, checked } = event.target;
    if (type === "checkbox") value = checked;
    mergeHeatmapOptions({ [name]: value });
  }

  return !results || results.error || results.queue ? null : (
    <>
      <Form>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortRow">
              <Form.Label>Sort Strata By</Form.Label>
              <Form.Select
                name="sortRow"
                value={heatmapOptions.sortRow}
                onChange={handleChange}
                disabled={heatmapOptions.showDendrogram}>
                <option>All participants (no stratification)</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortColumn">
              <Form.Label>Sort Outcomes By</Form.Label>
              <Form.Select
                name="sortColumn"
                value={heatmapOptions.sortColumn}
                onChange={handleChange}
                disabled={heatmapOptions.showDendrogram}>
                {xCategoriesSorted.map((label) => (
                  <option value={label} key={label}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="pValueRange">
              <Form.Label>P-value</Form.Label>

              <InputGroup>
                <Form.Control
                  type="number"
                  placeholder="Min"
                  aria-label="Minp-value"
                  name="pValueMin"
                  value={heatmapOptions.pValueMin}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="1"
                />
                <InputGroup.Text>-</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Max"
                  aria-label="Max p-value"
                  name="pValueMax"
                  value={heatmapOptions.pValueMax}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="1"
                />
              </InputGroup>
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
            label={
              <>
                Show Hierarchical Clustering
                <OverlayTrigger
                  overlay={<Tooltip id="showMetabolitesTooltip">Requires at least 2 exposures and outcomes</Tooltip>}>
                  <i className="bi bi-info-circle ms-1" />
                </OverlayTrigger>
              </>
            }
          />
        </Form.Group>
      </Form>

      <Plot {...selectedHeatmapPlot} useResizeHandler className="w-100" style={{ height: "800px" }} />
    </>
  );
}
