const express = require('express');
const basicAuth = require('../middleware/basic-auth');
const adminAuthService = require('../services/admin-auth.service');

const router = express.Router();

router.post('/', basicAuth, (req, res, next) => {
  try {
    res.json(adminAuthService.createToken());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
