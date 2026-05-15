import { Navigate, Route, Routes } from "react-router-dom";
import { StatusToast } from "../components/StatusToast";
import { AppNavbar } from "../layouts/AppNavbar";
import { LoadingPage } from "../layouts/LoadingPage";
import { AdminPage } from "../pages/AdminPage";
import { PublicPage } from "../pages/PublicPage";

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
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<RoutedPage mode="admin" loaded={loaded} notify={notify} status={status} />} />
      <Route path="/view" element={<RoutedPage mode="public" loaded={loaded} notify={notify} status={status} />} />
      <Route path="/index.html" element={<Navigate to="/admin" replace />} />
      <Route path="/view.html" element={<Navigate to="/view" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
