import { useState, useEffect } from 'react';
import { realizarTransferencia, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { generarPDFTransferencia } from '../utils/pdfGenerator';

const Transferencias = () => {
  const [formData, setFormData] = useState({
    grupo_origen: '',
    cantidad: '',
    fecha_manual: ''
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [referencias, setReferencias] = useState({
    movimientos_activos: []
  });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        // Solo movimientos en ALMACENAMIENTO o PULL_FIJO con cantidad_restante > 0
        const disponibles = data.data.movimientos_activos.filter(
          m => ['ALMACENAMIENTO', 'PULL_FIJO'].includes(m.estado_uso) && m.cantidad_restante > 0
        );

        // Agrupar inventario por estado_uso, cliente, tipo de polín y color
        const agrupados = disponibles.reduce((acc, mov) => {
          if (!mov.cliente_directo || !mov.tipo_polin || !mov.color_polin) return acc;
          const key = `${mov.estado_uso}|${mov.cliente_directo_id}|${mov.tipo_polin_id}|${mov.color_polin_id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              estado_uso: mov.estado_uso,
              cliente_directo_id: mov.cliente_directo_id,
              tipo_polin_id: mov.tipo_polin_id,
              color_polin_id: mov.color_polin_id,
              cliente_nombre: mov.cliente_directo?.nombre || 'Desconocido',
              tipo_nombre: mov.tipo_polin?.nombre || 'Polín',
              color_nombre: mov.color_polin?.nombre || '',
              cantidad_restante: 0
            };
          }
          acc[key].cantidad_restante += mov.cantidad_restante;
          return acc;
        }, {});

        const lotes_agrupados = Object.values(agrupados).map(g => ({
          ...g,
          label: `[${g.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : g.estado_uso}] Cliente: ${g.cliente_nombre} | Cantidad: ${g.cantidad_restante} (${g.color_nombre})`
        }));

        setReferencias({
          movimientos_activos: lotes_agrupados
        });
      }
    } catch (err) {
      console.error('Error cargando referencias', err);
    }
  };

  useEffect(() => {
    fetchReferencias();
  }, []);

  const handleMovimientoChange = (e) => {
    const id = e.target.value;
    const mov = referencias.movimientos_activos.find(m => m.id === id);
    setMovSeleccionado(mov || null);
    setFormData(prev => ({
      ...prev,
      grupo_origen: id,
      cantidad: mov ? mov.cantidad_restante : ''
    }));
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    try {
      const a_estado = movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'PULL_FIJO' : 'ALMACENAMIENTO';
      
      await realizarTransferencia({
        cliente_directo_id: movSeleccionado.cliente_directo_id,
        tipo_polin_id: movSeleccionado.tipo_polin_id,
        color_polin_id: movSeleccionado.color_polin_id,
        de_estado: movSeleccionado.estado_uso,
        a_estado: a_estado,
        cantidad: parseInt(formData.cantidad, 10),
        fecha_manual: user?.role === 'ADMIN' ? formData.fecha_manual : null
      });

      setMensaje({ tipo: 'success', texto: `Transferencia realizada con éxito hacia ${a_estado}.` });
      
      // Generar PDF
      const ahora = new Date();
      generarPDFTransferencia({
        fecha: ahora.toLocaleDateString(),
        hora: ahora.toLocaleTimeString(),
        cantidad: formData.cantidad,
        origen: movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : movSeleccionado.estado_uso,
        destino: a_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : a_estado,
        usuario: user?.nombre || 'Representante',
        cliente: movSeleccionado.cliente_nombre,
        polin: movSeleccionado.tipo_nombre,
        color: movSeleccionado.color_nombre
      });

      setFormData({ grupo_origen: '', cantidad: '', fecha_manual: '' });
      setMovSeleccionado(null);
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al realizar transferencia: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!movSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar el inventario de origen.' });
      return;
    }
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-violet-50 dark:bg-violet-950/50 rounded-lg text-violet-600 dark:text-violet-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Transferencia Interna</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            Mueve polines entre Almacenamiento Temporal y Pull Fijo para un mismo cliente.
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
        
        {/* Origen de Transferencia */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
          <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Origen de la Transferencia</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Inventario de Origen
            </label>
            <select
              name="grupo_origen"
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-violet-500 focus:ring-violet-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.grupo_origen}
              onChange={handleMovimientoChange}
            >
              <option value="">-- Seleccione el Inventario --</option>
              {referencias.movimientos_activos.map(mov => (
                <option key={mov.id} value={mov.id}>{mov.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Destinos Inteligentes y Cantidad */}
        {movSeleccionado && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50">
              <p className="text-sm text-gray-700 dark:text-slate-300 flex items-center justify-between">
                <span>Categoría Origen: <strong className="text-violet-600 dark:text-violet-400">{movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : 'Pull Fijo'}</strong></span>
                <span className="text-gray-400">➜</span>
                <span>Categoría Destino: <strong className="text-emerald-600 dark:text-emerald-400">{movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'Pull Fijo' : 'Almacenamiento Temporal'}</strong></span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cantidad a Transferir */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                  Cantidad a Transferir
                </label>
                <input
                  type="number"
                  name="cantidad"
                  required
                  min="1"
                  max={movSeleccionado?.cantidad_restante || undefined}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-violet-500 focus:ring-violet-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.cantidad}
                  onChange={handleChange}
                  placeholder={`Máx. ${movSeleccionado.cantidad_restante}`}
                />
              </div>

              {/* Fecha Manual (Solo Admin) */}
              {user?.role === 'ADMIN' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                    Fecha Manual (Opcional - Retroactivo)
                  </label>
                  <input
                    type="datetime-local"
                    name="fecha_manual"
                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-violet-500 focus:ring-violet-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                    value={formData.fecha_manual}
                    onChange={handleChange}
                  />
                </div>
              ) : (
                <div></div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-violet-500/10 cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Realizar Transferencia</span>
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
          title="Confirmar Transferencia Interna"
        >
          <div className="space-y-2.5 text-gray-750 dark:text-slate-300">
            <p><strong>Cliente:</strong> {movSeleccionado?.cliente_nombre}</p>
            <p><strong>De:</strong> {movSeleccionado?.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : 'Pull Fijo'}</p>
            <p><strong>A:</strong> {movSeleccionado?.estado_uso === 'ALMACENAMIENTO' ? 'Pull Fijo' : 'Almacenamiento Temporal'}</p>
            <p><strong>Polín:</strong> {movSeleccionado?.tipo_nombre} ({movSeleccionado?.color_nombre})</p>
            <p><strong>Cantidad:</strong> {formData.cantidad} unidades</p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default Transferencias;
