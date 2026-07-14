import { useState, useEffect } from 'react';
import { enviarTransito, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Transito = () => {
  const [formData, setFormData] = useState({
    grupo_origen: '',
    cliente_final_id: '',
    cantidad_enviada: '',
    fecha_manual: '',
    orden_compra: ''
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [referencias, setReferencias] = useState({
    movimientos_activos: [],
    clientes_finales: []
  });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        // Solo movimientos en ALMACENAMIENTO o PULL_FIJO con cantidad_restante > 0
        const disponibles = data.data.movimientos_activos.filter(
          m => ['ALMACENAMIENTO', 'PULL_FIJO'].includes(m.estado_uso) && m.cantidad_restante > 0
        );

        // Agrupar inventario por cliente, tipo de polín y color
        const agrupados = disponibles.reduce((acc, mov) => {
          if (!mov.cliente_directo || !mov.tipo_polin || !mov.color_polin) return acc;
          const key = `${mov.cliente_directo_id}|${mov.tipo_polin_id}|${mov.color_polin_id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
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
          label: `Cliente: ${g.cliente_nombre} | Cantidad: ${g.cantidad_restante} (${g.color_nombre})`
        }));

        setReferencias({
          movimientos_activos: lotes_agrupados,
          clientes_finales: data.data.clientes_finales || []
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
      cantidad_enviada: mov ? mov.cantidad_restante : ''
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
      const result = await enviarTransito({
        cliente_directo_id: movSeleccionado.cliente_directo_id,
        tipo_polin_id: movSeleccionado.tipo_polin_id,
        color_polin_id: movSeleccionado.color_polin_id,
        cliente_final_id: formData.cliente_final_id,
        cantidad_enviada: parseInt(formData.cantidad_enviada, 10),
        orden_compra: formData.orden_compra
      });
      const { restante_en_origen } = result.data.data;
      const origen_cerrado = restante_en_origen === 0;

      const msg = origen_cerrado
        ? 'Inventario completo enviado a tránsito correctamente.'
        : `Envío parcial registrado. Quedan ${restante_en_origen} unidades en almacenamiento temporal / pull fijo para este grupo.`;

      setMensaje({ tipo: 'success', texto: msg });
      setFormData({ grupo_origen: '', cliente_final_id: '', cantidad_enviada: '', fecha_manual: '', orden_compra: '' });
      setMovSeleccionado(null);

      // Actualizar referencias
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al enviar a tránsito. ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!movSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un lote de inventario disponible.' });
      return;
    }
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.308-4.996a1.233 1.233 0 0 0-1.229-1.13h-3.12m6.183 7.25H13.5m3-7.25H12m0 0V8.25m0 0a9 9 0 1 0-9 9m9-9a9 9 0 0 0 9 9" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Enviar a Cliente Final (Tránsito)</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            Envía polines directamente desde el almacenamiento temporal o pull fijo hacia un cliente final.
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
        
        {/* Procedencia */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
          <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Procedencia (Origen)</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Inventario en Almacenamiento Temporal / Pull Fijo a Enviar
            </label>
            <select
              name="grupo_origen"
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.grupo_origen}
              onChange={handleMovimientoChange}
            >
              <option value="">-- Seleccione el Inventario Disponible --</option>
              {referencias.movimientos_activos.map(mov => (
                <option key={mov.id} value={mov.id}>{mov.label.replace('ALMACENAMIENTO', 'ALMACENAMIENTO TEMPORAL')}</option>
              ))}
            </select>
            {movSeleccionado && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-bold">
                Disponible para envío total: <strong>{movSeleccionado.cantidad_restante}</strong> unidades
              </p>
            )}
          </div>
        </div>

        {/* Destino y Cantidad */}
        {movSeleccionado && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente Final Destino */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                  Cliente Final (Destino)
                </label>
                <select
                  name="cliente_final_id"
                  required
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.cliente_final_id}
                  onChange={handleChange}
                >
                  <option value="">-- Seleccione un Cliente Final --</option>
                  {referencias.clientes_finales.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                  Cantidad a Enviar
                </label>
                <input
                  type="number"
                  name="cantidad_enviada"
                  required
                  min="1"
                  max={movSeleccionado?.cantidad_restante || undefined}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.cantidad_enviada}
                  onChange={handleChange}
                  placeholder={`Máx. ${movSeleccionado.cantidad_restante}`}
                />
              </div>
            </div>

            {/* Advertencia de envío parcial */}
            {parseInt(formData.cantidad_enviada, 10) < movSeleccionado.cantidad_restante && formData.cantidad_enviada !== '' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30">
                Envío parcial — <strong>{movSeleccionado.cantidad_restante - parseInt(formData.cantidad_enviada, 10)}</strong> unidades permanecerán en el inventario origen.
              </p>
            )}

            {/* Campos Administrativos */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Datos de Control</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Orden de Compra (OC)
                  </label>
                  <input
                    type="text"
                    name="orden_compra"
                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={formData.orden_compra}
                    onChange={handleChange}
                    placeholder="Ingrese la Orden de Compra"
                  />
                </div>

                {user?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Fecha Manual (Opcional - Retroactivo)
                    </label>
                    <input
                      type="datetime-local"
                      name="fecha_manual"
                      className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                      value={formData.fecha_manual}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                    <span>Enviar a Tránsito</span>
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
          title="Confirmar Envío a Tránsito"
        >
          <div className="space-y-2.5 text-gray-700 dark:text-slate-300">
            <p><strong>Origen:</strong> {movSeleccionado?.cliente_nombre}</p>
            <p><strong>Destino:</strong> {referencias.clientes_finales?.find(c => c.id == formData.cliente_final_id)?.nombre}</p>
            <p><strong>Polín:</strong> {movSeleccionado?.tipo_nombre} ({movSeleccionado?.color_nombre})</p>
            <p><strong>Cantidad a Enviar:</strong> {formData.cantidad_enviada} unidades</p>
            {formData.orden_compra && <p><strong>OC:</strong> {formData.orden_compra}</p>}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default Transito;
