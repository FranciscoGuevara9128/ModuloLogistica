// IMPORTANTE: 'dotenv/config' debe ser el PRIMER import.
// En ES Modules, los imports se ejecutan antes del cuerpo del módulo.
// Esto garantiza que process.env esté poblado antes de que supabase.js se inicialice.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import movimientosRoutes from './routes/movimientos.routes.js';
import facturacionRoutes from './routes/facturacion.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import referenciasRoutes from './routes/referencias.routes.js';
import authRoutes from './routes/auth.routes.js';
import gestionRoutes from './routes/gestion.routes.js';
import solicitudesRoutes from './routes/solicitudes.routes.js';

// ── Guardia de arranque: variables de entorno críticas ────────
const missingVars = [];
if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
if (!process.env.SUPABASE_KEY) missingVars.push('SUPABASE_KEY');
if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');

if (missingVars.length > 0) {
  console.error(`FATAL: Variables de entorno críticas no definidas: ${missingVars.join(', ')}. El servidor no puede iniciar.`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', movimientosRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/gestion', gestionRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/referencias', referenciasRoutes);
app.use('/api', solicitudesRoutes);

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
