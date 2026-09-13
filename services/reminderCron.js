const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Borrow = require("../models/Borrow");

// Helper to create transport
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user, pass }
  });
}

// Function to find active borrows due within 2 days and send email
async function sendEmailReminders() {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[ReminderCron] EMAIL_USER or EMAIL_PASS not set in .env. Skipping email dispatch.");
    return { sent: 0, skipped: true };
  }

  try {
    const now = new Date();
    const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Active borrows due within next 2 days where reminder has not been sent yet
    const borrows = await Borrow.find({
      status: "active",
      reminderSent: { $ne: true },
      dueDate: { $lte: twoDaysAhead }
    }).populate("user", "name email").populate("book", "title author");

    console.log(`[ReminderCron] Found ${borrows.length} borrows requiring reminders.`);

    let sentCount = 0;
    for (const borrow of borrows) {
      if (!borrow.user || !borrow.user.email) {
        continue;
      }

      const bookTitle = borrow.book ? borrow.book.title : "Borrowed Book";
      const userName = borrow.user.name || "Student";
      const dueStr = new Date(borrow.dueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      const mailOptions = {
        from: `"RAIT Smart Library" <${process.env.EMAIL_USER}>`,
        to: borrow.user.email,
        subject: `Reminder: Book "${bookTitle}" is due on ${dueStr}`,
        text: `Hello ${userName},\n\nThis is a friendly reminder from RAIT Smart Library that your borrowed book "${bookTitle}" is due on ${dueStr}.\n\nPlease return or renew the book on your dashboard to avoid late fines (₹5/day).\n\nBest regards,\nRAIT Smart Library`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background-color: #800000; color: white; padding: 12px 18px; border-radius: 6px 6px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">RAIT Smart Library — Due Date Reminder</h2>
            </div>
            <div style="padding: 20px 10px;">
              <p>Dear <strong>${userName}</strong>,</p>
              <p>This is a friendly reminder that your borrowed book is due soon:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Book Title:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${bookTitle}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #b85c00; font-weight: bold;">${dueStr}</td></tr>
              </table>
              <p>Please return or renew the book on your student dashboard before the due date to avoid overdue fines of ₹5 per day.</p>
              <p style="margin-top: 24px;">Warm regards,<br/><strong>RAIT Smart Library Team</strong></p>
            </div>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        borrow.reminderSent = true;
        await borrow.save();
        sentCount++;
        console.log(`[ReminderCron] Reminder sent to ${borrow.user.email} for book "${bookTitle}"`);
      } catch (err) {
        console.error(`[ReminderCron] Failed to send email to ${borrow.user.email}:`, err.message);
      }
    }

    return { sent: sentCount, total: borrows.length };
  } catch (error) {
    console.error("[ReminderCron] Error during reminder job:", error.message);
    return { error: error.message };
  }
}

// Start daily cron job (runs at 9:00 AM daily)
function initReminderCron() {
  // Cron expression: 0 9 * * * (At 09:00 AM every day)
  cron.schedule("0 9 * * *", async () => {
    console.log("[ReminderCron] Running daily email reminder task...");
    await sendEmailReminders();
  });
  console.log("[ReminderCron] Daily email reminder cron scheduled for 09:00 AM.");
}

module.exports = {
  initReminderCron,
  sendEmailReminders
};
