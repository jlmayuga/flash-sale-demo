const express = require('express');
const healthService = require('../services/health.service');

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    const health = await healthService.getHealth();
    const statusCode = health.database === 1 && health.redis === 1 ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
