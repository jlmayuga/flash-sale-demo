const express = require('express');
const healthRoutes = require('./routes/health.routes');
const saleRoutes = require('./routes/sale.routes');
const adminSaleRoutes = require('./routes/admin-sale.routes');
const adminAuthRoutes = require('./routes/admin-auth.routes');

const app = express();

app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/sale', saleRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/flash-sales', adminSaleRoutes);

app.use((error, req, res, next) => {
  if (!error.statusCode || error.statusCode >= 500) {
    console.error(error);
  }
  res.status(error.statusCode || 500).json({
    status: 'error',
    code: error.statusCode ? error.code || 'REQUEST_ERROR' : 'INTERNAL_ERROR',
    message: error.statusCode ? error.message : 'Internal server error',
  });
});

module.exports = app;
