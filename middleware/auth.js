const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "rait_library_secret_key";

module.exports = function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
