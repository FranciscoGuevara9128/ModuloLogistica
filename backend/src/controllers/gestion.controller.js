import * as GestionService from '../services/gestion.service.js';

// --- Clientes Directos ---
export const getClientesDirectos = async (req, res) => {
  try {
    const data = await GestionService.listarClientesDirectos();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const postClienteDirecto = async (req, res) => {
  try {
    const data = await GestionService.crearClienteDirecto(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const putClienteDirecto = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await GestionService.actualizarClienteDirecto(id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Clientes Finales ---
export const getClientesFinales = async (req, res) => {
  try {
    const data = await GestionService.listarClientesFinales();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const postClienteFinal = async (req, res) => {
  try {
    const { directosIds, ...datos } = req.body;
    const data = await GestionService.crearClienteFinal(datos, directosIds);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const putClienteFinal = async (req, res) => {
  try {
    const { id } = req.params;
    const { directosIds, ...datos } = req.body;
    const data = await GestionService.actualizarClienteFinal(id, datos, directosIds);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Usuarios ---
export const getUsuarios = async (req, res) => {
  try {
    const data = await GestionService.listarUsuarios();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const postUsuario = async (req, res) => {
  try {
    const { entityIds, ...datos } = req.body;
    const data = await GestionService.crearUsuario(datos, entityIds);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const putUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { entityIds, ...datos } = req.body;
    const data = await GestionService.actualizarUsuario(id, datos, entityIds);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Inventario ---
export const getInventario = async (req, res) => {
  try {
    const data = await GestionService.listarInventario();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const putInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await GestionService.actualizarInventario(id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
