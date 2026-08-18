const adminSaleDao = require('../dao/admin-sale.dao');
const claimReservation = require('./claim-reservation.service');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateSale(input, includeId) {
  const requiredFields = [
    'productName',
    'startsAt',
    'endsAt',
    'totalStock',
    'remainingStock',
    'limitClaim',
  ];
  if (includeId) requiredFields.unshift('id');

  for (const field of requiredFields) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      throw httpError(400, `${field} is required`);
    }
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw httpError(400, 'startsAt and endsAt must be valid dates');
  }
  if (endsAt <= startsAt) throw httpError(400, 'endsAt must be later than startsAt');
  if (!Number.isInteger(input.totalStock) || input.totalStock < 0) {
    throw httpError(400, 'totalStock must be a non-negative integer');
  }
  if (!Number.isInteger(input.remainingStock) || input.remainingStock < 0) {
    throw httpError(400, 'remainingStock must be a non-negative integer');
  }
  if (input.remainingStock > input.totalStock) {
    throw httpError(400, 'remainingStock cannot exceed totalStock');
  }
  if (!Number.isInteger(input.limitClaim) || input.limitClaim <= 0) {
    throw httpError(400, 'limitClaim must be a positive integer');
  }
  if (input.inactive !== undefined && typeof input.inactive !== 'boolean') {
    throw httpError(400, 'inactive must be a boolean');
  }

  return {
    ...input,
    startsAt,
    endsAt,
    inactive: includeId ? input.inactive ?? false : input.inactive,
  };
}

async function getAllSales() {
  return adminSaleDao.findAll();
}

async function getSale(id) {
  const sale = await adminSaleDao.findById(id);
  if (!sale) throw httpError(404, 'Flash sale not found');
  return sale;
}

async function createSale(input) {
  const sale = validateSale(input, true);
  try {
    const createdSale = await adminSaleDao.create(sale);
    await claimReservation.invalidate(createdSale.id);
    return createdSale;
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'A flash sale with this id already exists');
    throw error;
  }
}

async function updateSale(id, input) {
  const sale = validateSale(input, false);
  const updatedSale = await adminSaleDao.update(id, sale);
  if (!updatedSale) throw httpError(404, 'Flash sale not found');
  await claimReservation.invalidate(id);
  return updatedSale;
}

async function deleteSale(id) {
  const deactivated = await adminSaleDao.softDelete(id);
  if (!deactivated) throw httpError(404, 'Active flash sale not found');
  await claimReservation.invalidate(id);
}

module.exports = { getAllSales, getSale, createSale, updateSale, deleteSale };
