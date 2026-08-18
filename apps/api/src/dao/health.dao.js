const db = require('../config/db');

async function getDatabaseTime() {
  const { rows } = await db.query('SELECT NOW() AS database_time');
  return rows[0].database_time;
}

module.exports = { getDatabaseTime };
