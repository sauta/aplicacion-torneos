import { Hero } from "../components/Hero";
import { MetricsGrid } from "../components/MetricsGrid";
import { PublicBracket } from "../components/PublicBracket";

export function PublicPage() {
  return (
    <main className="app-shell public-shell">
      <Hero />
      <MetricsGrid />
      <PublicBracket />
    </main>
  );
}
