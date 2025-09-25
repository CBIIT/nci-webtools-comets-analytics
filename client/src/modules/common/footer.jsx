export default function Footer() {
  // Get build information from Vite define
  // eslint-disable-next-line no-undef
  const gitTag = typeof __GIT_TAG__ !== 'undefined' ? __GIT_TAG__ : 'unknown';
  // eslint-disable-next-line no-undef
  const gitBranch = typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'unknown';
  // eslint-disable-next-line no-undef
  const lastCommitDate = typeof __LAST_COMMIT_DATE__ !== 'undefined' ? __LAST_COMMIT_DATE__ : new Date().toISOString().split('T')[0];
  
  // Extract version from git tag or branch (e.g., "comets_3.1.2_20240828" -> "3.1.2")
  const extractVersion = (source) => {
    try {
      const match = source.match(/comets_(\d+\.\d+\.\d+)/);
      return match ? match[1] : source;
    } catch {
      return source;
    }
  };

  // Extract date from git tag or branch (e.g., "comets_3.1.2_20240828" -> "20240828")
  const extractDateFromSource = (source) => {
    try {
      const match = source.match(/comets_\d+\.\d+\.\d+_(\d{8})/);
      if (match) {
        const dateStr = match[1];
        // Convert YYYYMMDD to YYYY-MM-DD
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Determine which source to use for version info
  const getVersionSource = () => {
    // If branch is master or has no version number, use tag
    if (gitBranch === 'master' || gitBranch === 'main' || !extractVersion(gitBranch).match(/^\d+\.\d+\.\d+$/)) {
      return gitTag;
    }
    
    const tagDate = extractDateFromSource(gitTag);
    const branchDate = extractDateFromSource(gitBranch);
    
    // If both have dates, use the newer one
    if (tagDate && branchDate) {
      return tagDate < branchDate ? gitBranch : gitTag;
    }
    
    // If only branch has a date, use branch
    if (branchDate && !tagDate) {
      return gitBranch;
    }
    
    // If neither has a date but branch has a valid version number, use branch
    if (extractVersion(gitBranch).match(/^\d+\.\d+\.\d+$/)) {
      return gitBranch;
    }
    
    // Otherwise use tag
    return gitTag;
  };
  
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
  const versionSource = getVersionSource();

  return (
    <footer className="bg-primary-darker text-light pt-4 flex-grow-0 no-print">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 mb-4">
            <h2 className="h4">COMETS Analytics</h2>
            <div className="small text-primary-light">
              <div>Last Updated: {formatDate(lastCommitDate)}</div>
              <div>Version: {extractVersion(versionSource)}</div>
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
