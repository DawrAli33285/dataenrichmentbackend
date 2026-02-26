const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // Check if the token belongs to an admin (admins have email in adminModel)
    if (!decoded.email) {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};