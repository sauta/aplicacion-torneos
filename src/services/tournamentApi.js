import { defaultTournament } from "../features/tournament/defaultTournament";
import { buildBracket, createId, normalizeBestOf, recalculateBracket } from "../features/tournament/bracketEngine";

export const STORAGE_KEY = "tournament-admin:data:v1";
export const TOURNAMENT_API_URL = "/api/tournaments/main";
export const UPLOAD_API_URL = "/api/uploads";

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeTournament(source) {
  const data = { ...clone(defaultTournament), ...(source || {}) };

  data.id = typeof data.id === "string" && data.id ? data.id : createId("tournament");
  data.name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Torneo Principal";
  data.game = typeof data.game === "string" && data.game.trim() ? data.game.trim() : "Juego competitivo";
  data.format = "single-elimination";
  data.bestOf = normalizeBestOf(data.bestOf);
  data.banner = typeof data.banner === "string" ? data.banner : "";
  data.logo = typeof data.logo === "string" ? data.logo : "";
  data.participants = Array.isArray(data.participants)
    ? data.participants.map((participant, index) => ({
      id: typeof participant.id === "string" && participant.id ? participant.id : createId("p"),
      name: typeof participant.name === "string" && participant.name.trim() ? participant.name.trim() : `Participante ${index + 1}`,
      kind: participant.kind === "team" ? "team" : "player",
      image: typeof participant.image === "string" ? participant.image : ""
    }))
    : [];

  data.rounds = Array.isArray(data.rounds)
    ? data.rounds.map((round, roundIndex) => (
      Array.isArray(round)
        ? round.map((match, matchIndex) => {
          const slots = Array.isArray(match.slots) ? match.slots.slice(0, 2) : [null, null];
          const scores = Array.isArray(match.scores) ? match.scores.slice(0, 2) : [0, 0];

          return {
            id: typeof match.id === "string" && match.id ? match.id : createId("m"),
            round: roundIndex,
            index: matchIndex,
            slots: [slots[0] || null, slots[1] || null],
            scores: [
              Math.max(0, Number.parseInt(scores[0], 10) || 0),
              Math.max(0, Number.parseInt(scores[1], 10) || 0)
            ],
            winner: typeof match.winner === "string" ? match.winner : null
          };
        })
        : []
    ))
    : [];

  if (!data.rounds.length && data.participants.length >= 2) {
    data.rounds = buildBracket(data.participants, data.bestOf);
  }

  return recalculateBracket(data);
}

export async function loadTournament() {
  try {
    const response = await fetch(TOURNAMENT_API_URL, { cache: "no-store" });

    if (response.ok) {
      return normalizeTournament(await response.json());
    }
  } catch (error) {
    // The static fallback keeps the UI usable if the mock API is not running.
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      return normalizeTournament(JSON.parse(stored));
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const response = await fetch("/data/tournament.json", { cache: "no-store" });

    if (response.ok) {
      return normalizeTournament(await response.json());
    }
  } catch (error) {
    // Direct file previews may block fetch; the bundled default keeps the app usable.
  }

  return normalizeTournament(defaultTournament);
}

export async function saveTournament(tournament) {
  const normalized = normalizeTournament(tournament);
  normalized.id = "main";

  try {
    const response = await fetch(TOURNAMENT_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(normalized)
    });

    if (!response.ok) {
      throw new Error("No se pudo guardar en la API");
    }
  } catch (error) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    throw error;
  }
}

export function clearTournament() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function uploadImage(file) {
  if (!file) {
    return "";
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(UPLOAD_API_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let errorMessage = "No se pudo subir la imagen";
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Si no se puede parsear el JSON, usar el mensaje por defecto
    }
    
    console.error(`Error al subir imagen: ${response.status} - ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const payload = await response.json();
  return payload.url || "";
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(normalizeTournament(JSON.parse(String(reader.result || "{}"))));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function downloadJson(tournament) {
  const normalized = normalizeTournament(tournament);
  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = normalized.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "torneo";

  link.href = url;
  link.download = `${safeName}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function encodeText(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function decodeText(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

export function encodeTournament(tournament) {
  return encodeText(JSON.stringify(normalizeTournament(tournament)));
}

export function decodeTournament(payload) {
  return normalizeTournament(JSON.parse(decodeText(decodeURIComponent(payload))));
}

export function getSharedTournamentFromHash() {
  const hash = window.location.hash.replace(/^#/, "");

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const payload = params.get("data");

  if (!payload) {
    return null;
  }

  try {
    return decodeTournament(payload);
  } catch (error) {
    return null;
  }
}

export function makeShareUrl(tournament) {
  const url = new URL("/view", window.location.href);
  return url.toString();
}

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-999px";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}
