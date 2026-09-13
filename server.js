const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const path           = require("path");
const bookRoutes     = require("./routes/books");
const authRoutes     = require("./routes/auth");
const borrowRoutes   = require("./routes/borrows");
const paymentRoutes  = require("./routes/payments");
const { initReminderCron } = require("./services/reminderCron");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public directory and project root
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// Initialize daily email reminder cron job
initReminderCron();

app.use("/api/books",    bookRoutes);
app.use("/api/auth",     authRoutes);
app.use("/api/borrows",  borrowRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });

app.get("/", (req, res) => {
  res.send("Library Management Backend is Running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
