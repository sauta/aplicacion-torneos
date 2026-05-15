const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const jsonServer = require("json-server");
const multer = require("multer");

const root = path.resolve(__dirname, "..");
const dbPath = path.join(root, "db.json");
const uploadsDir = path.join(root, "uploads");
const port = Number(process.env.API_PORT || 3001);

fs.mkdirSync(uploadsDir, { recursive: true });

const defaultDB = {
  tournaments: [
    {
      id: "main",
      name: "Torneo Principal",
      game: "Juego competitivo",
      format: "single-elimination",
      bestOf: 3,
      banner: "",
      logo: "",
      participants: [],
      rounds: []
    }
  ]
};

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2));
  console.log(`[api] Created db.json at ${dbPath}`);
} else {
  console.log(`[api] Using existing db.json at ${dbPath}`);
  // Verificar que el archivo sea escribible
  try {
    fs.accessSync(dbPath, fs.constants.W_OK);
    console.log(`[api] db.json is writable`);
  } catch (err) {
    console.error(`[api] ERROR: db.json is not writable!`, err.message);
  }
}

function sanitizeFileName(value) {
  return String(value || "image")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "image";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, callback) => {
      const original = sanitizeFileName(file.originalname);
      const extension = path.extname(original) || ".jpg";
      const base = path.basename(original, extension).slice(0, 64) || "image";
      callback(null, `${Date.now()}-${base}${extension}`);
    }
  }),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB para soportar PNG más pesados
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp"
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      console.log(`[api] Archivo rechazado: ${file.mimetype} - ${file.originalname}`);
      callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
      return;
    }
    
    console.log(`[api] Archivo aceptado: ${file.mimetype} - ${file.originalname}`);
    callback(null, true);
  }
});

const server = jsonServer.create();
const router = jsonServer.router(dbPath, {
  _isFake: false // Asegurar que se escriba al archivo
});
const middlewares = jsonServer.defaults({
  logger: true,
  static: root
});

server.use(middlewares);
server.use("/uploads", express.static(uploadsDir));
server.use(jsonServer.bodyParser);

server.post("/api/uploads", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error(`[api] Error al subir imagen:`, err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "La imagen es muy grande (máximo 16MB)" });
        }
        return res.status(400).json({ error: `Error de carga: ${err.message}` });
      }
      
      return res.status(400).json({ error: err.message || "Error al subir la imagen" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ninguna imagen" });
    }
    
    console.log(`[api] Imagen guardada: ${req.file.filename} (${req.file.size} bytes)`);
    
    res.status(201).json({
      fileName: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

server.use("/api", router);

server.use((error, req, res, next) => {
  if (!error) {
    next();
    return;
  }

  res.status(400).json({ error: error.message || "Error procesando la solicitud" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`JSON API ready at http://127.0.0.1:${port}/api`);
  console.log(`Uploads ready at http://127.0.0.1:${port}/uploads`);
});
