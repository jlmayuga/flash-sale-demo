const express = require('express');
const tokenAuth = require('../middleware/token-auth');
const adminSaleService = require('../services/admin-sale.service');

const router = express.Router();

router.use(tokenAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json({ sales: await adminSaleService.getAllSales() });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json({ sale: await adminSaleService.getSale(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const sale = await adminSaleService.createSale(req.body);
    res.status(201).json({ sale });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const sale = await adminSaleService.updateSale(req.params.id, req.body);
    res.json({ sale });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await adminSaleService.deleteSale(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
