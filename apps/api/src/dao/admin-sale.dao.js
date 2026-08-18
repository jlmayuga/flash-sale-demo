const db = require('../config/db');

const saleColumns = `
  id,
  product_name AS "productName",
  starts_at AS "startsAt",
  ends_at AS "endsAt",
  total_stock AS "totalStock",
  remaining_stock AS "remainingStock",
  limit_claim AS "limitClaim",
  inactive
`;

async function findAll() {
  const { rows } = await db.query(`
    SELECT ${saleColumns}
    FROM flash_sales
    ORDER BY starts_at DESC
  `);
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${saleColumns} FROM flash_sales WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(sale) {
  const { rows } = await db.query(
    `INSERT INTO flash_sales
      (id, product_name, starts_at, ends_at, total_stock, remaining_stock, limit_claim, inactive)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${saleColumns}`,
    [
      sale.id,
      sale.productName,
      sale.startsAt,
      sale.endsAt,
      sale.totalStock,
      sale.remainingStock,
      sale.limitClaim,
      sale.inactive,
    ],
  );
  return rows[0];
}

async function update(id, sale) {
  const { rows } = await db.query(
    `UPDATE flash_sales
     SET product_name = $2,
         starts_at = $3,
         ends_at = $4,
         total_stock = $5,
         remaining_stock = $6,
         limit_claim = $7,
         inactive = COALESCE($8, inactive)
     WHERE id = $1
     RETURNING ${saleColumns}`,
    [
      id,
      sale.productName,
      sale.startsAt,
      sale.endsAt,
      sale.totalStock,
      sale.remainingStock,
      sale.limitClaim,
      sale.inactive,
    ],
  );
  return rows[0] || null;
}

async function softDelete(id) {
  const { rowCount } = await db.query(
    'UPDATE flash_sales SET inactive = TRUE WHERE id = $1 AND inactive = FALSE',
    [id],
  );
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, softDelete };
