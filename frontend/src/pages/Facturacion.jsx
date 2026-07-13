import { useState, useEffect } from 'react';
import { generarFacturacion, getReferencias } from '../services/api';

const MESES = [
  { val: 1, nombre: 'Enero' }, { val: 2, nombre: 'Febrero' }, { val: 3, nombre: 'Marzo' },
  { val: 4, nombre: 'Abril' }, { val: 5, nombre: 'Mayo' }, { val: 6, nombre: 'Junio' },
  { val: 7, nombre: 'Julio' }, { val: 8, nombre: 'Agosto' }, { val: 9, nombre: 'Septiembre' },
  { val: 10, nombre: 'Octubre' }, { val: 11, nombre: 'Noviembre' }, { val: 12, nombre: 'Diciembre' }
];

const TRAMO_STYLE = {
  ALMACENAMIENTO: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: '🏭', label: 'Almacenamiento Temporal' },
  TRANSPORTE: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: '🚚', label: 'Tránsito' },
  PULL_FIJO: { badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: '📉', label: 'Pull Fijo' },
  COSTO_ENTREGA: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '💵', label: 'Costo Entrega' },
  SINIESTRO: { badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: '🔥', label: 'Siniestro' }
};

const Facturacion = () => {
  const [formData, setFormData] = useState({
    cliente_directo_id: '',
    fecha_desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_hasta: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [factura, setFactura] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [referencias, setReferencias] = useState({ clientes_directos: [] });
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  useEffect(() => {
    const fetchReferencias = async () => {
      try {
        const { data } = await getReferencias();
        if (data.success) {
          setReferencias({ clientes_directos: data.data.clientes_directos || [] });
        }
      } catch (err) {
        console.error('Error cargando referencias:', err);
      }
    };
    fetchReferencias();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    setFactura(null);
    setMostrarDetalles(false);
    try {
      const resp = await generarFacturacion({
        cliente_directo_id: formData.cliente_directo_id,
        fecha_desde: formData.fecha_desde,
        fecha_hasta: formData.fecha_hasta
      });
      setFactura(resp.data.data);
      setMensaje({ tipo: 'success', texto: 'Facturación generada correctamente.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al generar facturación. ' + (err.response?.data?.error || err.message) });
    }
  };

  const mesNombre = MESES.find(m => m.val === parseInt(formData.mes, 10))?.nombre || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100 border-b dark:border-slate-800 pb-2">Generar Facturación Mensual</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm">
        Calcula los montos por tramo: días en almacenamiento temporal y días en tránsito, con tarifas independientes.
      </p>

      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Cliente Directo a Facturar</label>
          <select
            name="cliente_directo_id"
            required
            className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
            value={formData.cliente_directo_id}
            onChange={handleChange}
          >
            <option value="">-- Seleccione un Cliente --</option>
            {referencias.clientes_directos.map(cliente => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Fecha Desde</label>
          <input
            type="date"
            name="fecha_desde"
            required
            className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
            value={formData.fecha_desde}
            onChange={handleChange}
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Fecha Hasta</label>
          <input
            type="date"
            name="fecha_hasta"
            required
            className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
            value={formData.fecha_hasta}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition duration-150 h-11 shadow-md shadow-indigo-500/10 cursor-pointer"
        >
          Generar y Calcular
        </button>
      </form>

      {mensaje.texto && (
        <div className={`p-4 rounded-xl flex justify-between items-center transition-all ${
          mensaje.tipo === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
        }`}>
          <span className="text-sm font-medium">{mensaje.texto}</span>
        </div>
      )}

      {factura && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="bg-slate-50 dark:bg-slate-800/30 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Resumen de Factura</h3>
            <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border border-indigo-200 dark:border-indigo-800/50">
              {factura.id?.slice(0, 8)}...
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Período */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-slate-400">Período Facturado</p>
                <p className="font-semibold text-gray-800 dark:text-slate-200">
                  {factura.fecha_desde ? `${new Date(factura.fecha_desde + 'T00:00:00').toLocaleDateString('es-NI')} → ${new Date(factura.fecha_hasta + 'T00:00:00').toLocaleDateString('es-NI')}` : `${mesNombre} ${factura.anio}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-slate-400">Fecha de Generación</p>
                <p className="font-semibold text-gray-800 dark:text-slate-200">{new Date(factura.fecha_generacion).toLocaleDateString('es-NI')}</p>
              </div>
            </div>

            {/* Resumen extraído de detalles si existen */}
            {factura.detalles && factura.detalles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.keys(TRAMO_STYLE).map(tramo => {
                  const subtotal = factura.detalles.filter(d => d.estado_tramo === tramo).reduce((acc, obj) => acc + parseFloat(obj.subtotal), 0);
                  if (subtotal === 0) return null;
                  const style = TRAMO_STYLE[tramo];
                  return (
                    <div key={tramo} className={`rounded-xl p-3 border ${style.badge.split(' ')[0]} bg-opacity-35 border-opacity-50 flex flex-col justify-between`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{style.icon}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.badge.split(' ')[1]}`}>{style.label}</span>
                      </div>
                      <p className={`text-xl font-bold mt-2 ${style.badge.split(' ')[1].replace('-800', '-900')}`}>
                        C$ {subtotal.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <p className="text-gray-600 dark:text-slate-400 font-bold">Total a Pagar</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">C$ {parseFloat(factura.total).toFixed(4)}</p>
            </div>

            {/* Detalles por tramo */}
            {factura.detalles && factura.detalles.length > 0 && (
              <div>
                <button
                  onClick={() => setMostrarDetalles(v => !v)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {mostrarDetalles ? '▲ Ocultar' : '▼ Ver'} desglose por tramo ({factura.detalles.length} líneas)
                </button>

                {mostrarDetalles && (
                  <div className="mt-3 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400">Tramo</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400 text-right">Cantidad</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400 text-right">Días</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400 text-right">Tarifa/día</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 dark:text-slate-400 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {factura.detalles.map((d, i) => {
                          const style = TRAMO_STYLE[d.estado_tramo] || { badge: 'bg-gray-100 text-gray-700', icon: '📦', label: d.estado_tramo };
                          return (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                                  {style.icon} {style.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{d.cantidad}</td>
                              <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300">{d.dias}</td>
                              <td className="px-4 py-3 text-right text-gray-700 dark:text-slate-300 font-mono">C$ {parseFloat(d.tarifa).toFixed(4)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-slate-100">C$ {parseFloat(d.subtotal).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturacion;
