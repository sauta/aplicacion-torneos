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
  // Formato compatible con la importación existente
  return {
    id: tournament.id || "main",
    name: tournament.name,
    game: tournament.game,
    format: "single-elimination",
    bestOf: tournament.bestOf,
    // Rutas originales para importación directa (sin ZIP)
    banner: tournament.banner || "",
    logo: tournament.logo || "",
    participants: tournament.participants.map(p => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      // Ruta original para importación directa
      image: p.image || ""
    })),
    rounds: tournament.rounds
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

/**
 * Convierte un Blob a File para poder subirlo al servidor
 * @param {Blob} blob - Blob de la imagen
 * @param {string} filename - Nombre del archivo
 * @returns {File} - File object
 */
function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Importa un torneo completo desde un archivo ZIP
 * @param {File} zipFile - Archivo ZIP seleccionado por el usuario
 * @param {Function} uploadImage - Función para subir imágenes al servidor
 * @param {Function} onProgress - Callback opcional para reportar progreso (current, total, message)
 * @returns {Promise<object>} - Objeto tournament con URLs actualizadas
 */
export async function importTournamentZip(zipFile, uploadImage, onProgress = null) {
  // 1. Leer el archivo ZIP
  const zip = await JSZip.loadAsync(zipFile);

  // 2. Extraer el tournament.json
  const tournamentFile = zip.file("tournament.json");
  if (!tournamentFile) {
    throw new Error("El ZIP no contiene un archivo tournament.json");
  }

  const tournamentText = await tournamentFile.async("text");
  const tournament = JSON.parse(tournamentText);

  // 3. Obtener todas las imágenes de la carpeta images/
  const imagesFolder = zip.folder("images");
  if (!imagesFolder) {
    // Si no hay carpeta de imágenes, retornar el torneo tal cual
    return tournament;
  }

  const imageFiles = [];
  imagesFolder.forEach((relativePath, file) => {
    if (!file.dir) {
      imageFiles.push({ path: relativePath, file });
    }
  });

  let uploadedCount = 0;
  const totalImages = imageFiles.length;

  // 4. Crear un mapa de nombres de archivo a URLs nuevas
  const imageUrlMap = {};

  for (const { path, file } of imageFiles) {
    try {
      if (onProgress) {
        onProgress(uploadedCount + 1, totalImages, `Subiendo ${path}...`);
      }

      // Extraer el blob de la imagen
      const blob = await file.async("blob");
      
      // Convertir a File
      const fileObj = blobToFile(blob, path);

      // Subir al servidor
      const newUrl = await uploadImage(fileObj);

      // Guardar en el mapa
      imageUrlMap[path] = newUrl;

      uploadedCount++;
    } catch (error) {
      console.warn(`No se pudo subir la imagen ${path}:`, error);
      // Continuar con las demás imágenes
    }
  }

  // 5. Actualizar las URLs en el torneo
  
  // Banner
  if (tournament.banner) {
    const bannerFiles = Object.keys(imageUrlMap).filter(k => k.startsWith("banner."));
    if (bannerFiles.length > 0) {
      tournament.banner = imageUrlMap[bannerFiles[0]];
    }
  }

  // Logo
  if (tournament.logo) {
    const logoFiles = Object.keys(imageUrlMap).filter(k => k.startsWith("logo."));
    if (logoFiles.length > 0) {
      tournament.logo = imageUrlMap[logoFiles[0]];
    }
  }

  // Participantes
  if (tournament.participants) {
    tournament.participants = tournament.participants.map(participant => {
      if (participant.image) {
        const participantFiles = Object.keys(imageUrlMap).filter(
          k => k.startsWith(`participant_${participant.id}.`)
        );
        if (participantFiles.length > 0) {
          return {
            ...participant,
            image: imageUrlMap[participantFiles[0]]
          };
        }
      }
      return participant;
    });
  }

  if (onProgress) {
    onProgress(totalImages, totalImages, "Importación completa");
  }

  return tournament;
}
