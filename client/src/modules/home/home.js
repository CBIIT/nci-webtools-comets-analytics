import { NavLink } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import HomeImage from "./images/home.svg";

export default function Home() {
  return (
    <>
      <div className="cover-image pt-5 text-light mb-4 shadow-sm" style={{ backgroundImage: `url(${HomeImage})` }}>
        <Container>
          <Row className="justify-content-center mb-4">
            <Col md={12}>
              <h1 className="display-4 mb-4">
                <span className="d-inline-block py-4 border-bottom border-light">Welcome to COMETS Analytics</span>
              </h1>

              <div>
                <p className="lead mb-3">Perform consortium-based analyses of metabolomics data</p>
                <NavLink className="btn btn-outline-light mb-4" to="/analysis">
                  Perform Analysis
                </NavLink>
              </div>
            </Col>
          </Row>
        </Container>

        <div className="py-4" style={{ background: `rgba(0, 0, 0, 0.2)` }}>
          <Container>
            <Row className="justify-content-start">
              <Col md={12}>
                <h3 className="h5 mb-4">
                  COMETS Analytics v2.1
                  <Badge pill bg="primary" className="ms-2">
                    New Release
                  </Badge>
                </h3>

                <p>
                  New features include:
                  <ul>
                    <li>Support for running survival and and conditional logistic models</li>
                  </ul>
                </p>
                <p>
                  Check out the R Package{" "}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://github.com/CBIIT/R-cometsAnalytics/blob/master/RPackageSource/NEWS"
                    className="text-white">
                    NEWS
                  </a>{" "}
                  for more information.
                </p>
              </Col>
            </Row>
          </Container>
        </div>
      </div>

      <Container className="mb-4">
        <Row className="justify-content-center mb-4">
          <Col md={12}>
            <p>
              COMETS Analytics supports and streamlines consortium-based analyses of metabolomics data. The software
              maintenance and development is being led by{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://ncats.nih.gov/staff/mathee">
                Ewy Mathé
              </a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://ncats.nih.gov/">
                (Division of Preclinical Innovation, National Center for Advancing Translational Sciences)
              </a>
              ,{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://dceg.cancer.gov/about/staff-directory/moore-steven">
                Steve Moore
              </a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://dceg.cancer.gov/">
                (Division of Cancer Epidemiology and Genetics, National Cancer Institute)
              </a>
              ,{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://publichealth.gwu.edu/departments/biostatistics-and-bioinformatics/marinella-temprosa">
                Marinella Temprosa
              </a>{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://publichealth.gwu.edu/departments/biostatistics-and-bioinformatics">
                (Dept. of Biostatistics and Bioinformatics, Milken Institute School of Public Health, George Washington
                University)
              </a>
              , with web interface support from <a href="mailto:kai-ling.chen@nih.gov">Kailing Chen</a> and{" "}
              <a href="mailto:brian.park@nih.gov">Brian Park</a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="http://cbiit.nci.nih.gov/">
                (Center for Biomedical Informatics &amp; Information Technology, National Cancer Institute)
              </a>{" "}
              and R package development support from <a href="mailto:WheelerB@imsweb.com">Bill Wheeler</a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://www.imsweb.com/services/">
                (Information Management Services, Inc.)
              </a>
              .{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://cssi.cancer.gov/about-us/leadership/abha-arora-ms">
                Abha Arora
              </a>{" "}
              and{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://cssi.cancer.gov/about-us/leadership/kelly-crotty">
                Kelly Crotty
              </a>{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://cssi.cancer.gov/">
                (Center for Strategic Scientific Initiatives, National Cancer Institute)
              </a>{" "}
              provide project management and overall oversight. Constructive feedback is regularly provided by the{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://epi.grants.cancer.gov/comets/interest-groups.html">
                COMETS Data Infrastructure Working Group
              </a>{" "}
              and other working groups. All feedback is welcome though so please contact us at{" "}
              <a href="mailto:comets.analytics@gmail.com">comets.analytics@gmail.com</a>. This project is supported by
              the National Cancer Institute and National Center for Advancing Translational Sciences.
            </p>

            <p>
              COMETS Analytics was designed to simplify meta-analysis at the consortia level. Users prepare data input,
              and then the software verifies data integrity, performs data analyses securely, and aggregates results in
              a standardized format. Further details on the vision for implementing the software and the current
              features available can be found here and in our{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8897993/">
                most recent publication
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
