const express = require('express');
const saleService = require('../services/sale.service');

const router = express.Router();

router.get('/flash', async (req, res, next) => {
  try {
    const sales = await saleService.getVisibleSales();
    res.json({ sales });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/status', async (req, res, next) => {
  try {
    const sale = await saleService.getSaleStatus(req.params.id);
    res.json({ sale });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/claim-status', async (req, res, next) => {
  try {
    const claim = await saleService.getUserClaimStatus(
      req.params.id,
      req.query.userIdentifier,
    );
    res.json({ claim });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/claim', async (req, res, next) => {
  try {
    const result = await saleService.claimSale(req.params.id, req.body.userIdentifier);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
