function parseVersionAndDate(versionString) {
  if (!versionString) return { version: "dev", date: new Date().toISOString().split("T")[0] };
  const versionSplit = versionString.split("_");
  const version = versionSplit[1] || versionString;

  const dateMatch = versionString.match(/(\d{8})/)?.[1];
  const date = dateMatch
    ? `${dateMatch.slice(0, 4)}-${dateMatch.slice(4, 6)}-${dateMatch.slice(6, 8)}`
    : new Date().toISOString().split("T")[0];

  return { version, date };
}

export default function Footer() {
  const { version, date } = parseVersionAndDate(import.meta.env.VITE_APP_VERSION);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-darker text-light pt-4 flex-grow-0 no-print">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 mb-4">
            <h2 className="h4">COMETS Analytics</h2>
            <div className="small text-primary-light">
              <div>Last Updated: {date}</div>
              <div>Version: {version}</div>
            </div>
          </div>

          <div className="col-lg-3 mb-4">
            <div className="h5 mb-1 font-weight-light">CONTACT US</div>
            <ul className="list-unstyled mb-0">
              <li>
                <a className="text-light" href="mailto:comets.analytics@gmail.com">
                  General Support
                </a>
              </li>
            </ul>
          </div>

          <div className="col-lg-6 mb-4">
            <div className="h5 mb-1 font-weight-light">MORE RESOURCES</div>
            <ul className="list-unstyled mb-0">
              <li>
                <a className="text-light" href="https://epi.grants.cancer.gov/comets/" target="_blank" rel="noopener">
                  About COMETS
                </a>
              </li>
              <li>
                <a
                  className="text-light"
                  href="https://www.youtube.com/watch?reload=9&v=dWJ_fdibnms"
                  target="_blank"
                  rel="noopener">
                  Introduction
                </a>
              </li>
              <li>
                <a
                  className="text-light"
                  href="https://cbiit.github.io/R-cometsAnalytics/Tutorial/docs/"
                  target="_blank"
                  rel="noopener">
                  Tutorials
                </a>
              </li>
              <li>
                <a
                  className="text-light"
                  href="https://cbiit.github.io/R-cometsAnalytics/cometsvignette_v1.6.html"
                  target="_blank"
                  rel="noopener">
                  Vignettes
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center my-3 text-primary-light">©2017-{currentYear} COMETS Analytics</div>
      </div>
    </footer>
  );
}
