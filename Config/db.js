// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ChatApp',
  password: '2906',
  port: 5432, // Default PostgreSQL port
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});
module.exports = pool;
