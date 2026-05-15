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

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ tournaments: [] }, null, 2));
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
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Solo se permiten imagenes"));
      return;
    }

    callback(null, true);
  }
});

const server = jsonServer.create();
const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults({
  logger: true,
  static: root
});

server.use(middlewares);
server.use("/uploads", express.static(uploadsDir));
server.use(jsonServer.bodyParser);

server.post("/api/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No se recibio ninguna imagen" });
    return;
  }

  res.status(201).json({
    fileName: req.file.filename,
    url: `/uploads/${req.file.filename}`
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
