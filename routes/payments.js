const express  = require("express");
const router   = express.Router();
const crypto   = require("crypto");
const Razorpay = require("razorpay");
const auth     = require("../middleware/auth");
const Borrow   = require("../models/Borrow");
const Book     = require("../models/Book");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret"
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

const fs          = require("fs");
const path        = require("path");
const PDFDocument = require("pdfkit");

// Helper to generate PDF receipt
function generateReceiptPdf(data, filePath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Header
      doc.fillColor("#800000")
         .fontSize(22)
         .text("RAIT SMART LIBRARY", { align: "center" });
      doc.fontSize(14)
         .fillColor("#444444")
         .text("Payment & Fine Return Receipt", { align: "center" });
      doc.moveDown(1);

      // Divider line
      doc.strokeColor("#800000").lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1.5);

      // Receipt details
      doc.fontSize(12).fillColor("#222222");

      const rows = [
        ["Payment ID:", data.paymentId],
        ["Transaction Date:", new Date(data.paymentDate).toLocaleString("en-IN")],
        ["Student Name:", data.studentName],
        ["Book Title:", data.bookTitle],
        ["Borrow Date:", new Date(data.borrowDate).toLocaleDateString("en-IN")],
        ["Return Date:", new Date(data.returnDate).toLocaleDateString("en-IN")],
        ["Fine Amount:", `INR ${data.fineAmount}.00`],
        ["Status:", "PAID (Verified)"]
      ];

      rows.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").text(label, 60, doc.y, { continued: true, width: 170 });
        doc.font("Helvetica").text(`  ${value}`);
        doc.moveDown(0.8);
      });

      doc.moveDown(2);
      doc.strokeColor("#dddddd").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
      doc.fontSize(10).fillColor("#777777").text("Thank you for returning the book. Please keep this receipt for your records.", { align: "center" });

      doc.end();

      writeStream.on("finish", () => resolve(filePath));
      writeStream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

// ── POST /api/payments/verify ────────────────────────────────────────────────
// Verifies Razorpay signature, processes return, marks fine paid, generates PDF receipt
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
    const borrow = await Borrow.findById(borrowId).populate("user", "name email").populate("book", "title author");
    if (!borrow)
      return res.status(404).json({ message: "Borrow record not found." });
    if (borrow.user._id.toString() !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized." });

    const fine       = calcFine(borrow.dueDate);
    borrow.returnDate = new Date();
    borrow.fine       = fine;
    borrow.status     = "returned";
    await borrow.save();

    // Restore book stock
    await Book.findByIdAndUpdate(borrow.book._id || borrow.book, {
      $inc: { availableCopies: 1, quantity: 1 }
    });

    // Ensure receipts directory exists
    const receiptsDir = path.join(__dirname, "../public/receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const receiptFileName = `receipt_${razorpay_payment_id}.pdf`;
    const receiptFilePath = path.join(receiptsDir, receiptFileName);

    try {
      await generateReceiptPdf({
        studentName: borrow.user ? borrow.user.name : "Student",
        bookTitle:   borrow.book ? borrow.book.title : "Library Book",
        borrowDate:  borrow.borrowDate,
        returnDate:  borrow.returnDate,
        fineAmount:  fine,
        paymentId:   razorpay_payment_id,
        paymentDate: new Date()
      }, receiptFilePath);
    } catch (pdfErr) {
      console.error("[Receipt] PDF generation error:", pdfErr);
    }

    const receiptUrl = `/api/payments/receipt/${razorpay_payment_id}`;

    res.json({
      message:   "Payment verified and book returned successfully.",
      fine,
      paymentId: razorpay_payment_id,
      receiptUrl
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/payments/receipt/:paymentId ────────────────────────────────────
// Download receipt PDF
router.get("/receipt/:paymentId", (req, res) => {
  const filePath = path.join(__dirname, "../public/receipts", `receipt_${req.params.paymentId}.pdf`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Receipt file not found." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="receipt_${req.params.paymentId}.pdf"`);
  res.setHeader("Content-Type", "application/pdf");
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
