import { useState, useEffect } from 'react';
import { registrarEntrega, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Entregas = () => {
  const [formData, setFormData] = useState({
    cliente_directo_id: '',
    tipo_polin_id: '',
    color_polin_id: '',
    cantidad: '',
    estado_uso: 'ALMACENAMIENTO',
    costo_entrega: 0,
    fecha_manual: '',
    remision: ''
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [referencias, setReferencias] = useState({
    clientes_directos: [],
    tipos_polin: [],
    colores_polin: []
  });

  useEffect(() => {
    const fetchReferencias = async () => {
      try {
        const { data } = await getReferencias();
        if (data.success) {
          setReferencias(data.data);
        }
      } catch (err) {
        console.error('Error cargando referencias', err);
      }
    };
    fetchReferencias();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    try {
      await registrarEntrega({
        ...formData,
        cantidad: parseInt(formData.cantidad, 10),
        costo_entrega: formData.costo_entrega ? parseFloat(formData.costo_entrega) : 0
      });
      setMensaje({ tipo: 'success', texto: `Entrega registrada correctamente en modalidad ${formData.estado_uso}` });
      setFormData({ cliente_directo_id: '', tipo_polin_id: '', color_polin_id: '', cantidad: '', estado_uso: 'ALMACENAMIENTO', costo_entrega: 0, fecha_manual: '', remision: '' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al registrar entrega. ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801-1.206a2.25 2.25 0 0 0-3.302 0m3.302 0a2.25 2.25 0 0 1-3.302 0m3.302 0a2.25 2.25 0 0 0-3.302 0M6 18.75h-.75A2.25 2.25 0 0 1 3 16.5V6.108c0-1.135.845-2.098 1.976-2.192a48.867 48.867 0 0 1 1.123-.08M12 3v1.5m0 0H8.25m3.75 0H15.75" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Registrar Entrega de Polines</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">Registra la entrega inicial de polines al cliente.</p>
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
        
        {/* Sección Cliente */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
            Cliente Directo
          </label>
          <select
            name="cliente_directo_id"
            required
            className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
            value={formData.cliente_directo_id}
            onChange={handleChange}
          >
            <option value="">-- Seleccione un Cliente --</option>
            {referencias.clientes_directos?.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Sección Polines */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
          <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Detalles del Polín</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tipo de Polín</label>
              <select
                name="tipo_polin_id"
                required
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.tipo_polin_id}
                onChange={handleChange}
              >
                <option value="">-- Seleccione Tipo --</option>
                {referencias.tipos_polin?.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Color de Polín</label>
              <select
                name="color_polin_id"
                required
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.color_polin_id}
                onChange={handleChange}
              >
                <option value="">-- Seleccione Color --</option>
                {referencias.colores_polin?.map(color => (
                  <option key={color.id} value={color.id}>
                    {color.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Detalles Físicos y Contables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">Cantidad</label>
            <input
              type="number"
              name="cantidad"
              required
              min="1"
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.cantidad}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">Modalidad de Recepción</label>
            <select
              name="estado_uso"
              required
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.estado_uso}
              onChange={handleChange}
            >
              <option value="ALMACENAMIENTO">Almacenamiento Temporal</option>
              <option value="PULL_FIJO">Pull Fijo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">Costo de Entrega (C$)</label>
            <input
              type="number"
              name="costo_entrega"
              min="0"
              step="0.01"
              className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
              value={formData.costo_entrega}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Remisión y Fecha Manual (Solo Admin) */}
        {user?.role === 'ADMIN' && (
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Datos Administrativos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Remisión
                </label>
                <input
                  type="text"
                  name="remision"
                  required
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.remision}
                  onChange={handleChange}
                  placeholder="Ingrese la remisión"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Fecha Manual (Opcional)
                </label>
                <input
                  type="datetime-local"
                  name="fecha_manual"
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.fecha_manual}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Procesando...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>Registrar Entrega</span>
              </>
            )}
          </button>
        </div>
      </form>

      {showConfirm && (
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
          title="Confirmar Entrega"
        >
          <div className="space-y-2.5 text-gray-750 dark:text-slate-300">
            <p><strong>Cliente:</strong> {referencias.clientes_directos?.find(c => c.id == formData.cliente_directo_id)?.nombre}</p>
            <p><strong>Polín:</strong> {referencias.tipos_polin?.find(t => t.id == formData.tipo_polin_id)?.nombre} ({referencias.colores_polin?.find(c => c.id == formData.color_polin_id)?.nombre})</p>
            <p><strong>Cantidad:</strong> {formData.cantidad}</p>
            <p><strong>Modalidad:</strong> {formData.estado_uso === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : 'Pull Fijo'}</p>
            {formData.remision && <p><strong>Remisión:</strong> {formData.remision}</p>}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default Entregas;
