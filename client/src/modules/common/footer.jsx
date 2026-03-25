export default function Footer() {
  // Get build information from Vite define
  // eslint-disable-next-line no-undef
  const releaseVersion = typeof __RELEASE_VERSION__ !== 'undefined' ? __RELEASE_VERSION__ : 'unknown';
  // eslint-disable-next-line no-undef
  const lastCommitDate = typeof __LAST_COMMIT_DATE__ !== 'undefined' ? __LAST_COMMIT_DATE__ : new Date().toISOString().split('T')[0];
  
  // Debug logging
  console.log('Footer Debug - releaseVersion: -- ', releaseVersion);
  console.log('Footer Debug - lastCommitDate: -- ', lastCommitDate);

  // Format the last updated date to YYYY-MM-DD
  const formatDate = (dateStr) => {
    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Otherwise, convert to YYYY-MM-DD format
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-darker text-light pt-4 flex-grow-0 no-print">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 mb-4">
            <h2 className="h4">COMETS Analytics</h2>
            <div className="small text-primary-light">
              <div>Last Updated: {formatDate(lastCommitDate)}</div>
              <div>Version: {releaseVersion}</div>
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

        <div className="text-center my-3 text-primary-light">
          ©2017-{currentYear} COMETS Analytics
        </div>
      </div>
    </footer>
  );
}
