import { useState, useEffect } from 'react';
import { getRecepcionesPendientes, procesarRecepcion } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Recepcion = () => {
  const [recepciones, setRecepciones] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formValues, setFormValues] = useState({});
  const { user } = useAuth();
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPendientes = async () => {
    try {
      const { data } = await getRecepcionesPendientes();
      if (data.success) {
        setRecepciones(data.data);
        
        // Inicializar formValues
        const initialForm = {};
        data.data.forEach(rec => {
          initialForm[rec.id] = {
            cantidad_buenos: rec.cantidad_liberada,
            cantidad_siniestrados: 0,
            fecha_manual: '',
            remision: ''
          };
        });
        setFormValues(initialForm);
      }
    } catch (err) {
      console.error('Error cargando recepciones pendientes', err);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const handleChange = (id, field, value) => {
    const rec = recepciones.find(r => r.id === id);
    if (!rec) return;

    setFormValues(prev => {
      const current = { ...prev[id] };
      
      if (field === 'fecha_manual' || field === 'remision') {
        current[field] = value;
        return { ...prev, [id]: current };
      }

      const val = parseInt(value, 10) || 0;
      current[field] = val;
      
      // Auto-balancear si es posible
      if (field === 'cantidad_buenos') {
        current.cantidad_siniestrados = Math.max(0, rec.cantidad_liberada - val);
      } else if (field === 'cantidad_siniestrados') {
        current.cantidad_buenos = Math.max(0, rec.cantidad_liberada - val);
      }

      return { ...prev, [id]: current };
    });
  };

  const handleProcesar = (id) => {
    setMensaje({ tipo: '', texto: '' });
    const vals = formValues[id];
    const rec = recepciones.find(r => r.id === id);
    
    if (vals.cantidad_buenos + vals.cantidad_siniestrados !== rec.cantidad_liberada) {
      setMensaje({ tipo: 'error', texto: `La suma de buenos y siniestrados debe ser exactamente ${rec.cantidad_liberada}.` });
      return;
    }

    setConfirmId(id);
  };

  const handleConfirmProcesar = async () => {
    const id = confirmId;
    setConfirmId(null);
    const vals = formValues[id];
    setLoading(true);

    try {
      const result = await procesarRecepcion({
        recepcion_id: id,
        cantidad_buenos: vals.cantidad_buenos,
        cantidad_siniestrados: vals.cantidad_siniestrados,
        fecha_manual: vals.fecha_manual,
        remision: vals.remision
      });

      if (result.data.success) {
        setMensaje({ tipo: 'success', texto: 'Recepción procesada exitosamente.' });
        fetchPendientes(); // Refresh
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Recepción de Polines</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            Procesa las solicitudes de liberación. Define cuántos polines retornaron en buen estado y cuántos se consideran siniestrados.
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

      {recepciones.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-gray-550 dark:text-slate-400 shadow-sm">
          No hay recepciones pendientes en este momento.
        </div>
      ) : (
        <div className="space-y-6">
          {recepciones.map((rec) => {
            const mov = rec.movimiento_polines;
            const origen = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.nombre : mov.cliente_directo?.nombre;
            return (
              <div key={rec.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Liberación desde: {origen}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Polín: <span className="font-semibold text-gray-700 dark:text-slate-300">{mov.tipo_polin?.nombre} ({mov.color_polin?.nombre})</span> | 
                      Modalidad Original: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{mov.estado_uso}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Fecha Liberación: {new Date(rec.fecha_liberacion).toLocaleString()}</p>
                  </div>
                  <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/50 rounded-xl px-4 py-2 flex flex-col justify-center min-w-[120px]">
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{rec.cantidad_liberada}</span>
                    <p className="text-[10px] font-bold uppercase text-gray-450 dark:text-slate-400">Total a Recibir</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  {/* Buenos */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                      Buenos (Al Inv.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rec.cantidad_liberada}
                      className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm transition-colors"
                      value={formValues[rec.id]?.cantidad_buenos ?? ''}
                      onChange={(e) => handleChange(rec.id, 'cantidad_buenos', e.target.value)}
                    />
                  </div>
                  
                  {/* Siniestrados */}
                  <div>
                    <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                      Siniestrados (Cobro)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rec.cantidad_liberada}
                      className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm transition-colors"
                      value={formValues[rec.id]?.cantidad_siniestrados ?? ''}
                      onChange={(e) => handleChange(rec.id, 'cantidad_siniestrados', e.target.value)}
                    />
                  </div>

                  {/* Datos Extra Admin */}
                  {user?.role === 'ADMIN' ? (
                    <div className="grid grid-cols-2 gap-2 md:col-span-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-650 dark:text-slate-300 mb-1">
                          Remisión
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs transition-colors"
                          value={formValues[rec.id]?.remision ?? ''}
                          onChange={(e) => handleChange(rec.id, 'remision', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-650 dark:text-slate-300 mb-1">
                          F. Manual
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-xs transition-colors"
                          value={formValues[rec.id]?.fecha_manual ?? ''}
                          onChange={(e) => handleChange(rec.id, 'fecha_manual', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden md:block"></div>
                  )}

                  {/* Botón */}
                  <div>
                    <button
                      onClick={() => handleProcesar(rec.id)}
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-2.5 px-4 rounded-xl transition duration-150 shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                      </svg>
                      <span>Procesar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmProcesar}
        title="Confirmar Recepción de Devolución"
      >
        {confirmId && recepciones.find(r => r.id === confirmId) && (
          <div className="space-y-2.5 text-gray-755 dark:text-slate-300">
            <p><strong>Polín:</strong> {recepciones.find(r => r.id === confirmId).movimiento_polines?.tipo_polin?.nombre} ({recepciones.find(r => r.id === confirmId).movimiento_polines?.color_polin?.nombre})</p>
            <p><strong>Total a Recibir:</strong> {recepciones.find(r => r.id === confirmId).cantidad_liberada} unidades</p>
            <p><strong>Buenos:</strong> {formValues[confirmId]?.cantidad_buenos} unidades</p>
            <p><strong>Siniestrados:</strong> {formValues[confirmId]?.cantidad_siniestrados} unidades</p>
            {formValues[confirmId]?.remision && <p><strong>Remisión:</strong> {formValues[confirmId]?.remision}</p>}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default Recepcion;
