const mongoose = require("mongoose");
const { InventoryService, InventoryException } = require("../services/InventoryService");
const { UserException } = require("../services/UserService");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON format" });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof InventoryException) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof UserException) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
