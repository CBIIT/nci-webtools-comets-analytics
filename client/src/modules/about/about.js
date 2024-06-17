import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

export default function About() {
  return (
    <>
      <Container className="my-3">
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h2 className="h5 text-primary mb-4">Accessibility</h2>

            <p>The software can be run two different ways:</p>

            <ol>
              <li>
                A standalone R package “R-cometsAnalytics” that encapsulates our core algorithms and functionality,
                allowing the software to be run locally. The GitHub repository for the development of COMETS Analytics
                is publicly available at{" "}
                <a target="_blank" rel="noopener noreferrer" href="https://github.com/CBIIT/R-cometsAnalytics/">
                  https://github.com/CBIIT/R-cometsAnalytics/
                </a>{" "}
                under a GPL-3 license.{" "}
              </li>

              <li>
                A web-based app (
                <a target="_blank" rel="noopener noreferrer" href="https://www.comets-analytics.org">
                  https://www.comets-analytics.org
                </a>
                ) developed as a user friendly interface to the R package using HTML5. This app operates on secure
                cloud-based servers that delete data after analyses.{" "}
              </li>
            </ol>

            <p>
              All underlying statistical analyses and data processing use the R-cometsAnalytics R package so that using
              the R package or the app will produce the same results.
            </p>
          </Card.Body>
        </Card>
        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h2 className="h5 text-primary mb-4">Current Version Functionality</h2>
            <p>
              <span className="me-1 badge rounded-pill bg-primary">Current v2.1</span>Analytic modules with support for
              survival and and conditional logistic models have been developed in the R package and integrated into the
              web application.
            </p>
            <p>
              <span className="me-1 badge rounded-pill bg-success">Upcoming v3.0</span>Analytic modules with support for
              meta-analyses, chemical enrichment, and pathway enrichment have been developed in the R Package and will
              be integrated into the web application.
            </p>
            <p>
              Previous releases can be found here:{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://github.com/CBIIT/R-cometsAnalytics/releases">
                https://github.com/CBIIT/R-cometsAnalytics/releases.
              </a>
            </p>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h2 className="h5 text-primary mb-4">Help</h2>

            <p>
              A companion tutorial can be found at{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://cbiit.github.io/R-cometsAnalytics/Tutorial/docs/">
                https://cbiit.github.io/R-cometsAnalytics/Tutorial/docs/
              </a>
              . A presentation of the software, its implementation and vision can be found{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?reload=9&v=dWJ_fdibnms">
                {" "}
                here.
              </a>{" "}
            </p>

            <p>
              For questions or help on COMETS Analytics app or R package, please send an e-mail to{" "}
              <a target="_blank" rel="noopener noreferrer" href="mailto:comets.analytics@gmail.com">
                comets.analytics@gmail.com
              </a>
              .
            </p>

            <p>
              For help on metabolite harmonization, contact{" "}
              <a target="_blank" rel="noopener noreferrer" href="mailto:moorest@mail.nih.gov">
                Steve Moore
              </a>
              .
            </p>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h2 className="h5 text-primary mb-4">Acknowledgements</h2>

            <p>
              We thank the National Cancer Institute (NCI) for supporting the development and expansion of COMETS
              Analytics, the NCI Center for Biomedical Informatics and Information Technology team for developing the
              app, the Information Management Services team for further developing the R package, and our users for
              providing feedback so we can continuously ameliorate the software.
            </p>
            <p>
              Web Application Development Team: Kailing Chen, Ewy Mathé, Steve Moore, Brian Park, and Ella Temprosa.
            </p>
            <p>Metabolite Harmonization Team: Dave Ruggieri and Steve Moore.</p>

            <p>Project Management Team: Abha Arora and Kelly Crotty</p>

            <p>A special thanks as well to the Broader COMETS Data Infrastructure Group.</p>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-3">
          <Card.Body>
            <h2 className="h5 text-primary mb-4">Citation</h2>

            <p>Please site the following when using COMETS Analytics:</p>
            <p>
              Temprosa M, Moore SC, Zanetti KA, Appel N, Ruggieri D, Mazzilli KM, Chen KL, Kelly RS, Lasky-Su JA,
              Loftfield E, McClain K, Park B, Trijsburg L, Zeleznik OA, Mathé EA. COMETS Analytics: An online tool for
              analyzing and meta-analyzing metabolomics data in large research consortia. Am J Epidemiol. 2021 Apr
              22:kwab120. doi: 10.1093/aje/kwab120. Epub ahead of print. PMID: 33889934.
            </p>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}
