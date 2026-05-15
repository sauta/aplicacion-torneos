import { useDispatch, useSelector } from "react-redux";
import { selectTournament } from "../features/tournament/selectors";
import { updateEvent, updateImages } from "../features/tournament/tournamentSlice";
import { uploadImage } from "../services/tournamentApi";

export function EventEditor({ notify }) {
  const dispatch = useDispatch();
  const tournament = useSelector(selectTournament);

  async function handleImage(field, file) {
    try {
      const image = await uploadImage(file);
      dispatch(updateImages({ field, value: image }));
      notify(field === "banner" ? "Banner actualizado" : "Logo actualizado");
    } catch (error) {
      notify("No se pudo subir la imagen", "error");
    }
  }

  return (
    <section className="card panel-card">
      <div className="card-body">
        <h2 className="section-title">Evento</h2>
        <div className="mb-3">
          <label className="form-label" htmlFor="tournamentName">Nombre</label>
          <input
            className="form-control"
            id="tournamentName"
            type="text"
            value={tournament.name}
            onChange={(event) => dispatch(updateEvent({ field: "name", value: event.target.value }))}
            autoComplete="off"
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="tournamentGame">Juego</label>
          <input
            className="form-control"
            id="tournamentGame"
            type="text"
            value={tournament.game}
            onChange={(event) => dispatch(updateEvent({ field: "game", value: event.target.value }))}
            autoComplete="off"
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="bestOf">Formato</label>
          <select
            className="form-select"
            id="bestOf"
            value={tournament.bestOf}
            onChange={(event) => dispatch(updateEvent({ field: "bestOf", value: event.target.value }))}
          >
            <option value="1">Mejor de 1</option>
            <option value="3">Mejor de 3</option>
            <option value="5">Mejor de 5</option>
            <option value="7">Mejor de 7</option>
            <option value="9">Mejor de 9</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="bannerInput">Banner</label>
          <input
            className="form-control"
            id="bannerInput"
            type="file"
            accept="image/*"
            onChange={(event) => handleImage("banner", event.target.files?.[0]).finally(() => { event.target.value = ""; })}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="logoInput">Logo</label>
          <input
            className="form-control"
            id="logoInput"
            type="file"
            accept="image/*"
            onChange={(event) => handleImage("logo", event.target.files?.[0]).finally(() => { event.target.value = ""; })}
          />
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => {
              dispatch(updateImages({ field: "banner", value: "" }));
              notify("Banner eliminado");
            }}
          >
            Quitar banner
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => {
              dispatch(updateImages({ field: "logo", value: "" }));
              notify("Logo eliminado");
            }}
          >
            Quitar logo
          </button>
        </div>
      </div>
    </section>
  );
}
