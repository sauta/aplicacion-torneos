import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { StatusToast } from "../components/StatusToast";
import { AppNavbar } from "../layouts/AppNavbar";
import { LoadingPage } from "../layouts/LoadingPage";
import { AdminPage } from "../pages/AdminPage";
import { PublicPage } from "../pages/PublicPage";
import { LoginPage } from "../pages/LoginPage";
import { isAuthenticated, logout } from "../services/authService";

function ProtectedRoute({ loaded, notify, status }) {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    // Redirigir a la vista pública después del logout
    window.location.replace("/view");
  };

  if (!auth) {
    return null;
  }

  if (!loaded) {
    return <LoadingPage mode="admin" />;
  }

  return (
    <>
      <AppNavbar mode="admin" onLogout={handleLogout} />
      <AdminPage notify={notify} />
      <StatusToast status={status} />
    </>
  );
}

function RoutedPage({ loaded, mode, notify, status }) {
  if (!loaded) {
    return <LoadingPage mode={mode} />;
  }

  return (
    <>
      <AppNavbar mode={mode} />
      {mode === "public" ? <PublicPage /> : <AdminPage notify={notify} />}
      <StatusToast status={status} />
    </>
  );
}

export function AppRoutes({ loaded, notify, status }) {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate("/admin", { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/admin" element={<ProtectedRoute loaded={loaded} notify={notify} status={status} />} />
      <Route path="/view" element={<RoutedPage mode="public" loaded={loaded} notify={notify} status={status} />} />
      <Route path="/index.html" element={<Navigate to="/admin" replace />} />
      <Route path="/view.html" element={<Navigate to="/view" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
