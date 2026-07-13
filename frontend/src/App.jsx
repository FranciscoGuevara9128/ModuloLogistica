import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Entregas from './pages/Entregas';
import Transito from './pages/Transito';
import Solicitudes from './pages/Solicitudes';
import Devoluciones from './pages/Devoluciones';
import Recepcion from './pages/Recepcion';
import Facturacion from './pages/Facturacion';
import Gestion from './pages/Gestion';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import Transferencias from './pages/Transferencias';
import Traslados from './pages/Traslados';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Rutas protegidas genéricas (cualquier rol logueado) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="devoluciones" element={<Devoluciones />} />
          <Route path="perfil" element={<Perfil />} />

          {/* Rutas para Admin y Cliente Directo */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CLIENTE_DIRECTO']} />}>
            <Route path="transito" element={<Transito />} />
            <Route path="transferencias" element={<Transferencias />} />
            <Route path="traslados" element={<Traslados />} />
            <Route path="solicitudes" element={<Solicitudes />} />
          </Route>

          {/* Rutas Solo Admin */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="entregas" element={<Entregas />} />
            <Route path="recepcion" element={<Recepcion />} />
            <Route path="facturacion" element={<Facturacion />} />
            <Route path="gestion" element={<Gestion />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
