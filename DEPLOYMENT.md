# Aplicación de Torneos

Aplicación web para gestionar torneos de deportes electrónicos con interfaz moderna y tema oscuro.

## Características

- ✨ Gestión completa de torneos
- 👥 Administración de participantes
- 🎮 Soporte para múltiples juegos
- 🌓 Modo claro y oscuro
- 📱 Interfaz responsiva
- 🎨 Diseño moderno con iconos intuitivos

## Deployment en Render

### Opción 1: Deploy Automático desde GitHub

1. Ve a [render.com](https://render.com) y crea una cuenta (puedes usar tu cuenta de GitHub)

2. Click en **"New +"** → **"Blueprint"**

3. Conecta tu repositorio de GitHub: `sauta/aplicacion-torneos`

4. Render detectará automáticamente el archivo `render.yaml` y configurará el servicio

5. Click en **"Apply"** y espera a que se complete el deployment (5-10 minutos)

6. Una vez completado, Render te dará una URL como: `https://aplicacion-torneos.onrender.com`

### Opción 2: Deploy Manual

1. Ve a [render.com](https://render.com) y crea una cuenta

2. Click en **"New +"** → **"Web Service"**

3. Conecta tu repositorio: `sauta/aplicacion-torneos`

4. Configura:
   - **Name**: `aplicacion-torneos`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: `Free`

5. Click en **"Create Web Service"**

6. Espera a que se complete el deployment

### Notas Importantes

- ⚠️ El plan gratuito de Render pone el servicio en "sleep" después de 15 minutos de inactividad
- 🔄 El primer acceso después del "sleep" puede tardar 30-60 segundos en cargar
- 💾 Los archivos subidos (imágenes) se mantienen mientras el servicio esté activo
- 🔄 Cada nuevo deploy reinicia el servidor y limpia los archivos temporales

## Desarrollo Local

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# El frontend estará en: http://127.0.0.1:5173
# El API estará en: http://127.0.0.1:3001
```

## Tecnologías

- **Frontend**: React 19 + Redux Toolkit + Vite
- **Backend**: Express + json-server
- **Estilos**: Bootstrap 5 + CSS Custom Properties
- **Deployment**: Render.com (recomendado)

## Alternativas de Hosting

### Railway (muy fácil)
1. Ve a [railway.app](https://railway.app)
2. Click en "Start a New Project" → "Deploy from GitHub repo"
3. Selecciona el repositorio
4. Railway detectará automáticamente la configuración

### Vercel (solo frontend)
- Requiere separar el backend o usar otro servicio para el API

### Netlify (solo frontend)  
- Similar a Vercel, solo para sitios estáticos
