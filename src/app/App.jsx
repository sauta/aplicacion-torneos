import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { AppRoutes } from "../routes/AppRoutes";
import { selectTournament } from "../features/tournament/selectors";
import { hydrateTournament } from "../features/tournament/tournamentSlice";
import {
  getSharedTournamentFromHash,
  loadTournament,
  saveTournament
} from "../services/tournamentApi";

export function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const tournament = useSelector(selectTournament);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState(null);
  const mode = location.pathname.startsWith("/view") ? "public" : "admin";

  const notify = useCallback((message, type) => {
    setStatus({ message, type });
    window.clearTimeout(window.__tournamentToastTimer);
    window.__tournamentToastTimer = window.setTimeout(() => setStatus(null), 2400);
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const nextTournament = mode === "public"
        ? (getSharedTournamentFromHash() || await loadTournament())
        : await loadTournament();

      if (active) {
        dispatch(hydrateTournament(nextTournament));
        setLoaded(true);
      }
    }

    document.body.classList.toggle("public-mode", mode === "public");
    hydrate();

    return () => {
      active = false;
      document.body.classList.remove("public-mode");
    };
  }, [dispatch, mode]);

  useEffect(() => {
    if (mode === "admin" && loaded) {
      saveTournament(tournament).catch(() => {
        notify("No se pudo guardar en la API, usando respaldo local", "warning");
      });
    }
  }, [loaded, mode, notify, tournament]);

  return <AppRoutes loaded={loaded} notify={notify} status={status} />;
}
