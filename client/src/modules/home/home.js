import Container from 'react-bootstrap/Container';

export default function Home() {
  return (
    <>
      <Container className="my-3">
        <h1 className="mb-3">Welcome to COMETS Analytics!</h1>
        <p>COMETS Analytics supports and streamlines consortium-based analyses of metabolomics data. The software is continuously being developed and maintained by Ewy Mathé (Division of Preclinical Innovation, National Center for Advancing Translational Sciences), Steve Moore (Division of Cancer Epidemiology and Genetics, National Cancer Institute), and Marinella Temprosa (Dept. of Biostatistics and Bioinformatics, Milken Institute School of Public Health, George Washington University), with web interface support from NCI's CBIIT and R package development support from IMS. Constructive feedback is provided by the COMETS Data Infrastructure Working Group and other working groups.</p>
        <p>COMETS Analytics was designed to simplify meta-analysis at the consortia level. Users prepare data input, and then the software takes care of checking the data integrity, performs data analyses securely, and aggregates results in a standardized format. Further details on the vision for implementing the software and the current features available can be found here.</p>
        <p>Go to the Correlation tab to get started, or to the About tab to learn more!</p>
      </Container>
    </>
  );
}