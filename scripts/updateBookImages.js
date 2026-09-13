require("dotenv").config();

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const Book = require("../models/Book");

async function updateBookImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "library-books/",
      resource_type: "image",
      max_results: 500,
    });

    console.log(`🖼️ Found ${result.resources.length} images in Cloudinary`);

    let updated = 0;
    let notFound = 0;

    for (const image of result.resources) {
      // Example public_id:
      // library-books/001-fundamentals-of-software-engineering

      const filename = image.public_id.split("/").pop();

      const titleFromFile = filename
        .replace(/^\d+-/, "")
        .replace(/-/g, " ")
        .trim();

      const escapedTitle = titleFromFile.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const book = await Book.findOne({
        title: {
          $regex: `^${escapedTitle}$`,
          $options: "i",
        },
      });

      if (!book) {
        console.log(`⚠️ No MongoDB match: ${titleFromFile}`);
        notFound++;
        continue;
      }

      book.imageUrl = image.secure_url;
      await book.save();

      console.log(`✅ Updated: ${book.title}`);
      updated++;
    }

    console.log("\n==============================");
    console.log("   IMAGE UPDATE COMPLETE");
    console.log("==============================");
    console.log(`🖼️ Cloudinary images: ${result.resources.length}`);
    console.log(`✅ MongoDB books updated: ${updated}`);
    console.log(`⚠️ No matching book: ${notFound}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

updateBookImages();