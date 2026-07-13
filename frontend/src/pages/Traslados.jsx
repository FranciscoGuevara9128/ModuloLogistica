import { useState, useEffect } from 'react';
import { realizarTraslado, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { generarPDFTraslado } from '../utils/pdfGenerator';

const Traslados = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    cliente_origen_id: '',
    de_estado: 'ALMACENAMIENTO',
    inventario_origen_id: '', // Key key = `${tipo_polin_id}|${color_polin_id}`
    cliente_destino_id: '',
    a_estado: 'ALMACENAMIENTO',
    cantidad: '',
    fecha_manual: ''
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [loading, setLoading] = useState(false);
  const [referencias, setReferencias] = useState({
    clientes_directos: [],
    movimientos_activos: []
  });

  const [inventarioDisponible, setInventarioDisponible] = useState([]);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        setReferencias({
          clientes_directos: data.data.clientes_directos || [],
          movimientos_activos: data.data.movimientos_activos || []
        });
      }
    } catch (err) {
      console.error('Error cargando referencias', err);
    }
  };

  useEffect(() => {
    fetchReferencias();
  }, []);

  // Actualizar inventario disponible al cambiar el cliente de origen o la categoría de origen
  useEffect(() => {
    if (!formData.cliente_origen_id) {
      setInventarioDisponible([]);
      setItemSeleccionado(null);
      setFormData(prev => ({ ...prev, inventario_origen_id: '', cantidad: '' }));
      return;
    }

    // Filtrar movimientos activos del cliente origen en la categoría seleccionada (de_estado)
    const movimientosOrigen = referencias.movimientos_activos.filter(
      mov => mov.cliente_directo_id === formData.cliente_origen_id &&
             mov.estado_uso === formData.de_estado &&
             mov.cantidad_restante > 0
    );

    // Agrupar por tipo_polin_id + color_polin_id
    const agrupados = movimientosOrigen.reduce((acc, mov) => {
      const key = `${mov.tipo_polin_id}|${mov.color_polin_id}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          tipo_polin_id: mov.tipo_polin_id,
          color_polin_id: mov.color_polin_id,
          tipo_nombre: mov.tipo_polin?.nombre || 'Polín',
          color_nombre: mov.color_polin?.nombre || 'Sin Color',
          cantidad_restante: 0
        };
      }
      acc[key].cantidad_restante += mov.cantidad_restante;
      return acc;
    }, {});

    const listaDisponible = Object.values(agrupados);
    setInventarioDisponible(listaDisponible);

    // Resetear selección de inventario y cantidad
    setItemSeleccionado(null);
    setFormData(prev => ({ ...prev, inventario_origen_id: '', cantidad: '' }));
  }, [formData.cliente_origen_id, formData.de_estado, referencias.movimientos_activos]);

  const handleOriginChange = (e) => {
    setFormData(prev => ({ ...prev, cliente_origen_id: e.target.value }));
  };

  const handleInventarioChange = (e) => {
    const key = e.target.value;
    const item = inventarioDisponible.find(i => i.key === key);
    setItemSeleccionado(item || null);
    setFormData(prev => ({
      ...prev,
      inventario_origen_id: key,
      cantidad: item ? item.cantidad_restante : ''
    }));
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.cliente_origen_id === formData.cliente_destino_id) {
      setMensaje({ tipo: 'error', texto: 'La planta de origen y destino deben ser diferentes.' });
      return;
    }
    if (!itemSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un tipo de polín del inventario.' });
      return;
    }
    if (parseInt(formData.cantidad, 10) > itemSeleccionado.cantidad_restante) {
      setMensaje({ tipo: 'error', texto: `La cantidad supera la disponible (${itemSeleccionado.cantidad_restante}).` });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    setLoading(true);
    try {
      await realizarTraslado({
        cliente_origen_id: formData.cliente_origen_id,
        de_estado: formData.de_estado,
        cliente_destino_id: formData.cliente_destino_id,
        a_estado: formData.a_estado,
        tipo_polin_id: itemSeleccionado.tipo_polin_id,
        color_polin_id: itemSeleccionado.color_polin_id,
        cantidad: parseInt(formData.cantidad, 10),
        fecha_manual: user?.role === 'ADMIN' ? formData.fecha_manual : null
      });

      const clienteOrigenObj = referencias.clientes_directos.find(c => c.id === formData.cliente_origen_id);
      const clienteDestinoObj = referencias.clientes_directos.find(c => c.id === formData.cliente_destino_id);

      setMensaje({ 
        tipo: 'success', 
        texto: `Traslado realizado con éxito de ${clienteOrigenObj?.nombre} (${formData.de_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : formData.de_estado}) a ${clienteDestinoObj?.nombre} (${formData.a_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : formData.a_estado}).` 
      });

      // Generar PDF
      const ahora = new Date();
      generarPDFTraslado({
        fecha: ahora.toLocaleDateString(),
        hora: ahora.toLocaleTimeString(),
        cantidad: formData.cantidad,
        cliente_origen: clienteOrigenObj?.nombre || 'Origen',
        cliente_destino: clienteDestinoObj?.nombre || 'Destino',
        de_estado: formData.de_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : formData.de_estado,
        a_estado: formData.a_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : formData.a_estado,
        usuario: user?.nombre || 'Usuario Autorizado',
        polin: itemSeleccionado.tipo_nombre,
        color: itemSeleccionado.color_nombre
      });

      // Limpiar campos y refrescar
      setFormData({
        cliente_origen_id: '',
        de_estado: 'ALMACENAMIENTO',
        inventario_origen_id: '',
        cliente_destino_id: '',
        a_estado: 'ALMACENAMIENTO',
        cantidad: '',
        fecha_manual: ''
      });
      setItemSeleccionado(null);
      fetchReferencias();
    } catch (err) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error al realizar traslado: ' + (err.response?.data?.error || err.message) 
      });
    } finally {
      setLoading(false);
    }
  };

  // Validar permisos
  const hasAccess = user?.role === 'ADMIN' || (user?.role === 'CLIENTE_DIRECTO' && user?.entityIds?.length > 1);

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-slate-800 text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Acceso Restringido</h2>
        <p className="text-gray-600 dark:text-slate-400 text-sm">
          Este módulo está reservado para Administradores o usuarios asociados a más de una planta.
        </p>
      </div>
    );
  }

  // Filtrar plantas de destino (excluyendo la seleccionada de origen)
  const plantasDestinoDisponibles = referencias.clientes_directos.filter(
    c => c.id !== formData.cliente_origen_id
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-gray-200 dark:border-slate-800">
        <div className="p-2 bg-teal-50 dark:bg-teal-950/50 rounded-lg text-teal-600 dark:text-teal-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L21 7.5M21 7.5H7.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-slate-100">Traslado de Inventario</h1>
          <p className="text-gray-500 dark:text-slate-400 text-xs">Mueve polines entre tus plantas autorizadas o como administrador.</p>
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
        
        {/* SECCIÓN ORIGEN */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4">
          <h3 className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Procedencia (Origen)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Planta de Origen */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Planta de Origen
              </label>
              <select
                name="cliente_origen_id"
                required
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.cliente_origen_id}
                onChange={handleOriginChange}
              >
                <option value="">-- Seleccione Origen --</option>
                {referencias.clientes_directos.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Categoría Origen */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Categoría de Origen
              </label>
              <select
                name="de_estado"
                required
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.de_estado}
                onChange={handleChange}
              >
                <option value="ALMACENAMIENTO">Almacenamiento Temporal</option>
                <option value="PULL_FIJO">Pull Fijo</option>
              </select>
            </div>
          </div>

          {/* Inventario Disponible en Origen */}
          {formData.cliente_origen_id && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Inventario Disponible en {formData.de_estado === 'ALMACENAMIENTO' ? 'Almacenamiento Temporal' : formData.de_estado}
              </label>
              {inventarioDisponible.length === 0 ? (
                <div className="p-3 text-sm bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl">
                  No hay polines activos en <strong>{formData.de_estado}</strong> para esta planta.
                </div>
              ) : (
                <select
                  name="inventario_origen_id"
                  required
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.inventario_origen_id}
                  onChange={handleInventarioChange}
                >
                  <option value="">-- Seleccione el Tipo de Polín --</option>
                  {inventarioDisponible.map(item => (
                    <option key={item.key} value={item.key}>
                      {item.tipo_nombre} ({item.color_nombre}) - Disponible: {item.cantidad_restante}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN DESTINO */}
        {formData.cliente_origen_id && itemSeleccionado && (
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Destino</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Planta de Destino */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Planta de Destino
                </label>
                {plantasDestinoDisponibles.length === 0 ? (
                  <div className="p-3 text-xs bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl">
                    No hay otras plantas de destino disponibles.
                  </div>
                ) : (
                  <select
                    name="cliente_destino_id"
                    required
                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                    value={formData.cliente_destino_id}
                    onChange={handleChange}
                  >
                    <option value="">-- Seleccione Destino --</option>
                    {plantasDestinoDisponibles.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Categoría Destino */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Categoría de Destino
                </label>
                <select
                  name="a_estado"
                  required
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.a_estado}
                  onChange={handleChange}
                >
                  <option value="ALMACENAMIENTO">Almacenamiento Temporal</option>
                  <option value="PULL_FIJO">Pull Fijo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cantidad a Trasladar */}
        {formData.cliente_origen_id && itemSeleccionado && formData.cliente_destino_id && (
          <div className="animate-fadeIn space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                Cantidad a Trasladar
              </label>
              <input
                type="number"
                name="cantidad"
                required
                min="1"
                max={itemSeleccionado.cantidad_restante}
                className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                value={formData.cantidad}
                onChange={handleChange}
                placeholder={`Máximo disponible: ${itemSeleccionado.cantidad_restante}`}
              />
            </div>

            {user?.role === 'ADMIN' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">
                  Fecha Manual (Opcional - Sólo Administrador)
                </label>
                <input
                  type="datetime-local"
                  name="fecha_manual"
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2.5 border bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors"
                  value={formData.fecha_manual}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-teal-500/10 cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                    <span>Realizar Traslado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* ConfirmModal */}
      {showConfirm && (
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmSubmit}
          title="Confirmar Traslado de Inventario"
        >
          <div className="space-y-2.5 text-gray-750 dark:text-slate-300">
            <p><strong>Origen:</strong> {referencias.clientes_directos.find(c => c.id === formData.cliente_origen_id)?.nombre} ({formData.de_estado})</p>
            <p><strong>Destino:</strong> {referencias.clientes_directos.find(c => c.id === formData.cliente_destino_id)?.nombre} ({formData.a_estado})</p>
            <p><strong>Polín:</strong> {itemSeleccionado?.tipo_nombre} ({itemSeleccionado?.color_nombre})</p>
            <p><strong>Cantidad:</strong> {formData.cantidad} unidades</p>
            {user?.role === 'ADMIN' && formData.fecha_manual && (
              <p><strong>Fecha Manual:</strong> {new Date(formData.fecha_manual).toLocaleString()}</p>
            )}
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30">
              Esta operación disminuirá el inventario en la planta y categoría de origen e incrementará el de destino. Se descargará el comprobante PDF automáticamente.
            </p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default Traslados;
