const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const bookRoutes     = require("./routes/books");
const authRoutes     = require("./routes/auth");
const borrowRoutes   = require("./routes/borrows");
const paymentRoutes  = require("./routes/payments");

const app = express();

app.use(cors());
app.use(express.json());

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
