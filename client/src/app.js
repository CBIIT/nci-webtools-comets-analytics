import { RecoilRoot } from "recoil";
import { BrowserRouter as Router, Route, Routes, NavLink } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import Home from "./modules/home/home";
import About from "./modules/about/about";
import Analysis from "./modules/analysis/analysis";
// import CreateInput from "./modules/create-input/create-input";
import "./styles/main.scss";

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
        <Navbar expand="sm" className="navbar-light shadow-sm flex-none-auto">
          <Container>
            <Navbar.Toggle aria-controls="app-navbar" />
            <Navbar.Collapse id="app-navbar">
              <Nav>
                {links.map((link, index) => (
                  <NavLink key={`navlink-${index}`} activeClassName="active" className="nav-link" to={link.route} exact>
                    {link.title}
                  </NavLink>
                ))}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <div id="main-content" className="flex-grow-1">
          <Routes>
            {links.map((link, index) => (
              <Route key={`route-${index}`} path={link.route} element={link.element} />
            ))}
          </Routes>
        </div>
      </Router>
    </RecoilRoot>
  );
}
