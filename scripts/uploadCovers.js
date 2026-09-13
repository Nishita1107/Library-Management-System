require("dotenv").config();

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const Book = require("../models/Book");

const fs = require("fs");
const path = require("path");

const coversDir = path.join(__dirname, "../book_covers");

async function uploadAndUpdateBooks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const files = fs
      .readdirSync(coversDir)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
      .sort();

    console.log(`📚 Found ${files.length} cover images`);

    for (const file of files) {
      const filePath = path.join(coversDir, file);

      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
          folder: "library-books",
          resource_type: "image",
        });

        const imageUrl = result.secure_url;

        /*
          Filename example:
          001-fundamentals-of-software-engineering.jpg

          Remove:
          - number
          - hyphen
          - extension

          Result:
          "fundamentals-of-software-engineering"
        */
        const titleFromFile = file
          .replace(/^\d+-/, "")
          .replace(/\.(jpg|jpeg|png)$/i, "")
          .replace(/-/g, " ")
          .trim();

        // Find the MongoDB book using a case-insensitive title match
        const book = await Book.findOne({
          title: {
            $regex: `^${titleFromFile}$`,
            $options: "i",
          },
        });

        if (!book) {
          console.log(`⚠️ No MongoDB book found for: ${file}`);
          continue;
        }

        // Update image URL
        book.imageUrl = imageUrl;
        await book.save();

        console.log(`✅ ${book.title}`);
        console.log(`   ${imageUrl}`);

      } catch (error) {
        console.error(`❌ Failed: ${file}`);
        console.error(`   ${error.message}`);
      }
    }

    console.log("\n==============================");
    console.log("   COVER UPDATE COMPLETE");
    console.log("==============================");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

uploadAndUpdateBooks();