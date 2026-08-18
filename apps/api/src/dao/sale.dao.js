const db = require('../config/db');

async function findVisibleSales() {
  const { rows } = await db.query(`
    SELECT
      id,
      product_name AS "productName",
      starts_at AS "startsAt",
      ends_at AS "endsAt",
      total_stock AS "totalStock",
      remaining_stock AS "remainingStock",
      limit_claim AS "limitClaim",
      CASE
        WHEN CURRENT_TIMESTAMP < starts_at THEN 'upcoming'
        WHEN CURRENT_TIMESTAMP >= ends_at THEN 'ended'
        ELSE 'active'
      END AS status,
      remaining_stock = 0 AS "soldOut"
    FROM flash_sales
    WHERE inactive = FALSE
    ORDER BY
      CASE
        WHEN starts_at <= CURRENT_TIMESTAMP AND ends_at > CURRENT_TIMESTAMP THEN 0
        WHEN starts_at > CURRENT_TIMESTAMP THEN 1
        ELSE 2
      END,
      starts_at ASC
  `);

  return rows;
}

async function getSaleStatus(saleId) {
  const { rows } = await db.query(
    `SELECT
       id,
       product_name AS "productName",
       starts_at AS "startsAt",
       ends_at AS "endsAt",
       remaining_stock AS "remainingStock",
       limit_claim AS "limitClaim",
       CASE
         WHEN inactive THEN 'inactive'
         WHEN CURRENT_TIMESTAMP < starts_at THEN 'upcoming'
         WHEN CURRENT_TIMESTAMP >= ends_at THEN 'ended'
         ELSE 'active'
       END AS status,
       remaining_stock = 0 AS "soldOut",
       CURRENT_TIMESTAMP AS "serverTime"
     FROM flash_sales
     WHERE id = $1`,
    [saleId],
  );
  return rows[0] || null;
}

async function getUserClaimStatus(saleId, userIdentifier) {
  const { rows } = await db.query(
    `SELECT
       fs.id AS "saleId",
       fs.limit_claim AS "limitClaim",
       COUNT(p.id)::INTEGER AS "claimCount",
       COUNT(p.id) > 0 AS secured,
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT('id', p.id, 'purchasedAt', p.purchased_at)
           ORDER BY p.purchased_at
         ) FILTER (WHERE p.id IS NOT NULL),
         '[]'::JSON
       ) AS purchases
     FROM flash_sales fs
     LEFT JOIN purchases p
       ON p.sale_id = fs.id AND p.user_identifier = $2
     WHERE fs.id = $1
     GROUP BY fs.id`,
    [saleId, userIdentifier],
  );
  return rows[0] || null;
}

async function getClaimContext(saleId, userIdentifier) {
  const { rows } = await db.query(
    `SELECT
       fs.id,
       fs.starts_at AS "startsAt",
       fs.ends_at AS "endsAt",
       fs.remaining_stock AS "remainingStock",
       fs.limit_claim AS "limitClaim",
       fs.inactive,
       COUNT(p.id)::INTEGER AS "existingClaims"
     FROM flash_sales fs
     LEFT JOIN purchases p
       ON p.sale_id = fs.id AND p.user_identifier = $2
     WHERE fs.id = $1
     GROUP BY fs.id`,
    [saleId, userIdentifier],
  );
  return rows[0] || null;
}

async function createClaim(saleId, userIdentifier, purchaseId) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`${saleId}:${userIdentifier}`],
    );
    const { rows } = await client.query(
      `SELECT
         fs.id,
         fs.remaining_stock AS "remainingStock",
         fs.limit_claim AS "limitClaim",
         fs.inactive,
         fs.starts_at AS "startsAt",
         fs.ends_at AS "endsAt",
         COUNT(p.id)::INTEGER AS "existingClaims"
       FROM flash_sales fs
       LEFT JOIN purchases p
         ON p.sale_id = fs.id AND p.user_identifier = $2
       WHERE fs.id = $1
       GROUP BY fs.id`,
      [saleId, userIdentifier],
    );
    const sale = rows[0];

    if (!sale) throw httpError(404, 'Flash sale not found', 'SALE_NOT_FOUND');
    if (sale.inactive) throw httpError(409, 'Flash sale is inactive', 'SALE_INACTIVE');
    if (Date.now() < new Date(sale.startsAt)) {
      throw httpError(409, 'Flash sale has not started yet', 'SALE_UPCOMING');
    }
    if (Date.now() >= new Date(sale.endsAt)) {
      throw httpError(410, 'Flash sale has ended', 'SALE_ENDED');
    }
    if (sale.existingClaims >= sale.limitClaim) {
      const alreadyPurchased = sale.limitClaim === 1;
      throw httpError(
        409,
        alreadyPurchased
          ? 'You have already purchased this flash sale'
          : 'You have reached the claim limit for this flash sale',
        alreadyPurchased ? 'ALREADY_PURCHASED' : 'CLAIM_LIMIT_REACHED',
      );
    }
    if (sale.remainingStock <= 0) {
      throw httpError(409, 'Flash sale is sold out', 'SOLD_OUT');
    }

    const inventoryResult = await client.query(
      `UPDATE flash_sales
       SET remaining_stock = remaining_stock - 1
       WHERE id = $1
         AND inactive = FALSE
         AND starts_at <= CURRENT_TIMESTAMP
         AND ends_at > CURRENT_TIMESTAMP
         AND remaining_stock > 0
       RETURNING remaining_stock`,
      [saleId],
    );
    if (inventoryResult.rowCount === 0) {
      throw httpError(
        409,
        'Flash sale is no longer available',
        'SALE_UNAVAILABLE',
      );
    }
    const purchaseResult = await client.query(
      `INSERT INTO purchases (id, sale_id, user_identifier)
       VALUES ($1, $2, $3)
       RETURNING id, sale_id AS "saleId", user_identifier AS "userIdentifier",
                 purchased_at AS "purchasedAt"`,
      [purchaseId, saleId, userIdentifier],
    );
    await client.query('COMMIT');
    return {
      purchase: purchaseResult.rows[0],
      claimCount: sale.existingClaims + 1,
      limitClaim: sale.limitClaim,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function httpError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

module.exports = {
  findVisibleSales,
  getSaleStatus,
  getUserClaimStatus,
  getClaimContext,
  createClaim,
};
