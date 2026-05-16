import * as ReferenciasService from '../services/referencias.service.js';

export const obtenerReferencias = async (req, res) => {
  try {
    const { rol: userRole, entityIds } = req.user || {};
    
    // Si la llamada no tiene cabeceras (por ej, desde el Login), se comporta como ADMIN pero sin entityIds.
    // El servicio maneja role !== CLIENTE_* sin filtros adicionales.

    const data = await ReferenciasService.obtenerReferencias(userRole, entityIds);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
