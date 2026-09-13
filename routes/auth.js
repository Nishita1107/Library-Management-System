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

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        idNumber: user.idNumber,
        profilePic: user.profilePic || "",
        phone: user.phone || "",
        bio: user.bio || ""
      }
    });
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
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        idNumber: user.idNumber,
        profilePic: user.profilePic || "",
        phone: user.phone || "",
        bio: user.bio || ""
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

const authMiddleware = require("../middleware/auth");
const adminAuthMiddleware = require("../middleware/adminAuth");

// GET /api/auth/profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, bio, profilePic } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (profilePic !== undefined) updateData.profilePic = profilePic;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      message: "Profile updated successfully.",
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/users (Admin only)
router.get("/users", adminAuthMiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/users/:id (Admin only)
router.delete("/users/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot delete an admin account." });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User removed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
