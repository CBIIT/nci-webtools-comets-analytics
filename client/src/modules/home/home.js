import Container from "react-bootstrap/Container";
import { NavLink } from "react-router-dom";

export default function Home() {
  return (
    <>
      <Container className="my-3">
        <h1 className="mb-3">Welcome to COMETS Analytics!</h1>
        <p>
          COMETS Analytics supports and streamlines consortium-based analyses of
          metabolomics data. The software is continuously being developed and
          maintained by{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ncats.nih.gov/staff/mathee">
            Ewy Mathé
          </a>{" "}
          (Division of Preclinical Innovation, National Center for Advancing
          Translational Sciences),{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://dceg.cancer.gov/about/staff-directory/moore-steven">
            Steve Moore
          </a>{" "}
          (Division of Cancer Epidemiology and Genetics, National Cancer
          Institute), and{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://publichealth.gwu.edu/departments/biostatistics-and-bioinformatics/marinella-temprosa">
            Marinella Temprosa
          </a>{" "}
          (Dept. of Biostatistics and Bioinformatics, Milken Institute School of
          Public Health, George Washington University), with web interface
          support from NCI's{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="http://cbiit.nci.nih.gov/">
            CBIIT
          </a>{" "}
          and R package development support from{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.imsweb.com/services/">
            IMS
          </a>
          . Constructive feedback is provided by the{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://epi.grants.cancer.gov/comets/interest-groups.html">
            COMETS Data Infrastructure Working Group
          </a>{" "}
          and other working groups.
        </p>
        <p>
          COMETS Analytics was designed to simplify meta-analysis at the
          consortia level. Users prepare data input, and then the software takes
          care of checking the data integrity, performs data analyses securely,
          and aggregates results in a standardized format. Further details on
          the vision for implementing the software and the current features
          available can be found{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.youtube.com/watch?reload=9&v=dWJ_fdibnms">
            here.
          </a>{" "}
        </p>
        <p>
          Go to the <NavLink to="/analysis">Analysis tab</NavLink> to get
          started, or to the <NavLink to="/analysis">About tab</NavLink> to
          learn more!
        </p>
      </Container>
    </>
  );
}
