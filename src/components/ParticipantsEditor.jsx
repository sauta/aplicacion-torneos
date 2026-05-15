import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar } from "./Avatar";
import { hasScores } from "../features/tournament/bracketEngine";
import { selectTournament } from "../features/tournament/selectors";
import {
  addParticipant,
  removeParticipant,
  reorderParticipant,
  updateParticipant
} from "../features/tournament/tournamentSlice";
import { uploadImage } from "../services/tournamentApi";

export function ParticipantsEditor({ notify }) {
  const dispatch = useDispatch();
  const tournament = useSelector(selectTournament);
  const [form, setForm] = useState({ name: "", kind: "player", image: "" });
  const [draggedId, setDraggedId] = useState(null);

  function canResetScores() {
    return !hasScores(tournament) || window.confirm("Cambiar el orden reiniciara los resultados actuales. Continuar?");
  }

  async function handleAdd(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      notify("Ingresa un nombre", "warning");
      return;
    }

    dispatch(addParticipant(form));
    setForm({ name: "", kind: "player", image: "" });
    event.currentTarget.reset();
    notify("Participante agregado");
  }

  async function handleNewImage(file) {
    if (!file) {
      setForm((current) => ({ ...current, image: "" }));
      return;
    }

    try {
      const image = await uploadImage(file);
      setForm((current) => ({ ...current, image }));
      notify("Imagen cargada");
    } catch (error) {
      notify("No se pudo subir la imagen", "error");
    }
  }

  async function updateImage(id, file) {
    if (!file) {
      return;
    }

    try {
      dispatch(updateParticipant({ id, changes: { image: await uploadImage(file) } }));
      notify("Imagen actualizada");
    } catch (error) {
      notify("No se pudo subir la imagen", "error");
    }
  }

  function moveParticipant(sourceIndex, targetIndex, message) {
    if (sourceIndex === targetIndex || !canResetScores()) {
      return;
    }

    dispatch(reorderParticipant({ sourceIndex, targetIndex }));
    notify(message || "Orden actualizado");
  }

  function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) {
      return;
    }

    const sourceIndex = tournament.participants.findIndex((participant) => participant.id === draggedId);
    let targetIndex = tournament.participants.findIndex((participant) => participant.id === targetId);

    if (sourceIndex < targetIndex) {
      targetIndex -= 1;
    }

    moveParticipant(sourceIndex, targetIndex);
    setDraggedId(null);
  }

  return (
    <section className="card panel-card">
      <div className="card-body">
        <h2 className="section-title">Participantes</h2>
        <form className="participant-form" onSubmit={handleAdd}>
          <div className="mb-2">
            <label className="form-label" htmlFor="newParticipantName">Nombre</label>
            <input
              className="form-control"
              id="newParticipantName"
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="off"
              required
            />
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label" htmlFor="newParticipantKind">Tipo</label>
              <select
                className="form-select"
                id="newParticipantKind"
                value={form.kind}
                onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="player">Jugador</option>
                <option value="team">Equipo</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="newParticipantImage">Imagen</label>
              <input
                className="form-control"
                id="newParticipantImage"
                type="file"
                accept="image/*"
                onChange={(event) => handleNewImage(event.target.files?.[0])}
              />
            </div>
          </div>
          <button className="btn btn-primary w-100 mt-3" type="submit">Agregar participante</button>
        </form>

        <div className="participant-list">
          {!tournament.participants.length ? (
            <div className="empty-state">Sin participantes.</div>
          ) : (
            tournament.participants.map((participant, index) => (
              <article
                className={`participant-card ${draggedId === participant.id ? "is-dragging" : ""}`}
                draggable
                key={participant.id}
                onDragStart={(event) => {
                  setDraggedId(participant.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", participant.id);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(participant.id)}
                onDragEnd={() => setDraggedId(null)}
              >
                <div className="participant-order">
                  <button
                    className="btn btn-outline-secondary btn-sm btn-icon"
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveParticipant(index, index - 1, "Participante subido")}
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm btn-icon"
                    type="button"
                    disabled={index === tournament.participants.length - 1}
                    onClick={() => moveParticipant(index, index + 1, "Participante bajado")}
                    title="Bajar"
                  >
                    ↓
                  </button>
                </div>
                <Avatar participant={participant} />
                <div className="participant-controls">
                  <input
                    className="form-control form-control-sm"
                    type="text"
                    value={participant.name}
                    onChange={(event) => dispatch(updateParticipant({
                      id: participant.id,
                      changes: { name: event.target.value }
                    }))}
                    autoComplete="off"
                  />
                  <select
                    className="form-select form-select-sm"
                    value={participant.kind}
                    onChange={(event) => dispatch(updateParticipant({
                      id: participant.id,
                      changes: { kind: event.target.value }
                    }))}
                  >
                    <option value="player">Jugador</option>
                    <option value="team">Equipo</option>
                  </select>
                  <div className="participant-actions">
                    <label className="btn btn-outline-secondary btn-sm btn-icon mb-0" title="Agregar imagen">
                      🖼️
                      <input
                        className="d-none"
                        type="file"
                        accept="image/*"
                        onChange={(event) => updateImage(participant.id, event.target.files?.[0])}
                      />
                    </label>
                    <button
                      className="btn btn-outline-secondary btn-sm btn-icon"
                      type="button"
                      onClick={() => {
                        dispatch(updateParticipant({ id: participant.id, changes: { image: "" } }));
                        notify("Imagen quitada");
                      }}
                      title="Quitar imagen"
                    >
                      ❌
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm btn-icon"
                      type="button"
                      onClick={() => {
                        // No permitir eliminar si el torneo ya empezó
                        if (hasScores(tournament)) {
                          notify("No se puede eliminar participantes una vez iniciado el torneo", "error");
                          return;
                        }

                        dispatch(removeParticipant(participant.id));
                        notify("Participante eliminado");
                      }}
                      title="Eliminar participante"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
