import { Suspense, lazy } from "react";
import { RecoilRoot } from "recoil";
import { BrowserRouter as Router, Route, Routes, NavLink } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import Alert from "react-bootstrap/Alert";
import Loader from "./modules/common/loader";
import ErrorBoundary from "./modules/common/error-boundary";
import "./styles/main.scss";

// preload lazy-loaded page components
const Home = preloadLazyComponent(() => import("./modules/home/home"));
const Analysis = preloadLazyComponent(() => import("./modules/analysis/analysis"));
const About = preloadLazyComponent(() => import("./modules/about/about"));

function preloadLazyComponent(factory) {
  const loader = factory();
  return lazy(() => loader);
}

export default function App() {
  const links = [
    {
      route: "/",
      title: "Home",
      element: <Home />,
    },
    {
      route: "/analysis",
      title: "Analysis",
      element: <Analysis />,
    },
    // {
    //   route: "/create-input",
    //   title: "Create Input",
    //   element: CreateInput,
    // },
    {
      route: "/about",
      title: "About",
      element: <About />,
    },
  ];

  return (
    <RecoilRoot>
      <Router>
        <Navbar expand="sm" variant="dark" bg="orange" className="shadow-sm flex-none-auto">
          <Container>
            <Navbar.Brand className="d-block d-sm-none fw-semibold">COMETS Analytics</Navbar.Brand>
            <Navbar.Toggle aria-controls="app-navbar" />
            <Navbar.Collapse id="app-navbar" className="justify-content-center">
              <Nav>
                {links.map((link, index) => (
                  <NavLink
                    key={`navlink-${index}`}
                    className="nav-link text-uppercase fw-bold px-3"
                    to={link.route}
                    end>
                    {link.title}
                  </NavLink>
                ))}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <div id="main-content" className="flex-grow-1">
          <ErrorBoundary
            fallback={
              <Alert variant="danger">
                An internal error prevented the current page from loading. Please contact the website administrator if
                this problem persists.
              </Alert>
            }>
            <Suspense fallback={<Loader>Loading Page</Loader>}>
              <Routes>
                {links.map((link, index) => (
                  <Route key={`route-${index}`} path={link.route} element={link.element} />
                ))}
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </Router>
    </RecoilRoot>
  );
}
