# 🧪 Testing Guide

## Configuración

El proyecto usa **Vitest** como test runner y **Testing Library** para componentes React.

### Stack de Testing

- **Vitest 2.x**: Test runner ultrarrápido con HMR
- **@testing-library/react**: Testing de componentes React
- **@testing-library/jest-dom**: Matchers personalizados para DOM
- **jsdom**: Entorno DOM simulado para Node.js

## Ejecutar Tests

```bash
# Modo watch (recomendado para desarrollo)
pnpm test

# Ejecutar una vez (para CI)
pnpm test:run

# UI interactiva de Vitest
pnpm test:ui

# Con reporte de cobertura
pnpm test:coverage
```

## Estructura de Tests

```
src/
  components/
    __tests__/
      Avatar.test.jsx          # Tests del componente Avatar
      ThemeToggle.test.jsx     # Tests de tema claro/oscuro
      MetricsGrid.test.jsx     # Tests de estadísticas del torneo
  features/
    tournament/
      __tests__/
        bracketEngine.test.js    # Tests de lógica pura
        tournamentSlice.test.js  # Tests de Redux reducers
        selectors.test.js        # Tests de memoized selectors
  lib/
    __tests__/
      text.test.js             # Tests de utilidades (escapeHtml, initials, etc.)
  services/
    __tests__/
      tournamentApi.test.js    # Tests de API y persistencia
```

## Cobertura Actual

### ✅ Módulos Testeados

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| **Lógica de Negocio** |||
| `bracketEngine.js` | 50+ | Lógica de brackets, validaciones, cálculos |
| `tournamentSlice.js` | 30+ | Actions de Redux, reducers, preparadores |
| `selectors.js` | 15+ | Selectores memoizados, estadísticas |
| `tournamentApi.js` | 30+ | **NUEVO** - Normalización, encode/decode, persistencia |
| **Utilidades** |||
| `lib/text.js` | 25+ | **NUEVO** - escapeHtml, initials, safeImage, labels |
| **Componentes React** |||
| `Avatar.jsx` | 15+ | Renderizado de avatares con fallback |
| `ThemeToggle.jsx` | 10+ | Toggle de tema con persistencia |
| `MetricsGrid.jsx` | 20+ | **NUEVO** - Visualización de estadísticas |

### 🎯 Áreas Clave Cubiertas

#### bracketEngine.js
- ✅ Generación de IDs únicos
- ✅ Normalización de `bestOf` (siempre impar, capped a 9)
- ✅ Cálculo de victorias necesarias
- ✅ Construcción de brackets con potencias de 2
- ✅ Manejo de byes (slots nulos)
- ✅ Propagación de winners entre rondas
- ✅ Actualización de scores con validación
- ✅ Detección de campeón
- ✅ Recálculo automático de brackets

#### tournamentSlice.js
- ✅ Hidratación de torneo desde API
- ✅ Reset a estado default
- ✅ Actualización de metadata (nombre, juego, bestOf)
- ✅ CRUD de participantes (crear, editar, eliminar)
- ✅ Reordenamiento de participantes con validación
- ✅ Actualización de imágenes (banner, logo)
- ✅ Set de scores con limits
- ✅ Rebuild automático de brackets

#### selectors.js
- ✅ Selector de torneo completo
- ✅ Map de participantes por ID (O(1) lookup)
- ✅ Selector de campeón
- ✅ Estadísticas agregadas del torneo
- ✅ Memoización correcta

#### tournamentApi.js ⭐ NUEVO
- ✅ `clone()` - Deep copy de objetos y arrays
- ✅ `normalizeTournament()` - Validación y normalización completa
  - Trim de strings, defaults, validación de bestOf
  - Normalización de participantes (IDs, nombres, kind, images)
  - Normalización de rounds/matches (IDs, scores, slots)
  - Auto-construcción de brackets
- ✅ `encodeTournament()` / `decodeTournament()` - Compresión para sharing
- ✅ `readJsonFile()` - Lectura y validación de archivos JSON
- ✅ `clearTournament()` - Limpieza de localStorage
- ✅ Edge cases: unicode, archivos grandes, datos malformados

#### lib/text.js ⭐ NUEVO
- ✅ `escapeHtml()` - Prevención de XSS
- ✅ `initials()` - Generación de iniciales
- ✅ `safeImage()` - Validación de URLs de imágenes
- ✅ `participantLabel()` - Labels de "Jugador" vs "Equipo"
- ✅ Edge cases: emojis, caracteres especiales, valores null/undefined

#### MetricsGrid.jsx ⭐ NUEVO
- ✅ Renderizado de las 4 métricas principales
- ✅ Integración con Redux (selectTournamentStats)
- ✅ Cálculo de targetWins basado en bestOf
- ✅ Visualización de campeón (con fallback "Pendiente")
- ✅ Reactividad ante cambios del store (addParticipant, updateEvent)
- ✅ Accesibilidad (semantic HTML, aria-labels)
- ✅ Edge cases: 1000+ participantes, nombres con caracteres especiales

## Escribir Tests Nuevos

### Ejemplo: Test de Función Pura

```javascript
import { describe, it, expect } from 'vitest';
import { myPureFunction } from '../myModule';

describe('myPureFunction', () => {
  it('should return expected output for valid input', () => {
    const result = myPureFunction(5);
    expect(result).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(myPureFunction(0)).toBe(0);
    expect(myPureFunction(-1)).toBe(0);
  });
});
```

### Ejemplo: Test de Redux Slice

```javascript
import { configureStore } from '@reduxjs/toolkit';
import myReducer, { myAction } from '../mySlice';

describe('mySlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { myFeature: myReducer }
    });
  });

  it('should update state correctly', () => {
    store.dispatch(myAction({ value: 'test' }));
    const state = store.getState().myFeature;
    
    expect(state.value).toBe('test');
  });
});
```

### Ejemplo: Test de Componente

```javascript
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const store = configureStore({ /* config */ });
    
    render(
      <Provider store={store}>
        <MyComponent />
      </Provider>
    );
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Matchers Útiles

### Jest-DOM Matchers
```javascript
// Visibilidad
expect(element).toBeInTheDocument()
expect(element).toBeVisible()

// Contenido
expect(element).toHaveTextContent('text')
expect(element).toContainHTML('<span>')

// Atributos
expect(element).toHaveAttribute('disabled')
expect(element).toHaveClass('active')

// Formularios
expect(input).toHaveValue('value')
expect(checkbox).toBeChecked()
```

### Vitest Matchers
```javascript
// Igualdad
expect(value).toBe(expected)          // ===
expect(object).toEqual(expected)      // deep equal
expect(array).toContain(item)

// Numéricos
expect(number).toBeGreaterThan(5)
expect(number).toBeLessThanOrEqual(10)

// Propiedades
expect(obj).toHaveProperty('key')
expect(obj).toHaveProperty('key', 'value')

// Colecciones
expect(array).toHaveLength(3)
expect(string).toMatch(/regex/)

// Booleanos
expect(value).toBeTruthy()
expect(value).toBeNull()
expect(value).toBeUndefined()
```

## Best Practices

### ✅ Hacer

- **Testear lógica de negocio crítica**: `bracketEngine.js`, cálculos, validaciones
- **Un concepto por test**: cada `it()` valida una cosa específica
- **Descriptores claros**: `it('should auto-advance player when opponent is null')`
- **Arrange-Act-Assert**: setup → ejecución → verificación
- **Edge cases**: valores nulos, arrays vacíos, bounds
- **Nombres descriptivos**: `mockParticipants`, `invalidInput`

### ❌ Evitar

- **No testear implementación interna**: testea resultados, no cómo se logran
- **No acoplar a estructura DOM**: usa roles y labels semánticos
- **No tests frágiles**: que fallan por cambios triviales de UI
- **No duplicar lógica en tests**: usa helpers y factories
- **No ignorar warnings**: siempre mockea dependencias externas

## Configuración

### [vitest.config.js](../../vitest.config.js)
- Environment: jsdom
- Globals: true (no imports de `describe`, `it`, etc.)
- Setup: `src/test/setup.js` (configura jest-dom)
- Coverage: v8 provider

### [src/test/setup.js](../test/setup.js)
- Extiende `expect` con matchers de jest-dom
- Auto-cleanup después de cada test

## Próximos Pasos

### ✅ Completados Recientemente

1. **Tests de Utilidades** ✓
   - ✅ `lib/text.js` - Todas las funciones utilitarias
   
2. **Tests de Servicios** ✓
   - ✅ `services/tournamentApi.js` - Normalización, encode/decode, persistencia

3. **Tests de Componentes React** ✓
   - ✅ `Avatar.jsx`
   - ✅ `ThemeToggle.jsx`
   - ✅ `MetricsGrid.jsx`

### 🎯 Pendientes de Implementar

1. **Tests de Componentes React Complejos** (Prioridad Alta)
   - `DataTools.jsx` - Exportar/importar JSON, copiar links
   - `ParticipantsEditor.jsx` - CRUD completo de participantes
   - `EventEditor.jsx` - Formulario de metadata del torneo
   - `AdminBracket.jsx` / `PublicBracket.jsx` - Visualización de brackets
   - `ChampionStrip.jsx` - Banner del ganador
   - `StatusToast.jsx` - Sistema de notificaciones

2. **Tests de Páginas** (Prioridad Media)
   - `pages/AdminPage.jsx` - Integración completa admin
   - `pages/PublicPage.jsx` - Vista pública con polling

3. **Tests de Hooks Personalizados** (Crear primero)
   - `useNotification()` - Si existe como hook customizado
   - `useImageUpload()` - Si existe como hook customizado

4. **Tests de Integración** (Prioridad Media)
   - Flujo completo: crear torneo → agregar participantes → jugar matches → obtener campeón
   - Sincronización entre Admin y Vista Pública

5. **Tests E2E** (Prioridad Baja / Opcional)
   - Playwright o Cypress para flujos críticos de usuario
   - Pruebas de deployment en Railway

### 📊 Cobertura Actual Estimada

- **Lógica de Negocio**: ~90% ✓ (bracketEngine, slice, selectors, api)
- **Utilidades**: 100% ✓ (text.js)
- **Componentes Simple**: ~40% (3 de ~12 componentes)
- **Componentes Complejos**: 0% (DataTools, ParticipantsEditor, etc.)
- **Páginas**: 0%
- **E2E**: 0%

**Objetivo**: 80%+ de cobertura en lógica crítica (ya alcanzado ✓)

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest-DOM Matchers](https://github.com/testing-library/jest-dom)

---

**Cobertura objetivo**: 80%+ en lógica de negocio crítica
