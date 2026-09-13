const express  = require("express");
const router   = express.Router();
const auth     = require("../middleware/auth");
const Borrow   = require("../models/Borrow");
const Book     = require("../models/Book");

const FINE_PER_DAY   = 5;   // ₹5 per overdue day
const BORROW_DAYS    = 14;  // 14-day lending period
const DUE_SOON_DAYS  = 3;   // warn if due within 3 days

// Helper: calculate fine for an active borrow
function calcFine(dueDate) {
  const now      = new Date();
  const due      = new Date(dueDate);
  const overdue  = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return overdue > 0 ? overdue * FINE_PER_DAY : 0;
}

// ── POST /api/borrows  →  borrow a book ──────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ message: "bookId is required." });

    const book = await Book.findById(bookId);
    if (!book)             return res.status(404).json({ message: "Book not found." });
    const available = book.availableCopies !== undefined ? book.availableCopies : book.quantity;
    if (available < 1) return res.status(400).json({ message: "Book is out of stock." });

    // Check user hasn't already borrowed this book and not returned it
    const existing = await Borrow.findOne({
      user: req.user.id, book: bookId, status: { $in: ["active", "overdue"] }
    });
    if (existing) return res.status(400).json({ message: "You have already borrowed this book." });

    const borrowDate = new Date();
    const dueDate    = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + BORROW_DAYS);

    const borrow = await Borrow.create({
      user: req.user.id, book: bookId, borrowDate, dueDate
    });

    // Decrement stock
    if (book.availableCopies !== undefined) book.availableCopies = Math.max(0, book.availableCopies - 1);
    if (book.quantity !== undefined) book.quantity = Math.max(0, book.quantity - 1);
    await book.save();

    await borrow.populate("book", "title author");
    res.status(201).json({ message: "Book borrowed successfully.", borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/borrows/:id/renew  →  renew a borrowed book ─────────────────────
router.put("/:id/renew", auth, async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id).populate("book");
    if (!borrow) return res.status(404).json({ message: "Borrow record not found." });
    if (borrow.user.toString() !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized." });

    if (borrow.status === "returned")
      return res.status(400).json({ message: "Book has already been returned." });

    const now = new Date();
    const isOverdue = borrow.status === "overdue" || new Date(borrow.dueDate) < now || calcFine(borrow.dueDate) > 0;
    if (isOverdue) {
      return res.status(400).json({ message: "Cannot renew an overdue book. Please pay the fine and return it." });
    }

    // Reservation proxy check: availableCopies > 0
    const book = await Book.findById(borrow.book._id || borrow.book);
    if (!book) return res.status(404).json({ message: "Associated book not found." });

    const available = book.availableCopies !== undefined ? book.availableCopies : (book.quantity || 0);
    if (available <= 0) {
      return res.status(400).json({ message: "Cannot renew: no copies available or active reservations exist for this book." });
    }

    // Extend dueDate by 14 more days
    const updatedDue = new Date(borrow.dueDate);
    updatedDue.setDate(updatedDue.getDate() + BORROW_DAYS);
    borrow.dueDate = updatedDue;
    borrow.reminderSent = false; // Reset reminder flag on renewal
    await borrow.save();

    res.json({ message: "Book renewed successfully! Due date extended by 14 days.", borrow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/borrows/:id/return  →  return a book ────────────────────────────
router.put("/:id/return", auth, async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id).populate("book");
    if (!borrow) return res.status(404).json({ message: "Borrow record not found." });
    if (borrow.user.toString() !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized." });
    if (borrow.status === "returned")
      return res.status(400).json({ message: "Book already returned." });

    const fine       = calcFine(borrow.dueDate);
    borrow.returnDate = new Date();
    borrow.fine       = fine;
    borrow.status     = "returned";
    await borrow.save();

    // Restore stock
    await Book.findByIdAndUpdate(borrow.book._id, {
      $inc: { availableCopies: 1, quantity: 1 }
    });

    res.json({ message: "Book returned successfully.", fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/borrows/my  →  current user's borrows ───────────────────────────
router.get("/my", auth, async (req, res) => {
  try {
    const borrows = await Borrow.find({ user: req.user.id })
      .populate("book", "title author")
      .sort({ borrowDate: -1 });

    const now = new Date();

    // Update overdue status on the fly and attach computed fine
    const result = borrows.map(b => {
      const obj    = b.toObject();
      const due    = new Date(b.dueDate);
      obj.fine     = b.status !== "returned" ? calcFine(b.dueDate) : b.fine;
      obj.dueSoon  = b.status === "active" && (due - now) / (1000 * 60 * 60 * 24) <= DUE_SOON_DAYS;
      if (b.status === "active" && due < now) obj.status = "overdue";
      return obj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
