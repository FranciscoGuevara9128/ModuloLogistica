import { useState, useEffect } from 'react';
import { enviarTransporte, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Transporte = () => {
  const [formData, setFormData] = useState({
    grupo_origen: '',
    cliente_final_id: '',
    cantidad_enviada: '',
    fecha_manual: '',
    orden_compra: ''
  });
  const { user } = useAuth();
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [referencias, setReferencias] = useState({
    movimientos_activos: [],
    clientes_finales: []
  });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        // Solo movimientos en ALMACENAMIENTO o PULL_FIJO con cantidad_restante > 0 y que sean raíz (no hijos)
        const disponibles = data.data.movimientos_activos.filter(
          m => ['ALMACENAMIENTO', 'PULL_FIJO'].includes(m.estado_uso) && m.cantidad_restante > 0 && !m.es_hijo
        );

        // Agrupar inventario por cliente, tipo de polín y color
        const agrupados = disponibles.reduce((acc, mov) => {
          if (!mov.cliente_directo || !mov.tipo_polin || !mov.color_polin) return acc;
          const key = `${mov.cliente_directo.id}|${mov.tipo_polin.id}|${mov.color_polin.id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              cliente_directo_id: mov.cliente_directo.id,
              tipo_polin_id: mov.tipo_polin.id,
              color_polin_id: mov.color_polin.id,
              cliente_nombre: mov.cliente_directo.nombre,
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
          label: `Cliente: ${g.cliente_nombre} | Polín: ${g.tipo_nombre} (${g.color_nombre})`
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    try {
      const result = await enviarTransporte({
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
        ? 'Inventario completo enviado a transporte.'
        : `Envío parcial registrado. Quedan ${restante_en_origen} unidades en almacenamiento / pull fijo para este grupo.`;

      setMensaje({ tipo: 'success', texto: msg });
      setFormData({ grupo_origen: '', cliente_final_id: '', cantidad_enviada: '', fecha_manual: '', orden_compra: '' });
      setMovSeleccionado(null);

      // Actualizar referencias completas desde el backend
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al enviar a transporte. ' + (err.response?.data?.error || err.message) });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">Enviar a Cliente Final</h1>
      <p className="text-gray-600 text-sm">
        Envía polines directamente desde el almacén o pull fijo de un cliente hacia un cliente final. Puedes enviar una cantidad combinada usando el método LIFO.
      </p>

      {mensaje.texto && (
        <div className={`p-4 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-100">
        {/* Movimiento origen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inventario en Almacenamiento / Pull Fijo a Enviar
          </label>
          <select
            name="grupo_origen"
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
            value={formData.grupo_origen}
            onChange={handleMovimientoChange}
          >
            <option value="">-- Seleccione el Inventario Disponible --</option>
            {referencias.movimientos_activos.map(mov => (
              <option key={mov.id} value={mov.id}>{mov.label}</option>
            ))}
          </select>
          {movSeleccionado && (
            <p className="mt-1 text-xs text-primary-700 font-bold">
              Disponible para envío total: <strong>{movSeleccionado.cantidad_restante}</strong> unidades
            </p>
          )}
        </div>

        {/* Cantidad a enviar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad a Enviar
          </label>
          <input
            type="number"
            name="cantidad_enviada"
            required
            min="1"
            max={movSeleccionado?.cantidad_restante || undefined}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.cantidad_enviada}
            onChange={handleChange}
            placeholder={movSeleccionado ? `Máx. ${movSeleccionado.cantidad_restante}` : 'Seleccione un origen primero'}
          />
          {movSeleccionado && parseInt(formData.cantidad_enviada, 10) < movSeleccionado.cantidad_restante && formData.cantidad_enviada !== '' && (
            <p className="mt-1 text-xs text-amber-600">
              Envío parcial — {movSeleccionado.cantidad_restante - parseInt(formData.cantidad_enviada, 10)} unidades quedarán en almacenamiento / pull fijo.
            </p>
          )}
        </div>

        {/* Cliente final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente Final (Destino)
          </label>
          <select
            name="cliente_final_id"
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
            value={formData.cliente_final_id}
            onChange={handleChange}
          >
            <option value="">-- Seleccione un Cliente Final --</option>
            {referencias.clientes_finales.map(cliente => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
            ))}
          </select>
        </div>

        {/* Orden de compra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Orden de Compra (OC)
          </label>
          <input
            type="text"
            name="orden_compra"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
            value={formData.orden_compra}
            onChange={handleChange}
            placeholder="Ingrese la Orden de Compra"
          />
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Manual (Opcional - Operación a destiempo)
            </label>
            <input
              type="datetime-local"
              name="fecha_manual"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
              value={formData.fecha_manual}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-gray-500">Si se deja vacío, se usará la fecha y hora actual del servidor.</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-4 rounded-md transition duration-150 shadow-sm"
          >
            Enviar a Transporte / Cliente Final
          </button>
        </div>
      </form>
    </div>
  );
};

export default Transporte;
