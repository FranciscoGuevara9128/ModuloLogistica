import express from 'express';
import { postSolicitud, getSolicitudes, responderSolicitud } from '../controllers/solicitudes.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/solicitudes',             verificarToken, postSolicitud);
router.get('/solicitudes',              verificarToken, getSolicitudes);
router.put('/solicitudes/:id/estado',   verificarToken, responderSolicitud);

export default router;
