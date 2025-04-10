const mongoose = require("mongoose");

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

const dataSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  nick: { type: String, required: true },
  age: { type: String },
  line: { type: String },
  mobile: { type: String },
  email: { type: String, required: true },
  rank: { type: String },
  xp: { type: String },
  coin: { type: String },
  code: { type: String },
  course: { type: String },
  stat: { type: String },
  youtube: { type: String },
  token: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  storage: { type: String },
  avatar: { type: String },
  friendly: { type: Number },
  friends: { type: [String] },
  hp: { type: Number, default: null },
  mp: { type: Number, default: null },
  updated_at: { type: Date, default: Date.now },
  finish: { type: String },
  approve: { type: String },
  cstage: { type: String },
  consultant: { type: String },
  lineName: { type: String },
  remark: { type: String },
  games: { type: [String], default: [] },
  lastAuthentication: { type: Date },
  clearedStages: { type: clearStage, default: {} },
});

const dataModel = mongoose.model("PHC_Backend", dataSchema, "PHC_Backend");

module.exports = dataModel;
