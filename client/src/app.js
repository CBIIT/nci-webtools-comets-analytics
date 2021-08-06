import { RecoilRoot } from 'recoil';
import { BrowserRouter as Router, Route, NavLink } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Home from './modules/home/home';
import About from './modules/about/about';
import Analysis from './modules/analysis/analysis';
import CreateInput from './modules/create-input/create-input';
import "./styles/main.scss";

export default function App() {

  const links = [
    {
      route: "/",
      title: "Home",
      component: Home,
    },
    {
      route: "/analysis",
      title: "Analysis",
      component: Analysis,
    },
    // {
    //   route: "/create-input",
    //   title: "Create Input",
    //   component: CreateInput,
    // },
    {
      route: "/about",
      title: "About",
      component: About,
    },
  ];

  return (
    <RecoilRoot>
      <Router>
        <Navbar expand="sm" className="navbar-light shadow-sm">
          <Container>
            <Navbar.Toggle aria-controls="app-navbar" />
            <Navbar.Collapse id="app-navbar">
              <Nav>
                {links.map((link, index) => (
                  <NavLink
                    key={`navlink-${index}`}
                    activeClassName="active"
                    className="nav-link"
                    to={link.route}
                    exact>
                    {link.title}
                  </NavLink>
                ))}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <div id="main-content" className="flex-grow-1">
          {links.map((link, index) => (
            <Route exact key={`route-${index}`} path={link.route} component={link.component} />
          ))}
        </div>

      </Router>
    </RecoilRoot>
  );
}
