// token.js
const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "This_is_my_JWT_Secret_Key";
  return jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 });
};

module.exports = { generateToken };
