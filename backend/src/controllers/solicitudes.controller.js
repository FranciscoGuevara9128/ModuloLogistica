import * as SolicitudesService from '../services/solicitudes.service.js';

export const postSolicitud = async (req, res) => {
  try {
    const { rol: userRole, entityIds = [] } = req.user || {};
    const { cliente_directo_id, tipo_solicitud, cantidad, fecha, observaciones } = req.body;

    if (userRole === 'CLIENTE_DIRECTO' && !entityIds.includes(cliente_directo_id)) {
      throw new Error('No tiene permisos para crear una solicitud para este cliente.');
    }

    const result = await SolicitudesService.crearSolicitud({
      cliente_directo_id,
      tipo_solicitud,
      cantidad,
      fecha,
      observaciones
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getSolicitudes = async (req, res) => {
  try {
    const { rol: userRole, entityIds = [] } = req.user || {};
    const result = await SolicitudesService.obtenerSolicitudes(userRole, entityIds);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const responderSolicitud = async (req, res) => {
  try {
    const { rol: userRole } = req.user || {};
    if (userRole !== 'ADMIN') {
      throw new Error('No tiene permisos para responder solicitudes.');
    }

    const { id } = req.params;
    const { estado } = req.body;

    const result = await SolicitudesService.actualizarEstadoSolicitud(id, estado);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
