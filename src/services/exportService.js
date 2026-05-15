import JSZip from "jszip";

/**
 * Descarga una imagen desde una URL y la convierte a blob
 * @param {string} url - URL de la imagen
 * @returns {Promise<Blob|null>} - Blob de la imagen o null si falla
 */
async function fetchImageAsBlob(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.warn(`No se pudo descargar la imagen: ${url}`, error);
    return null;
  }
}

/**
 * Obtiene la extensión del archivo desde la URL o el tipo MIME
 * @param {string} url - URL de la imagen
 * @param {string} mimeType - Tipo MIME del blob
 * @returns {string} - Extensión del archivo
 */
function getImageExtension(url, mimeType) {
  // Intentar obtener extensión de la URL
  const urlMatch = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  if (urlMatch) {
    return urlMatch[1].toLowerCase();
  }

  // Fallback al tipo MIME
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg"
  };

  return mimeMap[mimeType] || "jpg";
}

/**
 * Crea un JSON optimizado del torneo para compartir
 * @param {object} tournament - Estado del torneo
 * @returns {object} - Objeto JSON del torneo
 */
function createTournamentJson(tournament) {
  return {
    version: "1.0",
    exported: new Date().toISOString(),
    tournament: {
      name: tournament.name,
      game: tournament.game,
      bestOf: tournament.bestOf,
      participants: tournament.participants.map(p => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        // Referencia relativa a la imagen en el ZIP
        image: p.image ? `images/participant_${p.id}.jpg` : ""
      })),
      rounds: tournament.rounds,
      // Referencias relativas para banner y logo
      banner: tournament.banner ? "images/banner.jpg" : "",
      logo: tournament.logo ? "images/logo.jpg" : ""
    }
  };
}

/**
 * Exporta el torneo completo con todas las imágenes en formato ZIP
 * @param {object} tournament - Estado del torneo desde Redux
 * @returns {Promise<void>}
 */
export async function exportTournamentZip(tournament) {
  const zip = new JSZip();

  // 1. Agregar el JSON del torneo
  const tournamentData = createTournamentJson(tournament);
  zip.file("tournament.json", JSON.stringify(tournamentData, null, 2));

  // 2. Crear carpeta de imágenes
  const imagesFolder = zip.folder("images");

  // 3. Descargar y agregar el banner si existe
  if (tournament.banner) {
    const bannerBlob = await fetchImageAsBlob(tournament.banner);
    if (bannerBlob) {
      const ext = getImageExtension(tournament.banner, bannerBlob.type);
      imagesFolder.file(`banner.${ext}`, bannerBlob);
    }
  }

  // 4. Descargar y agregar el logo si existe
  if (tournament.logo) {
    const logoBlob = await fetchImageAsBlob(tournament.logo);
    if (logoBlob) {
      const ext = getImageExtension(tournament.logo, logoBlob.type);
      imagesFolder.file(`logo.${ext}`, logoBlob);
    }
  }

  // 5. Descargar y agregar avatares de participantes
  for (const participant of tournament.participants) {
    if (participant.image) {
      const imageBlob = await fetchImageAsBlob(participant.image);
      if (imageBlob) {
        const ext = getImageExtension(participant.image, imageBlob.type);
        imagesFolder.file(`participant_${participant.id}.${ext}`, imageBlob);
      }
    }
  }

  // 6. Generar el archivo ZIP
  const blob = await zip.generateAsync({ type: "blob" });

  // 7. Descargar el archivo
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.zip`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
