const saleDao = require('../dao/sale.dao');
const crypto = require('crypto');
const claimReservation = require('./claim-reservation.service');

async function getVisibleSales() {
  return saleDao.findVisibleSales();
}

async function getSaleStatus(saleId) {
  const sale = await saleDao.getSaleStatus(saleId);
  if (!sale) throw httpError(404, 'Flash sale not found');
  return sale;
}

async function getUserClaimStatus(saleId, userIdentifier) {
  if (typeof userIdentifier !== 'string' || !userIdentifier.trim()) {
    throw httpError(400, 'userIdentifier is required');
  }

  const claimStatus = await saleDao.getUserClaimStatus(saleId, userIdentifier.trim());
  if (!claimStatus) throw httpError(404, 'Flash sale not found');
  return claimStatus;
}

function httpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function claimLimitError(limitClaim) {
  return limitClaim === 1
    ? httpError(409, 'You have already purchased this flash sale', 'ALREADY_PURCHASED')
    : httpError(409, 'You have reached the claim limit for this flash sale', 'CLAIM_LIMIT_REACHED');
}

async function claimSale(saleId, userIdentifier) {
  if (typeof userIdentifier !== 'string' || !userIdentifier.trim()) {
    throw httpError(400, 'userIdentifier is required');
  }

  const normalizedUser = userIdentifier.trim();
  const context = await saleDao.getClaimContext(saleId, normalizedUser);
  if (!context) throw httpError(404, 'Flash sale not found', 'SALE_NOT_FOUND');

  const now = Date.now();
  if (context.inactive) throw httpError(409, 'Flash sale is inactive', 'SALE_INACTIVE');
  if (now < new Date(context.startsAt)) {
    throw httpError(409, 'Flash sale has not started yet', 'SALE_UPCOMING');
  }
  if (now >= new Date(context.endsAt)) {
    throw httpError(410, 'Flash sale has ended', 'SALE_ENDED');
  }
  if (context.existingClaims >= context.limitClaim) throw claimLimitError(context.limitClaim);
  if (context.remainingStock <= 0) {
    throw httpError(409, 'Flash sale is sold out', 'SOLD_OUT');
  }

  let reservation;
  try {
    reservation = await claimReservation.reserve(context, normalizedUser, context.existingClaims);
  } catch (error) {
    throw httpError(503, 'Claim service is temporarily unavailable', 'CLAIM_SERVICE_UNAVAILABLE');
  }

  if (reservation === -1) throw httpError(409, 'Flash sale is sold out', 'SOLD_OUT');
  if (reservation === -2) throw claimLimitError(context.limitClaim);

  try {
    const result = await saleDao.createClaim(saleId, normalizedUser, crypto.randomUUID());
    return {
      status: 'success',
      code: 'PURCHASE_SUCCESSFUL',
      message: 'Purchase secured successfully',
      ...result,
    };
  } catch (error) {
    await claimReservation.release(saleId, normalizedUser).catch(() => {});
    throw error;
  }
}

module.exports = { getVisibleSales, getSaleStatus, getUserClaimStatus, claimSale };
