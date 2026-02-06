const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/monitor.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Solo admins pueden ver el monitor global
router.use(verifyToken);
router.use(isAdmin);

router.get('/dashboard', getDashboardData);

module.exports = router;
