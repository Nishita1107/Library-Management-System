require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const Book = require("../models/Book");

const dataPath = path.join(__dirname, "../books_dataset_researched.json");

async function seedBooks() {
  try {
    let mongoUri = process.env.MONGO_URI;
    if (mongoUri && !mongoUri.includes("/libraryDB")) {
      mongoUri = mongoUri.replace(/\.mongodb\.net\/?(\?|$)/, ".mongodb.net/libraryDB$1");
    }

    // Connect to MongoDB Atlas
    await mongoose.connect(mongoUri, { dbName: "libraryDB" });
    console.log(`✅ MongoDB connected successfully to database: ${mongoose.connection.name}`);

    // Read dataset
    const books = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    console.log(`📚 Found ${books.length} books in dataset`);

    let inserted = 0;
    let skipped = 0;

    for (const book of books) {
      // Your Book schema requires these fields
      if (!book.author || !book.publishingYear) {
        console.log(`⚠️ Skipping: ${book.title}`);
        console.log("   Missing author or publishing year");
        skipped++;
        continue;
      }

      // Check if book already exists
      const existingBook = await Book.findOne({
        title: book.title,
        author: book.author,
      });

      if (existingBook) {
        console.log(`⏭️ Already exists: ${book.title}`);
        skipped++;
        continue;
      }

      const newBook = new Book({
        title: book.title,
        author: book.author,
        publishingYear: book.publishingYear,

        // Cloudinary URL will be added separately
        imageUrl: book.imageUrl || null,

        tags: book.tags || [],

        description: book.description || "",

        isbn: book.isbn || undefined,

        totalCopies: book.copies || 1,
        availableCopies: book.copies || 1,
      });

      await newBook.save();

      console.log(`✅ Added: ${book.title}`);
      inserted++;
    }

    console.log("\n==============================");
    console.log("        SEEDING COMPLETE");
    console.log("==============================");
    console.log(`📚 Total in dataset: ${books.length}`);
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⚠️ Skipped: ${skipped}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

seedBooks();