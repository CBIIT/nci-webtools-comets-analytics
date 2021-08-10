import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Plot from "../../common/plot";
import { groupBy, pick, cloneDeep, chunk, uniq, map } from "lodash";
import { useRecoilState } from "recoil";
import { heatmapOptionsState } from "../analysis.state";
export default function HeatmapResults({ results }) {
  const [heatmapOptions, setHeatmapOptions] = useRecoilState(heatmapOptionsState);
  const mergeHeatmapOptions = (value) => setHeatmapOptions({ ...heatmapOptions, ...value });

  const { xKey, yKey, zKey, sortColumn, sortRow } = heatmapOptions;
  const sample = (values, interval) => chunk(values, Math.floor(values?.length / interval) || 1).map(e => e[0]);
  const defaultInterval = 40;

  const records = cloneDeep(results?.Effects) || [];
  const xCategories = uniq(map(records, xKey));
  const recordsGroupedByY = groupBy(records, yKey);
  const xCategoriesSorted = cloneDeep(xCategories).sort();
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
      },
    ],
    layout: {
      annotations: heatmapOptions.showAnnotations ? records.map(r => ({
        x: r[xKey],
        y: r[yKey],
        text: r[zKey],
        xref: 'x',
        yref: 'y',
        showarrow: false,
      })) : [],
      xaxis: {
        automargin: true,
      },
      yaxis: {
        automargin: true,
      },
    }
  };

  const hcluster = cloneDeep(results?.plotlyDendrogram);
  const hclusterLayoutProps =  [
    "anchor",
    "automargin",
    "autorange",
    "domain",
    "range",
    "categoryarray",
    "categoryorder",
    "showgrid",
    "showline",
    "showticklabels",
    "tickcolor",
    "ticklen",
    "tickmode",
    "ticks",
    "tickwidth",
    "type",
  ];
  const hclusterHeatmapTrace = hcluster?.data.find(t => t.type === 'heatmap');
  let hclusterAnnotations = [];
  
  if (hclusterHeatmapTrace) {
    for (let y = 0; y < hclusterHeatmapTrace.y.length; y ++) {
      for (let x = 0; x < hclusterHeatmapTrace.x.length; x ++) {
        hclusterAnnotations.push({
          x: hclusterHeatmapTrace.x[x],
          y: hclusterHeatmapTrace.y[y],
          text: hclusterHeatmapTrace.z[y][x],
          xref: 'x',
          yref: 'y2',
          showarrow: false,
        })
      }
    }
  }

  const hclusterPlot = hcluster ? {
    data: hcluster.data.map(t => {
      const props = pick(t, ['x', 'y', 'z', 'type', 'mode', 'text', 'hoverinfo', 'xaxis', 'yaxis'])

      if (t.type === 'scatter' && t.x && t.x.length >= 2) {
        return {
          ...props,
          showlegend: false,
        }
      }

      else if (t.type === 'heatmap') {
        return props;
      }

      return null;
    }).filter(Boolean),
    layout: {
      annotations: heatmapOptions.showAnnotations ? hclusterAnnotations : [],
      margin: hcluster.layout.margin,
      xaxis: {
        ...pick(hcluster.layout.xaxis, hclusterLayoutProps),
        tickvals: sample(hcluster.layout.xaxis.tickvals, defaultInterval),
        ticktext: sample(hcluster.layout.xaxis.ticktext, defaultInterval),
      },
      xaxis2: {
        ...pick(hcluster.layout.xaxis2, hclusterLayoutProps)
      },
      yaxis: {
        ...pick(hcluster.layout.yaxis, hclusterLayoutProps)
      },
      yaxis2: {
        ...pick(hcluster.layout.yaxis2, hclusterLayoutProps),
        tickvals: sample(hcluster.layout.yaxis2.tickvals, defaultInterval),
        ticktext: sample(hcluster.layout.yaxis2.ticktext, defaultInterval),
      },
      
    }
  } : {data: [], layout: {}};

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
              <Form.Select name="sortRow" value={heatmapOptions.sortRow} onChange={handleChange}  disabled={heatmapOptions.showHClusterPlot}>
                <option>All participants (no stratification)</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3" controlId="sortColumn">
              <Form.Label>Sort Outcomes By</Form.Label>
              <Form.Select name="sortColumn" value={heatmapOptions.sortColumn} onChange={handleChange} disabled={heatmapOptions.showHClusterPlot}>
                {xCategoriesSorted.map(label => <option value={label} key={label}>{label}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>

        </Row>

        <Form.Group className="mb-1" controlId="showAnnotations">
          <Form.Check type="checkbox" name="showAnnotations" checked={heatmapOptions.showAnnotations} onChange={handleChange} label="Show Annotations" />
        </Form.Group>

        <Form.Group className="mb-1" controlId="showHClusterPlot">
          <Form.Check type="checkbox" name="showHClusterPlot" checked={heatmapOptions.showHClusterPlot} onChange={handleChange} disabled={!hcluster}
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

      {!heatmapOptions.showHClusterPlot && <Plot {...heatmapPlot} useResizeHandler className="w-100" style={{ height: '800px' }} />}
      {heatmapOptions.showHClusterPlot && hcluster && <Plot {...hclusterPlot} useResizeHandler className="w-100" style={{ height: '800px' }} />}
    </>
  )
}
