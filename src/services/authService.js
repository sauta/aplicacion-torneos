// Credenciales pre-seteadas
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Admin123";
const AUTH_KEY = "tournament-admin:auth";

export function login(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const authData = {
      isAuthenticated: true,
      username: ADMIN_USERNAME,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    return { success: true };
  }
  return { success: false, error: "Usuario o contraseña incorrectos" };
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return false;
    
    const parsed = JSON.parse(authData);
    
    // Verificar que no haya expirado (24 horas)
    const expirationTime = 24 * 60 * 60 * 1000; // 24 horas en ms
    const isExpired = (Date.now() - parsed.timestamp) > expirationTime;
    
    if (isExpired) {
      logout();
      return false;
    }
    
    return parsed.isAuthenticated === true;
  } catch (error) {
    return false;
  }
}

export function getAuthData() {
  try {
    const authData = localStorage.getItem(AUTH_KEY);
    return authData ? JSON.parse(authData) : null;
  } catch (error) {
    return null;
  }
}
