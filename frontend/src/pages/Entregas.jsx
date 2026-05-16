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
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">Registrar Entrega de Polines</h1>
      <p className="text-gray-600 text-sm">Registra la entrega inicial de polines al cliente.</p>

      {mensaje.texto && (
        <div className={`p-4 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Directo</label>
          <select
            name="cliente_directo_id"
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Polín</label>
            <select
              name="tipo_polin_id"
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Color de Polín</label>
            <select
              name="color_polin_id"
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <input
            type="number"
            name="cantidad"
            required
            min="1"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
            value={formData.cantidad}
            onChange={handleChange}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de Recepción</label>
            <select
              name="estado_uso"
              required
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
              value={formData.estado_uso}
              onChange={handleChange}
            >
              <option value="ALMACENAMIENTO">Almacenamiento</option>
              <option value="PULL_FIJO">Pull Fijo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Entrega ($)</label>
            <input
              type="number"
              name="costo_entrega"
              min="0"
              step="0.01"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
              value={formData.costo_entrega}
              onChange={handleChange}
            />
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remisión
              </label>
              <input
                type="text"
                name="remision"
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
                value={formData.remision}
                onChange={handleChange}
                placeholder="Ingrese la remisión"
              />
            </div>
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
              <p className="mt-1 text-xs text-gray-500">Si se deja vacío, se usará la fecha actual.</p>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t">
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-4 rounded-md transition duration-150 shadow-sm"
          >
            Registrar Entrega
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Entrega"
      >
        <p><strong>Cliente:</strong> {referencias.clientes_directos?.find(c => c.id == formData.cliente_directo_id)?.nombre}</p>
        <p><strong>Polín:</strong> {referencias.tipos_polin?.find(t => t.id == formData.tipo_polin_id)?.nombre} ({referencias.colores_polin?.find(c => c.id == formData.color_polin_id)?.nombre})</p>
        <p><strong>Cantidad:</strong> {formData.cantidad}</p>
        <p><strong>Modalidad:</strong> {formData.estado_uso}</p>
        {formData.remision && <p><strong>Remisión:</strong> {formData.remision}</p>}
      </ConfirmModal>
    </div>
  );
};

export default Entregas;
