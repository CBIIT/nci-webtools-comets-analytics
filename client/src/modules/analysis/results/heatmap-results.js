
import uniq from "lodash/uniq";
import clone from "lodash/clone";
import map from "lodash/map";
import Plot from "react-plotly.js";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { groupBy } from "lodash";
import { useRecoilState } from "recoil";
import { heatmapOptionsState } from "../analysis.state";
export default function HeatmapResults({ results }) {
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(heatmapOptionsState)
  const mergeHeatmapOptions = (value) => setHeatmapOptions({ ...heatmapOptions, ...value });

  const { xKey, yKey, zKey, sortColumn, sortRow } = heatmapOptions;

  const records = clone(results?.Effects) || [];
  const heatmap = records.reduce((acc, record) => {
    acc[record.yKey] = {
      ...acc[record.yKey],
      [record.xKey]: record
    };
    acc[record.yKey][record.xKey] = acc[record.yKey] || {};

  }, {});

  const xCategories = uniq(map(records, xKey));
  const recordsGroupedByY = groupBy(records, yKey);
  const xCategoriesSorted = clone(xCategories).sort();
  const matchesSortColumn = record => record[xKey] === (sortColumn || xCategories[0]);
  const yCategoriesSorted = Object.entries(recordsGroupedByY).sort((a, b) => {
    const recordA = a[1].find(matchesSortColumn);
    const recordB = b[1].find(matchesSortColumn);
    return recordA && recordB ? recordA[zKey] - recordB[zKey] : 0
  }).map(([key]) => key);

  const values = yCategoriesSorted.map(y => xCategoriesSorted.map(x =>
    records.find(e => e[xKey] === x && e[yKey] === y)[zKey]
  ));

  const heatmapPlot = {
    data: [
      {
        x: xCategoriesSorted,
        y: yCategoriesSorted,
        z: values,
        type: 'heatmap',
      }
    ],
    layout: {
      xaxis: {
        automargin: true,
      },
      yaxis: {
        automargin: true,
      },
    }
  }

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
              <Form.Select name="sortRow" value={heatmapOptions.sortRow} onChange={handleChange}>
                <option>All participants (no stratification)</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortColumn">
              <Form.Label>Sort Outcomes By</Form.Label>
              <Form.Select name="sortColumn" value={heatmapOptions.sortColumn} onChange={handleChange}>
                {xCategoriesSorted.map(label => <option value={label} key={label}>{label}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

        </Row>

        <Form.Group className="mb-1" controlId="showAnnotations">
          <Form.Check type="checkbox" name="showAnnotations" checked={heatmapOptions.showAnnotations} onChange={handleChange} label="Show Annotations" />
        </Form.Group>

        <Form.Group className="mb-1" controlId="showDendrogram">
          <Form.Check type="checkbox" name="showDendrogram" checked={heatmapOptions.showDendrogram} onChange={handleChange} 
            label={<>
              Show Hierarchical Clustering
              <OverlayTrigger
                overlay={
                  <Tooltip id="showMetabolitesTooltip">
                    Requires at least 2 exposures and outcomes
                  </Tooltip>
                }>
                <i class="bi bi-info-circle ms-1"></i>
              </OverlayTrigger>                  
            </>} />
        </Form.Group>

      </Form>
      <Plot {...heatmapPlot} useResizeHandler className="w-100" style={{ height: '800px' }} />
    </>
  )
}
