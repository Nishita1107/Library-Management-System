const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "rait_library_secret_key";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, idNumber, email, password, role } = req.body;

    if (!name || !idNumber || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const existingId = await User.findOne({ idNumber });
    if (existingId) {
      return res.status(409).json({ message: "ID number already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      idNumber,
      email,
      password: hashedPassword,
      role: role || "student"
    });

    await user.save();

    res.status(201).json({ message: "Registration successful. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        idNumber: user.idNumber
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
