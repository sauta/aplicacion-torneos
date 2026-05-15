import { useEffect, useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { Hero } from "../components/Hero";
import { MetricsGrid } from "../components/MetricsGrid";
import { PublicBracket } from "../components/PublicBracket";
import { hydrateTournament } from "../features/tournament/tournamentSlice";
import { loadTournament } from "../services/tournamentApi";

export function PublicPage() {
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Función para recargar el torneo desde el API
  const refreshTournament = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const tournament = await loadTournament();
      dispatch(hydrateTournament(tournament));
    } catch (error) {
      console.error("Error al recargar torneo:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch]);

  // Polling automático cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTournament();
    }, 3000); // 3 segundos

    return () => clearInterval(interval);
  }, [refreshTournament]);

  return (
    <main className="app-shell public-shell">
      <Hero />
      <MetricsGrid />
      <PublicBracket onRefresh={refreshTournament} isRefreshing={isRefreshing} />
    </main>
  );
}
