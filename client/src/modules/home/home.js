import { NavLink } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import HomeImage from "./images/home.svg";

export default function Home() {
  return (
    <>
      <div className="cover-image py-5 mb-4 text-light shadow-sm" style={{ backgroundImage: `url(${HomeImage})` }}>
        <Container>
          <h1 className="display-4 mb-4">
            <span className="d-inline-block py-4 border-bottom border-light">Welcome to COMETS Analytics</span>
          </h1>

          <p className="lead mb-3">Perform consortium-based analyses of metabolomics data</p>
          <NavLink className="btn btn-outline-light" to="/analysis">
            Perform Analysis
          </NavLink>
        </Container>
      </div>

      <Container className="mb-4">
        <Row>
          {/* <Col md={4}>
            <h2 className="text-primary">Introduction</h2>
          </Col> */}
          <Col md={8} className="offset-md-2">
            <p>
              COMETS Analytics supports and streamlines consortium-based analyses of metabolomics data. The software
              maintenance and development is being led by{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://ncats.nih.gov/staff/mathee">
                Ewy Mathé
              </a>{" "}
              (Division of Preclinical Innovation, National Center for Advancing Translational Sciences),{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://dceg.cancer.gov/about/staff-directory/moore-steven">
                Steve Moore
              </a>{" "}
              (Division of Cancer Epidemiology and Genetics, National Cancer Institute),{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://publichealth.gwu.edu/departments/biostatistics-and-bioinformatics/marinella-temprosa">
                Marinella Temprosa
              </a>{" "}
              (Dept. of Biostatistics and Bioinformatics, Milken Institute School of Public Health, George Washington
              University), with web interface support from Kailing Chen and Brian Park at NCI's{" "}
              <a target="_blank" rel="noopener noreferrer" href="http://cbiit.nci.nih.gov/">
                Center for Biomedical Informatics &amp; Information Technology
              </a>{" "}
              and R package development support from Bill Wheeler at NCI’s{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://www.imsweb.com/services/">
                Information Management Services, Inc.
              </a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://epi.grants.cancer.gov/staff/zanetti.html">
                Krista Zanetti
              </a>{" "}
              (Division of Cancer Control and Population Sciences, National Cancer Institute) provides project
              management and overall oversight. Constructive feedback is regularly provided by the{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://epi.grants.cancer.gov/comets/interest-groups.html">
                COMETS Data Infrastructure Working Group
              </a>{" "}
              and other working groups. All feedback is welcome though so please contact us at{" "}
              <a href="mailto:comets.analytics@gmail.com">comets.analytics@gmail.com</a>. This projected is supported by
              the NCI and NCATS.
            </p>

            <p>
              COMETS Analytics was designed to simplify meta-analysis at the consortia level. Users prepare data input,
              and then the software takes care of checking the data integrity, performs data analyses securely, and
              aggregates results in a standardized format. Further details on the vision for implementing the software
              and the current features available can be found here and in our most{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8897993/">
                recent publication
              </a>
              .
            </p>

            <p>
              Go to the <NavLink to="/analysis">Analysis page</NavLink> to get started, or to the{" "}
              <NavLink to="/about">About page</NavLink> to learn more!
            </p>
            <p>
              Questions or comments? Contact us via <a href="mailto:comets.analytics@gmail.com">email</a>.
            </p>
          </Col>
        </Row>
      </Container>
    </>
  );
}
