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
  features/
    tournament/
      __tests__/
        bracketEngine.test.js    # Tests de lógica pura
        tournamentSlice.test.js  # Tests de Redux reducers
        selectors.test.js        # Tests de memoized selectors
```

## Cobertura Actual

### ✅ Módulos Testeados

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `bracketEngine.js` | 50+ | Lógica de brackets, validaciones, cálculos |
| `tournamentSlice.js` | 30+ | Actions de Redux, reducers, preparadores |
| `selectors.js` | 15+ | Selectores memoizados, estadísticas |

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

### 🎯 Pendientes de Implementar

1. **Tests de Componentes React**
   - `AdminBracket.jsx`
   - `ParticipantsEditor.jsx`
   - `EventEditor.jsx`

2. **Tests de Hooks Personalizados** (crear primero)
   - `useNotification()`
   - `useImageUpload()`

3. **Tests de Integración**
   - Flujo completo: crear torneo → agregar participantes → jugar matches → obtener campeón

4. **Tests E2E** (opcional)
   - Playwright o Cypress para flujos de usuario

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest-DOM Matchers](https://github.com/testing-library/jest-dom)

---

**Cobertura objetivo**: 80%+ en lógica de negocio crítica
