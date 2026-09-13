const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
  profilePic: { type: String, default: "" },
  phone: { type: String, default: "" },
  bio: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
