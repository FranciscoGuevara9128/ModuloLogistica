import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSolicitudes, createSolicitud, responderSolicitud, getReferencias } from '../services/api';

const Solicitudes = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [clientesDirectos, setClientesDirectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formData, setFormData] = useState({
    cliente_directo_id: '',
    tipo_solicitud: 'PULL_FIJO',
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const fetchSolicitudes = async () => {
    try {
      const { data } = await getSolicitudes();
      if (data.success) {
        setSolicitudes(data.data);
      }
    } catch (err) {
      console.error('Error al obtener solicitudes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        setClientesDirectos(data.data.clientes_directos || []);
        // Pre-seleccionar si es CLIENTE_DIRECTO
        if (user?.role === 'CLIENTE_DIRECTO' && user?.entityId) {
          setFormData(prev => ({ ...prev, cliente_directo_id: user.entityId }));
        }
      }
    } catch (err) {
      console.error('Error cargando referencias:', err);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchReferencias();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        cliente_directo_id: user?.role === 'CLIENTE_DIRECTO' ? user.entityId : formData.cliente_directo_id
      };

      if (!payload.cliente_directo_id) {
        throw new Error('Debe seleccionar un cliente.');
      }

      const { data } = await createSolicitud(payload);
      if (data.success) {
        setMensaje({ tipo: 'success', texto: 'Solicitud creada con éxito.' });
        setFormData({
          cliente_directo_id: user?.role === 'CLIENTE_DIRECTO' ? user.entityId : '',
          tipo_solicitud: 'PULL_FIJO',
          cantidad: '',
          fecha: new Date().toISOString().split('T')[0],
          observaciones: ''
        });
        fetchSolicitudes();
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponder = async (id, nuevoEstado) => {
    setMensaje({ tipo: '', texto: '' });
    try {
      const { data } = await responderSolicitud(id, nuevoEstado);
      if (data.success) {
        setMensaje({ tipo: 'success', texto: `Solicitud marcada como ${nuevoEstado.toLowerCase()}.` });
        fetchSolicitudes();
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al actualizar solicitud: ' + (err.response?.data?.error || err.message) });
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500 dark:text-slate-400">Cargando solicitudes...</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Gestión de Solicitudes</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            {user?.role === 'ADMIN' 
              ? 'Administre y apruebe las solicitudes informativas de los clientes.' 
              : 'Envíe y consulte solicitudes de polines para su planta.'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario solo para Clientes Directos (o Admin si desea crear) */}
        {user?.role === 'CLIENTE_DIRECTO' && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Nueva Solicitud</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {user?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Cliente Directo</label>
                    <select
                      name="cliente_directo_id"
                      required
                      value={formData.cliente_directo_id}
                      onChange={handleChange}
                      className="w-full text-sm rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-2.5 border"
                    >
                      <option value="">-- Seleccione Cliente --</option>
                      {clientesDirectos.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Tipo de Solicitud</label>
                  <select
                    name="tipo_solicitud"
                    required
                    value={formData.tipo_solicitud}
                    onChange={handleChange}
                    className="w-full text-sm rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-2.5 border"
                  >
                    <option value="PULL_FIJO">Pull Fijo</option>
                    <option value="TRANSITO">Tránsito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Cantidad de Polines</label>
                  <input
                    type="number"
                    name="cantidad"
                    required
                    min="1"
                    value={formData.cantidad}
                    onChange={handleChange}
                    placeholder="Cantidad de polines"
                    className="w-full text-sm rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-2.5 border"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Fecha Solicitada</label>
                  <input
                    type="date"
                    name="fecha"
                    required
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full text-sm rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-2.5 border"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Observaciones (Opcional)</label>
                  <textarea
                    name="observaciones"
                    rows="3"
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Detalles o aclaraciones"
                    className="w-full text-sm rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-2.5 border"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center"
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>

              </form>
            </div>
          </div>
        )}

        {/* Tabla de listado */}
        <div className={user?.role === 'CLIENTE_DIRECTO' ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Listado de Solicitudes</h2>
            </div>
            
            {solicitudes.length === 0 ? (
              <div className="p-10 text-center text-gray-400 dark:text-slate-500">
                No hay solicitudes registradas actualmente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-800/40">
                    <tr>
                      {user?.role === 'ADMIN' && (
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                      )}
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Observaciones</th>
                      {user?.role === 'ADMIN' && (
                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {solicitudes.map((sol) => (
                      <tr key={sol.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        {user?.role === 'ADMIN' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                            {sol.cliente_directo?.nombre}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                          {new Date(sol.fecha + 'T00:00:00').toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-medium">
                          {sol.tipo_solicitud === 'PULL_FIJO' ? 'Pull Fijo' : 'Tránsito'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-slate-100">
                          {sol.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sol.estado === 'PENDIENTE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            sol.estado === 'ACEPTADA' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {sol.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 max-w-xs truncate" title={sol.observaciones}>
                          {sol.observaciones || '-'}
                        </td>
                        {user?.role === 'ADMIN' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            {sol.estado === 'PENDIENTE' ? (
                              <>
                                <button
                                  onClick={() => handleResponder(sol.id, 'ACEPTADA')}
                                  className="inline-flex items-center px-2 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors font-bold cursor-pointer"
                                >
                                  Aceptar
                                </button>
                                <button
                                  onClick={() => handleResponder(sol.id, 'RECHAZADA')}
                                  className="inline-flex items-center px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors font-bold cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-slate-500">Procesado</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Solicitudes;
