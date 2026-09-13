const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, "Book title is required."],
      trim:     true,
    },

    author: {
      type:     String,
      required: [true, "Author name is required."],
      trim:     true,
    },

    publishingYear: {
      type: Number,
      min: [1000, "Invalid year."],
      max: [new Date().getFullYear(), "Year cannot be in the future."],
      default: null,
    },

    imageUrl: {
      type:    String,
      default: null,
      trim:    true,
    },

    tags: {
      type:    [String],
      default: [],
    },

    description: {
      type:    String,
      default: "",
      trim:    true,
    },

    isbn: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },

    totalCopies: {
      type:    Number,
      default: 1,
      min:     0,
    },

    availableCopies: {
      type:    Number,
      default: 1,
      min:     0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
BookSchema.index({ tags: 1 });
BookSchema.index({ title: "text", author: "text" });
BookSchema.index({ publishingYear: 1 });
BookSchema.index({ availableCopies: 1 });

module.exports = mongoose.model("Book", BookSchema);
