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

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

let mongoUri = process.env.MONGO_URI;
if (mongoUri && !mongoUri.includes("/libraryDB")) {
  mongoUri = mongoUri.replace(/\.mongodb\.net\/?(\?|$)/, ".mongodb.net/libraryDB$1");
}

mongoose
  .connect(mongoUri, { dbName: "libraryDB" })
  .then(() => {
    console.log(`MongoDB connected successfully to database: ${mongoose.connection.name}`);
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
