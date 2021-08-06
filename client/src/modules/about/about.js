import Container from 'react-bootstrap/Container';

export default function About() {
  return (
    <>
    <Container className="my-3">
      <h2>Accessibility</h2>

      <p>The software can be run two different ways:</p>

      <ol>
        <li>A standalone R package “R-cometsAnalytics” that encapsulates our core algorithms and functionality, allowing the software to be run locally. The GitHub repository for the development of COMETS Analytics is publicly available at https://github.com/CBIIT/R-cometsAnalytics/ under a GPL-3 license.</li>
        <li>A web-based app (https://www.comets-analytics.org) developed as a user friendly interface to the R package using HTML5. This app operates on secure cloud-based servers that delete data after analyses.</li>

      </ol>

      <p>All underlying statistical analyses and data processing use the R-cometsAnalytics R package so that using the R package or the app will produce the same results.</p>

      <h2>Current Version Functionality</h2>
      <p>
        Current Version is 1.6: Released on 10/14/2019 with analytic module for unadjusted and partial correlation analyses. Complete details of the version history are documented in the GitHub repository: https://github.com/CBIIT/R-cometsAnalytics.
      </p>

      <p>Upcoming Version 2.0: Analytic module with generalized linear models is in testing, expected release in 2021.</p>

      <p>Previous releases can be found here: https://github.com/CBIIT/R-cometsAnalytics/releases.</p>

      <h2>Help</h2>
      <p>A companion tutorial can be found at https://cbiit.github.io/R-cometsAnalytics/Tutorial/docs/. A presentation of the software, its implementation and vision can be found here.</p>

      <p>For questions or help on COMETS Analytics app or R package, please send an e-mail to comets.analytics@gmail.com.</p>

      <p>For help on metabolite harmonization, contact Steve Moore.</p>

      <h2>Acknowledgements</h2>
      <p>We thank the National Cancer Institute (NCI) for supporting the development and expansion of COMETS Analytics, the NCI Center for Biomedical Informatics and Information Technology team for developing the app, the Information Management Services team for further developing the R package, and our users for providing feedback so we can continuously ameliorate the software.</p>

      <p>Web application Development Team: Kailing Chen, Ewy Mathé, Steve Moore, Brian Park, and Ella Temprosa.</p>

      <p>Metabolite Harmonization Team: Dave Ruggieri and Steve Moore.</p>

      <p>A special thanks as well to the Broader COMETS Data Infrastructure Group.</p>

      <h2>Citation</h2>
      <p>Please site the following when using COMETS Analytics:</p>

      <p>Temprosa M, Moore SC, Zanetti KA, Appel N, Ruggieri D, Mazzilli KM, Chen KL, Kelly RS, Lasky-Su JA, Loftfield E, McClain K, Park B, Trijsburg L, Zeleznik OA, Mathé EA. COMETS Analytics: An online tool for analyzing and meta-analyzing metabolomics data in large research consortia. Am J Epidemiol. 2021 Apr 22:kwab120. doi: 10.1093/aje/kwab120. Epub ahead of print. PMID: 33889934.</p>
      </Container>
    </>

  );
}