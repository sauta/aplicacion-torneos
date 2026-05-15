import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectTournament } from "../features/tournament/selectors";
import { importTournament, resetTournament } from "../features/tournament/tournamentSlice";
import {
  clearTournament,
  copyText,
  downloadJson,
  makeShareUrl,
  readJsonFile,
  uploadImage
} from "../services/tournamentApi";
import { exportTournamentZip, importTournamentZip } from "../services/exportService";

export function DataTools({ notify }) {
  const dispatch = useDispatch();
  const tournament = useSelector(selectTournament);
  const inputRef = useRef(null);
  const zipInputRef = useRef(null);
  const [shareLink, setShareLink] = useState(() => makeShareUrl(tournament));
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  useEffect(() => {
    setShareLink(makeShareUrl(tournament));
  }, [tournament]);

  function refreshLink() {
    const link = makeShareUrl(tournament);
    setShareLink(link);
    return link;
  }

  async function handleExportZip() {
    setIsExporting(true);
    try {
      await exportTournamentZip(tournament);
      notify("ZIP exportado correctamente");
    } catch (error) {
      notify("Error al exportar ZIP", "error");
      console.error("Error exportando ZIP:", error);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportZip(file) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportProgress("Extrayendo ZIP...");

    try {
      const updatedTournament = await importTournamentZip(
        file,
        uploadImage,
        (current, total, message) => {
          setImportProgress(`${message} (${current}/${total})`);
        }
      );

      dispatch(importTournament(updatedTournament));
      notify("ZIP importado correctamente");
    } catch (error) {
      notify(`Error al importar ZIP: ${error.message}`, "error");
      console.error("Error importando ZIP:", error);
    } finally {
      setIsImporting(false);
      setImportProgress("");
      if (zipInputRef.current) {
        zipInputRef.current.value = "";
      }
    }
  }

  async function handleImport(file) {
    if (!file) {
      return;
    }

    try {
      dispatch(importTournament(await readJsonFile(file)));
      notify("JSON importado");
    } catch (error) {
      notify("No se pudo importar el JSON", "error");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleCopy() {
    const link = refreshLink();

    try {
      await copyText(link);
      notify("Link publico copiado");
    } catch (error) {
      notify("No se pudo copiar el link", "warning");
    }
  }

  return (
    <section className="card panel-card">
      <div className="card-body">
        <h2 className="section-title">Datos</h2>
        <div className="d-grid gap-2 mb-3">
          <button
            className="btn btn-outline-primary"
            type="button"
            onClick={() => {
              downloadJson(tournament);
              notify("JSON exportado");
            }}
          >
            Exportar JSON
          </button>
          <button
            className="btn btn-outline-primary"
            type="button"
            onClick={handleExportZip}
            disabled={isExporting}
          >
            {isExporting ? "Exportando..." : "📦 Exportar ZIP completo"}
          </button>
          <label 
            className={`btn btn-outline-secondary mb-0 ${isImporting ? "disabled" : ""}`} 
            htmlFor="importZip"
          >
            {isImporting ? importProgress : "📥 Importar ZIP completo"}
          </label>
          <input
            className="d-none"
            id="importZip"
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => handleImportZip(event.target.files?.[0])}
            disabled={isImporting}
          />
          <label className="btn btn-outline-secondary mb-0" htmlFor="importJson">Importar JSON</label>
          <input
            className="d-none"
            id="importJson"
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => handleImport(event.target.files?.[0])}
          />
        </div>
        <label className="form-label" htmlFor="shareLink">Link publico</label>
        <div className="input-group mb-3">
          <input
            className="form-control"
            id="shareLink"
            type="text"
            value={shareLink}
            readOnly
            onFocus={refreshLink}
          />
          <button className="btn btn-primary" type="button" onClick={handleCopy}>Copiar</button>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={() => window.open(refreshLink() || "/view.html", "_blank", "noopener")}
          >
            Abrir vista
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            type="button"
            onClick={() => {
              if (!window.confirm("Esto reemplazara el torneo actual. Continuar?")) {
                return;
              }

              clearTournament();
              dispatch(resetTournament());
              notify("Torneo reiniciado");
            }}
          >
            Reiniciar
          </button>
        </div>
      </div>
    </section>
  );
}
