import { Link, NavLink, Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="page">
      <header className="header">
        <Link className="wordmark" to="/" aria-label="Plate home">
          <span className="mark" aria-hidden="true"><span className="mark-dot" /></span>
          Plate
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <NavLink to="/" end>Find a dish</NavLink>
          <NavLink to="/group">Group search</NavLink>
          <NavLink to="/me">My meals</NavLink>
        </nav>
        <span className="city">Oxford</span>
      </header>

      <Outlet />

      <footer className="footer">
        <p><strong>Rankings you can trust.</strong> Every score comes from diners. Sponsored slots are always labelled and never change the organic order.</p>
        <p className="footer-fine">Plate · Oxford · Allergen details are restaurant-provided — always confirm with staff.</p>
      </footer>
    </div>
  );
}
