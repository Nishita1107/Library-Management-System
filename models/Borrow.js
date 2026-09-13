const mongoose = require("mongoose");

const BorrowSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  book:       { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate:    { type: Date, required: true },   // borrowDate + 14 days
  returnDate: { type: Date, default: null },
  fine:         { type: Number, default: 0 },     // ₹5 per overdue day
  status:       { type: String, enum: ["active", "returned", "overdue"], default: "active" },
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Borrow", BorrowSchema);
