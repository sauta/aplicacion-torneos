import { AdminBracket } from "../components/AdminBracket";
import { DataTools } from "../components/DataTools";
import { EventEditor } from "../components/EventEditor";
import { Hero } from "../components/Hero";
import { MetricsGrid } from "../components/MetricsGrid";
import { ParticipantsEditor } from "../components/ParticipantsEditor";

export function AdminPage({ notify }) {
  return (
    <main className="app-shell">
      <Hero />
      <MetricsGrid />
      <div className="content-grid">
        <aside className="admin-sidebar">
          <EventEditor notify={notify} />
          <ParticipantsEditor notify={notify} />
          <DataTools notify={notify} />
        </aside>
        <AdminBracket notify={notify} />
      </div>
    </main>
  );
}
