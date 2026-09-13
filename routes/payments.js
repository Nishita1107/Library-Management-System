const express  = require("express");
const router   = express.Router();
const crypto   = require("crypto");
const Razorpay = require("razorpay");
const auth     = require("../middleware/auth");
const Borrow   = require("../models/Borrow");
const Book     = require("../models/Book");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const FINE_PER_DAY = 5;

function calcFine(dueDate) {
  const overdue = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
  return overdue > 0 ? overdue * FINE_PER_DAY : 0;
}

// ── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a Razorpay order for the fine amount of a given borrow
router.post("/create-order", auth, async (req, res) => {
  try {
    const { borrowId } = req.body;
    if (!borrowId) return res.status(400).json({ message: "borrowId is required." });

    const borrow = await Borrow.findById(borrowId).populate("book", "title");
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found." });
    if (borrow.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized." });
    if (borrow.status === "returned")
      return res.status(400).json({ message: "Book already returned." });

    const fine = calcFine(borrow.dueDate);
    if (fine <= 0)
      return res.status(400).json({ message: "No fine due. Use the regular return endpoint." });

    const order = await razorpay.orders.create({
      amount:   fine * 100,   // Razorpay uses paise (1 INR = 100 paise)
      currency: "INR",
      receipt:  `fine_${borrowId}`,
      notes: {
        borrowId: borrowId.toString(),
        userId:   req.user.id,
        bookTitle: borrow.book.title
      }
    });

    res.json({
      orderId:  order.id,
      amount:   fine,
      currency: "INR",
      keyId:    process.env.RAZORPAY_KEY_ID,
      borrowId,
      bookTitle: borrow.book.title
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/payments/verify ────────────────────────────────────────────────
// Verifies Razorpay signature, then processes the return and marks fine paid
router.post("/verify", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, borrowId } = req.body;

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });

    // Process return
    const borrow = await Borrow.findById(borrowId);
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found." });
    if (borrow.user.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized." });

    const fine       = calcFine(borrow.dueDate);
    borrow.returnDate = new Date();
    borrow.fine       = fine;
    borrow.status     = "returned";
    await borrow.save();

    // Restore book stock
    await Book.findByIdAndUpdate(borrow.book, { $inc: { quantity: 1 } });

    res.json({
      message:   "Payment verified and book returned successfully.",
      fine,
      paymentId: razorpay_payment_id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
