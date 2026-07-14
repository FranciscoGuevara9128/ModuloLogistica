import { useState, useEffect } from 'react';
import { liberarPolines, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const BADGE = {
  ALMACENAMIENTO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TRANSPORTE:     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PULL_FIJO:      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
};

const Devoluciones = () => {
  const [formData, setFormData] = useState({ grupo_movimiento: '', cantidad_liberar: '', fecha_manual: '' });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [referencias, setReferencias] = useState({ movimientos_activos: [] });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        let currentRole = '';
        try {
          const userStr = localStorage.getItem('polines_user');
          if (userStr) currentRole = JSON.parse(userStr).role;
        } catch (e) {}

        const agrupados = data.data.movimientos_activos.reduce((acc, mov) => {
          if (!mov.tipo_polin || !mov.color_polin) return acc;
          if (currentRole === 'CLIENTE_DIRECTO' && mov.estado_uso === 'TRANSPORTE') return acc; // NO permite liberar envíos a clientes finales
          
          const dueño_id = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.id : mov.cliente_directo?.id;
          const dueño_nombre = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.nombre : mov.cliente_directo?.nombre;
          if (!dueño_id) return acc;

          const key = `${mov.estado_uso}|${dueño_id}|${mov.tipo_polin.id}|${mov.color_polin.id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              estado_uso: mov.estado_uso,
              cliente_dueño_id: dueño_id,
              tipo_polin_id: mov.tipo_polin.id,
              color_polin_id: mov.color_polin.id,
              dueño_nombre: dueño_nombre,
              tipo_nombre: mov.tipo_polin.nombre,
              color_nombre: mov.color_polin.nombre,
              cantidad_restante: 0
            };
          }
          acc[key].cantidad_restante += mov.cantidad_restante;
          return acc;
        }, {});

        const lotes_agrupados = Object.values(agrupados).map(g => ({
          ...g,
          label: `[${g.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : g.estado_uso === 'TRANSPORTE' ? 'Tránsito' : g.estado_uso}] Cliente: ${g.dueño_nombre} | Disponible: ${g.cantidad_restante} (${g.color_nombre})`
        }));

        setReferencias({ movimientos_activos: lotes_agrupados });
      }
    } catch (err) {
      console.error('Error cargando referencias:', err);
    }
  };

  useEffect(() => {
    fetchReferencias();
  }, []);

  const handleMovimientoChange = (e) => {
    const id = e.target.value;
    const mov = referencias.movimientos_activos.find(m => m.id === id);
    setMovSeleccionado(mov || null);
    setFormData({
      grupo_movimiento: id,
      cantidad_liberar: mov ? mov.cantidad_restante : '',
      fecha_manual: ''
    });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    try {
      const cantidadEnviada = parseInt(formData.cantidad_liberar, 10);
      const result = await liberarPolines({
        estado_uso: movSeleccionado.estado_uso,
        cliente_dueño_id: movSeleccionado.cliente_dueño_id,
        tipo_polin_id: movSeleccionado.tipo_polin_id,
        color_polin_id: movSeleccionado.color_polin_id,
        cantidad_liberar: cantidadEnviada
      });

      const { message } = result.data.data;
      setMensaje({
        tipo: 'success',
        texto: message
      });

      setFormData({ grupo_movimiento: '', cantidad_liberar: '', fecha_manual: '' });
      setMovSeleccionado(null);
      
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al devolver polines. ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!movSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar el inventario a devolver.' });
      return;
    }
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Devolución de Polines</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            Devuelve polines de tu planta o de clientes finales. Pasarán a pendiente de recepción.
          </p>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-xl flex justify-between items-center transition-all ${
          mensaje.tipo === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
        }`}>
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Procedencia (Lote de origen) */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
          <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Origen del Inventario</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Inventario a Devolver
            </label>
            <select
              name="grupo_movimiento"
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.grupo_movimiento}
              onChange={handleMovimientoChange}
            >
              <option value="">-- Seleccione el Inventario --</option>
              {referencias.movimientos_activos.map(mov => (
                <option key={mov.id} value={mov.id}>{mov.label}</option>
              ))}
            </select>

            {movSeleccionado && (
              <div className="mt-2.5 flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE[movSeleccionado.estado_uso] || 'bg-gray-100 text-gray-700'}`}>
                  {movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : movSeleccionado.estado_uso === 'TRANSPORTE' ? 'Tránsito' : movSeleccionado.estado_uso}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Disponibles totales: <strong>{movSeleccionado.cantidad_restante}</strong> unidades
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Detalles y Cantidad */}
        {movSeleccionado && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                Cantidad a Devolver
              </label>
              <input
                type="number"
                name="cantidad_liberar"
                required
                min="1"
                max={movSeleccionado?.cantidad_restante || undefined}
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.cantidad_liberar}
                onChange={handleChange}
                placeholder={`Máx. ${movSeleccionado.cantidad_restante}`}
              />
              
              {formData.cantidad_liberar !== '' && parseInt(formData.cantidad_liberar, 10) < movSeleccionado.cantidad_restante && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  Devolución parcial — <strong>{movSeleccionado.cantidad_restante - parseInt(formData.cantidad_liberar, 10)}</strong> unidades permanecerán activas en este lote.
                </p>
              )}
              {formData.cantidad_liberar !== '' && parseInt(formData.cantidad_liberar, 10) === movSeleccionado.cantidad_restante && (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                  Devolución total — Todo el inventario de este lote pasará a pendiente de recepción.
                </p>
              )}
            </div>

            {user?.role === 'ADMIN' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                  Fecha Manual (Opcional - Retroactivo)
                </label>
                <input
                  type="datetime-local"
                  name="fecha_manual"
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.fecha_manual}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-indigo-500/10 cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg>
                    <span>Confirmar Devolución</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {showConfirm && (
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
          title="Confirmar Devolución de Polines"
        >
          <div className="space-y-2.5 text-gray-750 dark:text-slate-300">
            <p><strong>Origen:</strong> {movSeleccionado?.dueño_nombre} ({movSeleccionado?.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : movSeleccionado?.estado_uso === 'TRANSPORTE' ? 'Tránsito' : movSeleccionado?.estado_uso})</p>
            <p><strong>Polín:</strong> {movSeleccionado?.tipo_nombre} ({movSeleccionado?.color_nombre})</p>
            <p><strong>Cantidad a Devolver:</strong> {formData.cantidad_liberar} unidades</p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default Devoluciones;
