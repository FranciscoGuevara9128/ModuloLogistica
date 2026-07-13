const loginAttempts = new Map();

export const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // Ventana de 15 minutos
  const MAX_ATTEMPTS = 5; // Máximo 5 intentos

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  const attempts = loginAttempts.get(ip).filter(timestamp => now - timestamp < WINDOW_MS);
  attempts.push(now);
  loginAttempts.set(ip, attempts);

  if (attempts.length > MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Demasiados intentos de inicio de sesión. Por favor intente de nuevo en 15 minutos.'
    });
  }

  next();
};
