export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

export function safeImage(src) {
  if (typeof src !== "string") {
    return "";
  }

  const value = src.trim();

  if (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/assets/") || value.startsWith("/uploads/")) {
    return value;
  }

  return "";
}

export function participantLabel(participant) {
  return participant?.kind === "team" ? "Equipo" : "Jugador";
}
