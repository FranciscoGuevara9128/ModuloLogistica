import { supabase } from '../config/supabase.js';

export const crearSolicitud = async ({ cliente_directo_id, tipo_solicitud, cantidad, fecha, observaciones }) => {
  const { data, error } = await supabase
    .from('solicitud_polines')
    .insert([{
      cliente_directo_id,
      tipo_solicitud,
      cantidad: parseInt(cantidad, 10),
      fecha,
      estado: 'PENDIENTE',
      observaciones
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const obtenerSolicitudes = async (rol, entityIds = []) => {
  let query = supabase
    .from('solicitud_polines')
    .select(`
      *,
      cliente_directo (id, nombre)
    `)
    .order('created_at', { ascending: false });

  if (rol === 'CLIENTE_DIRECTO' && entityIds.length > 0) {
    query = query.in('cliente_directo_id', entityIds);
  } else if (rol !== 'ADMIN') {
    throw new Error('No tiene permisos para ver solicitudes.');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const actualizarEstadoSolicitud = async (id, estado) => {
  if (!['ACEPTADA', 'RECHAZADA'].includes(estado)) {
    throw new Error('Estado inválido. Debe ser ACEPTADA o RECHAZADA.');
  }

  const { data, error } = await supabase
    .from('solicitud_polines')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
