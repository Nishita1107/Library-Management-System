const express = require("express");
const router = express.Router();

const Book = require("../models/Book");

// GET all books
router.get("/", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// POST a new book
router.post("/", async (req, res) => {
  try {
    const newBook = new Book({
      title: req.body.title,
      author: req.body.author,
      quantity: req.body.quantity
    });

    const savedBook = await newBook.save();

    res.status(201).json(savedBook);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

module.exports = router;