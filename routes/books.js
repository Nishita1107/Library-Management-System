const express    = require("express");
const router     = express.Router();
const Book       = require("../models/Book");
const adminAuth  = require("../middleware/adminAuth");

// ── GET /api/books ───────────────────────────────────────────────────────────
// Supports filtering: ?tags=Java,OOP  ?year=2  ?search=java  ?available=true
router.get("/", async (req, res) => {
  try {
    const filter = {};

    // Filter by one or more tags  e.g. ?tags=Java,OOP
    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((t) => t.trim());
      filter.tags = { $all: tags };
    }

    // Filter by academic year tag  e.g. ?year=2  → "2nd Year"
    const yearMap = { "1": "1st Year", "2": "2nd Year", "3": "3rd Year", "4": "4th Year" };
    if (req.query.year && yearMap[req.query.year]) {
      filter.tags = filter.tags
        ? { $all: [...filter.tags.$all, yearMap[req.query.year]] }
        : yearMap[req.query.year];
    }

    // Filter available only  e.g. ?available=true
    if (req.query.available === "true") {
      filter.availableCopies = { $gt: 0 };
    }

    // Search title or author  e.g. ?search=head+first
    if (req.query.search) {
      const queryStr = req.query.search.trim();
      if (queryStr) {
        filter.$or = [
          { title:  { $regex: queryStr, $options: "i" } },
          { author: { $regex: queryStr, $options: "i" } }
        ];
      }
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/books/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found." });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/books ──────────────────────────────────────────────────────────
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, author, publishingYear, imageUrl, tags, description, isbn, totalCopies } = req.body;

    if (!title || !author || !publishingYear) {
      return res.status(400).json({ message: "title, author and publishingYear are required." });
    }

    const copies = totalCopies || 1;

    const book = await Book.create({
      title,
      author,
      publishingYear,
      imageUrl:        imageUrl || null,
      tags:            tags || [],
      description:     description || "",
      isbn:            isbn || undefined,
      totalCopies:     copies,
      availableCopies: copies,
    });

    res.status(201).json(book);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "A book with this ISBN already exists." });
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /api/books/:id ─────────────────────────────────────────────────────
router.patch("/:id", adminAuth, async (req, res) => {
  try {
    const allowed = ["title", "author", "publishingYear", "imageUrl", "tags", "description", "isbn", "totalCopies"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const book = await Book.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: "Book not found." });
    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /api/books/:id ────────────────────────────────────────────────────
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found." });
    res.json({ message: "Book deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
