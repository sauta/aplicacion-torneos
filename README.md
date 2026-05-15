# 🏆 Aplicación de Torneos

Sistema completo de gestión de torneos con brackets eliminatorios, desarrollado con React 19 y Redux Toolkit.

## 🚀 Stack Tecnológico

- **Frontend**: React 19 + Redux Toolkit 2 + React Router 7
- **Build Tool**: Vite 6
- **Backend**: Express + JSON Server
- **Estilos**: Bootstrap 5
- **Package Manager**: pnpm

## 📦 Instalación

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo (frontend + API)
pnpm dev
```

Esto iniciará:
- Frontend en `http://127.0.0.1:5173`
- API REST en `http://127.0.0.1:3001`

## 🎯 Características

### Panel de Administración (`/admin`)
- ✅ Editor de información del evento
- ✅ Gestión de participantes (jugadores/equipos)
- ✅ Bracket administrativo con controles de edición
- ✅ Carga de imágenes (banner y logo)
- ✅ Métricas del torneo en tiempo real

### Vista Pública (`/view`)
- ✅ Visualización del bracket en modo lectura
- ✅ Strip de campeón destacado
- ✅ Hero con branding del torneo

## 🏗️ Arquitectura

### Redux Feature-Slice
```
src/
  features/
    tournament/
      tournamentSlice.js    # Reducers + Actions
      selectors.js          # Memoized selectors
      bracketEngine.js      # Lógica de brackets
      tournamentStorage.js  # Persistencia
```

### Componentes
```
src/components/
  AdminBracket.jsx         # Bracket con edición
  PublicBracket.jsx        # Bracket en modo lectura
  ParticipantsEditor.jsx   # CRUD de participantes
  EventEditor.jsx          # Configuración del evento
  MetricsGrid.jsx          # Estadísticas
```

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Inicia frontend + API en desarrollo |
| `pnpm build` | Genera build de producción |
| `pnpm preview` | Preview del build de producción |
| `pnpm test` | Ejecuta tests en modo watch |
| `pnpm test:run` | Ejecuta tests una vez (CI) |
| `pnpm test:ui` | Abre UI interactiva de Vitest |
| `pnpm test:coverage` | Genera reporte de cobertura |

## 🧪 Testing

El proyecto cuenta con **95+ tests unitarios** cubriendo la lógica crítica:

- ✅ **bracketEngine.js**: 50+ tests (construcción de brackets, scores, validaciones)
- ✅ **tournamentSlice.js**: 30+ tests (Redux actions, reducers, state mutations)
- ✅ **selectors.js**: 15+ tests (selectores memoizados, estadísticas)

**Stack**: Vitest 2.x + Testing Library + jest-dom

```bash
# Ejecutar tests
pnpm test

# Ver cobertura
pnpm test:coverage
```

Ver [guía completa de testing](src/features/tournament/__tests__/README.md) para más detalles.


## 🛠️ Configuración Vite

- **Multi-entry**: `index.html` (admin) y `view.html` (público)
- **Proxy automático**: `/api` → puerto 3001
- **Hot Module Replacement** habilitado

## 📂 Estructura del Proyecto

```
├── .github/agents/          # Agentes personalizados de Copilot
├── assets/                  # Recursos estáticos (CSS, imágenes)
├── data/                    # Datos de torneos
├── scripts/                 # Scripts de servidor (dev, API)
├── src/
│   ├── app/                 # Store Redux + App principal
│   ├── components/          # Componentes React
│   ├── features/            # Redux slices (feature-based)
│   └── lib/                 # Utilidades
├── uploads/                 # Archivos subidos (banner, logos)
├── index.html               # Entry point admin
├── view.html                # Entry point público
└── vite.config.js           # Configuración Vite
```

## 🔧 Próximas Mejoras

- [ ] Implementar drag-and-drop para reordenar participantes
- [ ] Agregar gráficos de progreso del torneo
- [ ] Sistema de notificaciones en tiempo real
- [ ] Exportar brackets a PDF
- [ ] Modo oscuro

## 📝 Licencia

Proyecto privado - Todos los derechos reservados
