import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../services/authService";

export function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      const result = login(username, password);
      
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error);
        setPassword("");
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>Panel Administrador</h1>
          <p>Ingresa tus credenciales para continuar</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              autoComplete="username"
              autoFocus
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>

        <Link to="/view" className="login-back-link">
          ← Volver a la vista pública
        </Link>

        <div className="login-footer">
          <small>Credenciales de prueba disponibles en la documentación</small>
        </div>
      </div>
    </div>
  );
}
