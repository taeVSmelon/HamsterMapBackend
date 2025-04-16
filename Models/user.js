const mongoose = require("mongoose");

//const 
const stageSchema = new mongoose.Schema({
    type: { type: String, required: true },
    stageId: { type: Number, required: true },
    rewardId: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    itemUseds: { type: [String], default: [] },
    code: { type: String, default: null },
});

const clearStage = new mongoose.Schema({
    python: { type: [stageSchema], default: [] },
    unity: { type: [stageSchema], default: [] },
    blender: { type: [stageSchema], default: [] },
    website: { type: [stageSchema], default: [] }
});

const scoreSchema = new mongoose.Schema({
  python: { type: Number, default: 0 },
  unity: { type: Number, default: 0 },
  blender: { type: Number, default: 0 },
  website: { type: Number, default: 0 },
});

const statSchema = new mongoose.Schema({
  level :{ type: Number, default: 1 },
  maxExp : { type: Number, default: 0 },
  exp : { type: Number, default: 0 },
  maxHealth : { type: Number, default: 100 },
  // inventory : { type: [String], default: [] },
  // equipment : { type: [String], default: [] },
  clearedStages: { type: clearStage, default: {} },
});

const dataSchema = new mongoose.Schema({
  id : { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friend: { type: [String] },
  stats: {type: statSchema, default: {} },
  score : { type: scoreSchema, default: 0 }
});

const dataModel = mongoose.model("UserData", dataSchema, "UserData");

module.exports = dataModel;
