const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = "HamsterXzaza007";

const authenticateToken = (req, res, next) => {
  const accessToken = req.header("Authorization");
  if (!accessToken) {
    return res.status(401).json({ error: "Invalid token" });
  }

  jwt.verify(accessToken, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Token expired" });
    if (!mongoose.Types.ObjectId.isValid(user._id)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    req.userId = user._id;
    next();
  });
};

const checkIsJson = (req, res, next) => {
  if (!req.is("application/json")) {
    return res.status(400).json({ error: "Request not JSON" });
  }
  next();
};

const checkAdminPermission = async (req, res, next) => {
  const user = await User.findOne({ _id: req.userId });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role !== "admin") {
    return res.status(403).json({ error: "You don't have permission" });
  }
  req.user = user;
  next();
};

module.exports = { authenticateToken, JWT_SECRET, checkIsJson, checkAdminPermission };