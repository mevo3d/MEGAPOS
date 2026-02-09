const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const auth = require('../middleware/auth');

// Apply auth middleware - restrict to admin usually
router.get('/', auth.verifyToken, configController.getConfig);
router.put('/', auth.verifyToken, configController.updateConfig);

module.exports = router;
