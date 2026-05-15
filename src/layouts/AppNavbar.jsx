import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";

export function AppNavbar({ mode, onLogout }) {
  return (
    <nav className="navbar navbar-expand-lg app-navbar">
      <div className="container-fluid px-3 px-lg-4">
        <Link className="navbar-brand fw-semibold" to={mode === "admin" ? "/admin" : "/view"}>
          {mode === "admin" ? "Torneo Admin" : "Torneo"}
        </Link>
        <div className="d-flex gap-2 align-items-center">
          <ThemeToggle />
          {mode === "admin" ? (
            <>
              <Link className="btn btn-outline-light btn-sm" to="/view">
                Vista publica
              </Link>
              {onLogout && (
                <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>
                  🚪 Salir
                </button>
              )}
            </>
          ) : (
            <Link className="btn btn-outline-light btn-sm" to="/admin">
              Panel admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
