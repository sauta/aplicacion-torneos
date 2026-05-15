import { AppNavbar } from "./AppNavbar";

export function LoadingPage({ mode }) {
  return (
    <>
      <AppNavbar mode={mode} />
      <main className="app-shell">
        <div className="empty-state">Cargando torneo...</div>
      </main>
    </>
  );
}
