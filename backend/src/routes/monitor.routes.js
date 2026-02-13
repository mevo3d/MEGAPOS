const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/monitor.controller');
const { verifyToken, isAdmin, isGerenteOrAdmin } = require('../middleware/auth');

// Admins y Gerentes pueden ver el monitor
router.use(verifyToken);
router.use(isGerenteOrAdmin);

router.get('/dashboard', getDashboardData);

module.exports = router;
