import { useMemo } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Plot from 'react-plotly.js'
import Table, { RangeFilter, TextFilter } from '../../common/table';
import { downloadTables } from '../../../services/download';

export default function IntegrityCheckResults({ results, children = null }) {

  const columns = useMemo(() => [
    {
      id: "metabid",
      accessor: "metabid",
      Filter: TextFilter,
    },
    {
      id: "metabolite_name",
      accessor: "metabolite_name",
      Filter: TextFilter,
    },
    {
      id: "super_pathway",
      accessor: "super_pathway",
      Filter: TextFilter,
    },
    {
      id: "sub_pathway",
      accessor: "sub_pathway",
      Filter: TextFilter,
    },
    {
      id: "comp_id.cohort",
      accessor: record => record["comp_id.cohort"],
      Filter: TextFilter,
    },
    {
      id: "platform",
      accessor: "platform",
      Filter: TextFilter,
    },
    {
      id: "pubchem",
      accessor: "pubchem",
      Filter: TextFilter,
    },
    {
      id: "hmdb_id.cohort",
      accessor: record => record["hmdb_id.cohort"],
      Filter: TextFilter,
    },
    {
      id: "uid_01",
      accessor: "uid_01",
      Filter: TextFilter,
    },
    {
      id: "uidsource",
      accessor: record => record.uidsource.split(';').sort().join(';'),
      Cell: ({value}) => (
        <details title={value}>
            <summary className="text-truncate">{value.split(';').length} sources</summary>
            <ul>{value.split(';').map((v, i) => <li key={`uidsource-${v}-${i}`} className="text-truncate">{v}</li>)}</ul>
        </details>
      ),
      Filter: TextFilter,
    },
    {
      id: "main_class",
      accessor: "main_class",
      Filter: TextFilter,
    },
    {
      id: "chemical_id",
      accessor: "chemical_id",
      Filter: TextFilter,
    },
    {
      id: "comp_id.comets",
      accessor: record => record["comp_id.comets"],
      Filter: TextFilter,
    },
    {
      id: "hmdb_id.comets", 
      accessor: record => record["hmdb_id.comets"],
      Filter: TextFilter,
    },
    {
      id: "biochemical",
      accessor: "biochemical",
      Filter: TextFilter,
    },
    {
      id: "comp_id",
      accessor: "comp_id",
      Filter: TextFilter,
    },    
    {
      id: "var",
      accessor: "var",
      Filter: RangeFilter,
      filter: "between",
    },
    {
      id: "num.min",
      accessor: record => record["num.min"],
      Filter: RangeFilter,
      filter: "between",
    },
  ], []);

  const defaultColumn = {
    Header: ({column }) => <span title={column.id}>{column.id}</span>,
    Cell: ({value}) => <div title={value} className="text-truncate">{value}</div>,
    minWidth: 50,
    width: 180,
  }

  const variancePlot = {
    data: [
      {
        x: results?.metabolites?.map(m => m.var) || [],
        type: 'histogram'
      }
    ],
    layout: {
      title: "Distribution of Variance",
      xaxis: {
        title: "Variance of transformed metabolite abundances"
      },
      yaxis: {
        title: "Frequency"
      }
    },
  };

  const missingValuesPlot = {
    data: [
      {
        x: results?.metabolites?.map(m => m['num.min']) || [],
        type: 'histogram'
      }
    ],
    layout: {
      title: "Distribution of the Number/Missing Values",
      xaxis: {
        title: "Number of minimum/missing values"
      },
      yaxis: {
        title: "Frequency"
      }
    },
  };

  function downloadResults() {
    const sheets = [{name: 'export', data: results.metabolites}];
    downloadTables(sheets, `export.csv`);
  }

  
  return !results ? children : (
    <>
      {results.error && <Alert variant="danger">{results.message}</Alert>}
      {results.messages.length > 0 && <Alert variant="primary">{results.messages}</Alert>}
      {results.warnings.length > 0 && <Alert variant="warning">
        <h2 className="h5">Warnings</h2>
        <ul className="mb-0">
          {results.warnings.map((warning, i) => <li key={`warning-${i}`}>{warning}</li>)}
        </ul>
      </Alert>}

      {/* <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
        Results
        <Button variant="primary" size="sm" onClick={downloadResults}>
          <i className="bi bi-download me-1" />
          Download Results
        </Button>
      </h2> */}

      {/* <Table columns={columns} data={results.metabolites} options={{defaultColumn}} /> */}



      {/* <table className="table">
        <thead className="table-light text-muted text-uppercase small">
          <tr>
            <th>N Metabolites</th>
            <th>N Harmonized</th>
            <th>N Non-Harmonized</th>
            <th>N with zero variance</th>
            <th>N with &gt; 25% at min</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{results.summary.metabolites.metabolites}</td>
            <td>{results.summary.metabolites.harmonized}</td>
            <td>{results.summary.metabolites.nonHarmonized}</td>
            <td>{results.summary.metabolites.zeroVariance}</td>
            <td>{results.summary.metabolites.min25PercentSubjects}</td>
          </tr>
        </tbody>
      </table> */}



      <h2 className="h4 text-primary d-flex justify-content-between align-items-baseline">
        Input Data Summary
        <Button variant="primary" size="sm" onClick={downloadResults}>
          <i className="bi bi-download me-1" />
          Download Results
        </Button>
      </h2>

      {/* <h2 className="h4 text-primary">Input Data Summary</h2> */}
      <Row>
        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h2 className="h6 text-muted">Total Metabolites</h2>
              <div className="h3">{results.summary.input.metabolites.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
            <h2 className="h6 text-muted">Subjects</h2>
            <div className="h3">{results.summary.input.subjects.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h2 className="h6">Subject Covariates</h2>
              <div className="h3">{results.summary.input.subjectCovariates.toLocaleString()}</div>
              </Card.Body>
          </Card>
        </Col>

        <Col md>
          <Card className="mb-3 shadow-sm">
          <Card.Body>
            <h2 className="h6">Subject Metabolites</h2>
            <div className="h3">{results.summary.input.subjectMetabolites.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* <table className="table">
        <thead className="table-light text-muted text-uppercase small">
          <tr>
            <th>Metabolites sheet</th>	
            <th>Subject data sheet</th>
            <th>Subject metabolites sheet</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{results.summary.input.metabolites} metabolites</td>
            <td>{results.summary.input.subjects} subjects with {results.summary.input.subjectCovariates} covariates</td>
            <td>{results.summary.input.subjects} subjects with {results.summary.input.subjectMetabolites}  metabolites</td>
          </tr>
        </tbody>
      </table> */}

      <h2 className="h4 text-primary">Harmonization Summary</h2>

      <Row>
        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h2 className="h6 text-muted">N Metabolites</h2>
              <div className="h3">{results.summary.metabolites.metabolites.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
            <h2 className="h6 text-muted">N Harmonized</h2>
            <div className="h3">{results.summary.metabolites.harmonized.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md>
        <Card className="mb-3 shadow-sm">
            <Card.Body>
              <h2 className="h6">N Non-Harmonized</h2>
              <div className="h3">{results.summary.metabolites.nonHarmonized.toLocaleString()}</div>
              </Card.Body>
          </Card>
        </Col>

        <Col md>
          <Card className="mb-3 shadow-sm">
          <Card.Body>
            <h2 className="h6">N with zero variance</h2>
            <div className="h3">{results.summary.metabolites.zeroVariance.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md>
          <Card className="mb-3 shadow-sm">
          <Card.Body>
            <h2 className="h6">N with &gt; 25% at min</h2>
            <div className="h3">{results.summary.metabolites.min25PercentSubjects.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Plot {...variancePlot} useResizeHandler className="w-100" style={{height: '400px'}}/>
      <Plot {...missingValuesPlot} useResizeHandler className="w-100" style={{height: '400px'}}/>
      
    </>
  );
}