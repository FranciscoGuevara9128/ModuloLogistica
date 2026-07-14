import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistorial, editarMovimiento, eliminarMovimiento } from '../services/api';
import { jsPDF } from 'jspdf';
import ConfirmModal from '../components/ConfirmModal';

// Helper de zona horaria para interpretar fechas sin sufijo de timezone en UTC
const parseUTCDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(dateStr)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};

const Perfil = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados de filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [listaClientesDirectos, setListaClientesDirectos] = useState([]);

  // Estados de Edición y Eliminación
  const [editingMov, setEditingMov] = useState(null);
  const [deletingMov, setDeletingMov] = useState(null);
  const [editFormData, setEditFormData] = useState({
    cantidad: '',
    cantidad_buenos: '',
    cantidad_siniestrados: '',
    fecha_inicio: '',
    remision: '',
    orden_compra: ''
  });

  const fetchHistorial = async () => {
    try {
      const { data } = await getHistorial();
      if (data.success) {
        setHistorial(data.data);
      }
    } catch (err) {
      setError('Error al cargar el historial de pedidos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  // Determinar si se muestra el filtro de Cliente Directo
  const showClienteDirectoFilter = 
    user?.role === 'ADMIN' || 
    (user?.role === 'CLIENTE_DIRECTO' && user?.rel_usuario_cliente_directo?.length >= 2);

  // Poblar la lista de clientes directos para el filtro
  useEffect(() => {
    if (historial.length > 0) {
      if (user?.role === 'CLIENTE_DIRECTO' && user?.rel_usuario_cliente_directo?.length >= 2) {
        const clients = user.rel_usuario_cliente_directo.map(r => r.cliente_directo).filter(Boolean);
        const uniqueClients = Array.from(new Map(clients.map(c => [c.id, c])).values());
        setListaClientesDirectos(uniqueClients);
      } else if (user?.role === 'ADMIN') {
        const clientsFromHistorial = historial.map(m => m.cliente_directo).filter(Boolean);
        const uniqueClients = Array.from(new Map(clientsFromHistorial.map(c => [c.id, c])).values());
        setListaClientesDirectos(uniqueClients);
      }
    }
  }, [historial, user]);

  // Aplicar filtros en memoria
  const filteredHistorial = historial.filter(mov => {
    if (filtroFechaInicio) {
      const movDate = parseUTCDate(mov.fecha_inicio);
      const startDate = new Date(filtroFechaInicio + 'T00:00:00');
      if (movDate < startDate) return false;
    }

    if (filtroFechaFin) {
      const movDate = parseUTCDate(mov.fecha_inicio);
      const endDate = new Date(filtroFechaFin + 'T23:59:59');
      if (movDate > endDate) return false;
    }

    if (filtroCliente) {
      const isOrigen = mov.cliente_origen?.id === filtroCliente;
      const isDestino = mov.cliente_directo?.id === filtroCliente;
      if (!isOrigen && !isDestino) return false;
    }

    if (filtroTipo) {
      const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') 
        ? 'ENVIO' 
        : mov.tipo_movimiento;

      if (displayType !== filtroTipo) return false;
    }

    return true;
  });

  const handleDeleteClick = (mov) => {
    setDeletingMov(mov);
  };

  const handleConfirmDelete = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await eliminarMovimiento(deletingMov.id);
      if (data.success) {
        setSuccessMsg('Movimiento eliminado correctamente.');
        fetchHistorial();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setDeletingMov(null);
    }
  };

  const handleEditClick = (mov) => {
    setEditingMov(mov);
    // Convertir ISO string a datetime-local format
    const localDate = parseUTCDate(mov.fecha_inicio).toISOString().slice(0, 16);
    
    setEditFormData({
      cantidad: mov.cantidad || '',
      cantidad_buenos: mov.cantidad_buenos || mov.cantidad || '',
      cantidad_siniestrados: mov.cantidad_siniestrados || 0,
      fecha_inicio: localDate,
      remision: mov.remision || '',
      orden_compra: mov.orden_compra || ''
    });
  };

  const handleEditFormChange = (e) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const isDev = editingMov.id.toString().startsWith('dev-');
      const payload = {
        fecha_inicio: editFormData.fecha_inicio,
        remision: editFormData.remision,
        orden_compra: editFormData.orden_compra
      };

      if (isDev && editingMov.estado_uso === 'RECIBIDO') {
        payload.cantidad_buenos = parseInt(editFormData.cantidad_buenos, 10);
        payload.cantidad_siniestrados = parseInt(editFormData.cantidad_siniestrados, 10);
      } else {
        payload.cantidad = parseInt(editFormData.cantidad, 10);
      }

      const { data } = await editarMovimiento(editingMov.id, payload);
      if (data.success) {
        setSuccessMsg('Movimiento editado correctamente.');
        setEditingMov(null);
        fetchHistorial();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const downloadPDF = (mov) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 148, 18, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SISTEMA DE POLINES', 10, 11);
    
    doc.setFillColor(34, 197, 94);
    doc.rect(98, 5, 40, 8, 'F');
    doc.setFontSize(8);
    doc.text('COMPROBANTE', 104, 10.5);
    
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Detalles del Movimiento', 10, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const parsedDate = parseUTCDate(mov.fecha_inicio);
    const dateStr = parsedDate.toLocaleDateString();
    const timeStr = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    doc.text(`ID Movimiento: ${mov.id.toString().substring(0, 8).toUpperCase()}`, 10, 36);
    doc.text(`Fecha y Hora: ${dateStr} - ${timeStr}`, 10, 41);
    
    doc.setDrawColor(220, 220, 220);
    doc.line(10, 45, 138, 45);
    
    let y = 54;
    const addRow = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label, 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value), 52, y);
      y += 8;
    };
    
    const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') 
      ? 'ENVIO' 
      : mov.tipo_movimiento;

    addRow('Tipo Movimiento:', displayType === 'ENVIO' ? 'ENVÍO' : displayType);
    addRow('Tipo de Polín:', mov.tipo_polin?.nombre || '-');
    addRow('Color de Polín:', mov.color_polin?.nombre || '-');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Cantidad:', 10, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(11);
    doc.text(String(mov.cantidad), 52, y);
    doc.setFontSize(9);
    y += 8;

    doc.setTextColor(30, 30, 30);

    if (displayType === 'TRASLADO') {
      addRow('Planta Origen:', mov.cliente_origen?.nombre || 'Almacén Central');
      addRow('Planta Destino:', mov.cliente_destino?.nombre || '-');
    } else {
      if (mov.cliente_directo) {
        addRow('Cliente Directo:', mov.cliente_directo.nombre);
      }
      if (mov.cliente_final) {
        addRow('Cliente Final:', mov.cliente_final.nombre);
      }
    }
    
    if (mov.remision) {
      addRow('N° Remisión:', mov.remision);
    }
    if (mov.orden_compra) {
      addRow('Orden de Compra:', mov.orden_compra);
    }
    
    doc.setDrawColor(220, 220, 220);
    doc.line(10, 160, 138, 160);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    doc.line(15, 185, 65, 185);
    doc.text('Firma Autorizada', 28, 190);
    
    doc.line(83, 185, 133, 185);
    doc.text('Recibido Conforme', 95, 190);
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento es un comprobante digital emitido por el Sistema de Polines.', 23, 202);
    
    doc.save(`comprobante-${displayType.toLowerCase()}-${mov.id.toString().substring(0, 8)}.pdf`);
  };

  if (loading) return <div className="text-center py-10 text-gray-500 dark:text-slate-400">Cargando perfil...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-6">
        <div className="h-20 w-20 bg-primary-500 rounded-full flex items-center justify-center text-black text-3xl font-bold shadow-inner flex-shrink-0">
          {user?.nombre?.charAt(0) || user?.entityName?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{user?.entityName}</h1>
          <p className="text-gray-500 dark:text-slate-400">{user?.nombre || 'Representante'}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 mt-1">
            {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'CLIENTE_DIRECTO' ? 'Cliente Directo' : 'Cliente Final'}
          </span>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2 border-b dark:border-slate-700 pb-2">Historial de Pedidos / Movimientos</h2>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}
        {successMsg && <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-lg border border-emerald-200 dark:border-emerald-850">{successMsg}</div>}

        {/* Panel de Filtros */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 font-bold border-b dark:border-slate-700 pb-2">
            <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm">Filtros de Búsqueda</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={e => setFiltroFechaInicio(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={e => setFiltroFechaFin(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
            {showClienteDirectoFilter && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Cliente Directo</label>
                <select
                  value={filtroCliente}
                  onChange={e => setFiltroCliente(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                >
                  <option value="">Todos los clientes</option>
                  {listaClientesDirectos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={showClienteDirectoFilter ? "col-span-1" : "col-span-1 md:col-span-2"}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Tipo de Movimiento</label>
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                <option value="">Todos los tipos</option>
                <option value="ENTREGA">ENTREGA</option>
                <option value="ENVIO">ENVÍO</option>
                <option value="TRASLADO">TRASLADO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA (Interna)</option>
                <option value="DEVOLUCION">DEVOLUCION</option>
                <option value="SINIESTRO">SINIESTRO</option>
              </select>
            </div>
          </div>

          {(filtroFechaInicio || filtroFechaFin || filtroCliente || filtroTipo) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setFiltroFechaInicio('');
                  setFiltroFechaFin('');
                  setFiltroCliente('');
                  setFiltroTipo('');
                }}
                className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-1 transition"
              >
                <span>✕ Limpiar todos los filtros</span>
              </button>
            </div>
          )}
        </div>

        {filteredHistorial.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-10 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500">
            No se encontraron movimientos registrados con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-hidden bg-white dark:bg-slate-900 shadow sm:rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Detalle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredHistorial.map((mov) => {
                  const dateObj = parseUTCDate(mov.fecha_inicio);
                  const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') ? 'ENVIO' : mov.tipo_movimiento;
                  
                  let labelTipo = displayType;
                  if (displayType === 'ENTREGA') {
                    labelTipo = `ENTREGA (${mov.estado_uso === 'PULL_FIJO' ? 'Pull Fijo' : 'Almacenamiento Temporal'})`;
                  } else if (displayType === 'ENVIO') {
                    labelTipo = 'ENVÍO';
                  }

                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        <div className="font-semibold text-gray-800 dark:text-slate-200">{dateObj.toLocaleDateString()}</div>
                        <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                        <div className="font-medium">{mov.tipo_polin?.nombre}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{mov.color_polin?.nombre}</div>
                        
                        {displayType === 'TRASLADO' ? (
                          <>
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Origen: {mov.cliente_origen?.nombre || 'Almacén Central'}</div>
                            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-semibold">Destino: {mov.cliente_destino?.nombre}</div>
                          </>
                        ) : (
                          <>
                            {user?.role !== 'CLIENTE_FINAL' && mov.cliente_final && (
                              <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-semibold">Destino: {mov.cliente_final.nombre}</div>
                            )}
                            {user?.role !== 'CLIENTE_DIRECTO' && mov.cliente_directo && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Origen: {mov.cliente_directo.nombre}</div>
                            )}
                          </>
                        )}
                        
                        {mov.remision && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">Remisión: {mov.remision}</div>
                        )}
                        {mov.orden_compra && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">OC: {mov.orden_compra}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          displayType === 'ENTREGA' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          displayType === 'ENVIO' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          displayType === 'TRANSFERENCIA' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                          displayType === 'TRASLADO' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                          displayType === 'DEVOLUCION' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}>
                          {labelTipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-slate-100">
                        {mov.cantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => downloadPDF(mov)}
                          className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-bold bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 px-2 py-1 rounded-lg border border-primary-100 dark:border-primary-900/25 transition-colors"
                          title="Descargar Comprobante PDF"
                        >
                          PDF
                        </button>
                        {user?.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleEditClick(mov)}
                              className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors font-bold cursor-pointer"
                              title="Editar movimiento"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteClick(mov)}
                              className="inline-flex items-center px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors font-bold cursor-pointer"
                              title="Eliminar movimiento"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Confirmación de Eliminación */}
      {deletingMov && (
        <ConfirmModal
          isOpen={!!deletingMov}
          onClose={() => setDeletingMov(null)}
          onConfirm={handleConfirmDelete}
          title="¿Confirmar Eliminación?"
        >
          <div className="space-y-2 text-gray-700 dark:text-slate-350 text-sm">
            <p className="text-red-600 dark:text-red-400 font-bold">Atención: Esta acción es irreversible.</p>
            <p>Se restaurará la cantidad de polines al inventario origen para mantener la consistencia.</p>
            <p><strong>Tipo:</strong> {deletingMov.tipo_movimiento}</p>
            <p><strong>Cantidad:</strong> {deletingMov.cantidad} polines</p>
            {deletingMov.cliente_directo && <p><strong>Cliente:</strong> {deletingMov.cliente_directo.nombre}</p>}
          </div>
        </ConfirmModal>
      )}

      {/* Modal de Edición de Movimiento */}
      {editingMov && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-950 dark:text-slate-100">Editar Transacción</h3>
              <button onClick={() => setEditingMov(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-lg">✕</button>
            </div>
            
            <form onSubmit={handleConfirmEdit} className="space-y-4">
              
              {editingMov.id.toString().startsWith('dev-') && editingMov.estado_uso === 'RECIBIDO' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Buenos</label>
                    <input
                      type="number"
                      name="cantidad_buenos"
                      required
                      min="0"
                      value={editFormData.cantidad_buenos}
                      onChange={handleEditFormChange}
                      className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Siniestrados</label>
                    <input
                      type="number"
                      name="cantidad_siniestrados"
                      required
                      min="0"
                      value={editFormData.cantidad_siniestrados}
                      onChange={handleEditFormChange}
                      className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Cantidad de Polines</label>
                  <input
                    type="number"
                    name="cantidad"
                    required
                    min="1"
                    value={editFormData.cantidad}
                    onChange={handleEditFormChange}
                    className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  name="fecha_inicio"
                  required
                  value={editFormData.fecha_inicio}
                  onChange={handleEditFormChange}
                  className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">N° Remisión</label>
                <input
                  type="text"
                  name="remision"
                  value={editFormData.remision}
                  onChange={handleEditFormChange}
                  placeholder="Sin número de remisión"
                  className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                />
              </div>

              {!editingMov.id.toString().startsWith('dev-') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Orden de Compra (OC)</label>
                  <input
                    type="text"
                    name="orden_compra"
                    value={editFormData.orden_compra}
                    onChange={handleEditFormChange}
                    placeholder="Sin orden de compra"
                    className="w-full text-sm bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="pt-4 flex space-x-3 justify-end border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMov(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-750 text-sm font-semibold rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white rounded-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Perfil;
