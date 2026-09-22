# Library-Management-System

A full-stack web-based Library Management System that digitizes book management, user authentication, borrowing, returns, renewals, fine management, and administrative operations.

## Features

* User registration and login with JWT authentication
* Role-based access for Students, Teachers, and Admins
* Add, update, delete, search, and filter books
* Book borrowing, renewal, and return management
* Automatic due-date and overdue fine calculation
* Online fine payment using Razorpay
* PDF receipt generation after payment
* User profile management
* Admin dashboard for managing books, users, and borrowing records
* Automated email reminders for due and overdue books

## Tech Stack

**Frontend**

* React
* JavaScript
* HTML/CSS
* Axios

**Backend**

* Node.js
* Express.js
* REST APIs
* JWT
* bcrypt.js

**Database**

* MongoDB
* Mongoose

**Other Technologies**

* Razorpay
* Cloudinary
* Nodemailer
* PDFKit
* node-cron

## Project Structure

```text
Library-Management-System/
├── middleware/       # Authentication & authorization
├── models/           # MongoDB/Mongoose schemas
├── routes/           # REST API routes
├── services/         # Background services
├── scripts/          # Database and utility scripts
├── src/              # React frontend
├── public/           # Static pages and assets
├── server.js         # Express server
├── package.json
└── .env.example
```

## Core Modules

### Authentication

JWT-based authentication with bcrypt password hashing and role-based authorization.

### Book Management

Admins can manage books, copies, ISBNs, descriptions, tags, and book availability. Users can search and filter the catalogue.

### Borrowing System

Users can borrow and renew books, track due dates, return books, and view their borrowing history.

### Fine & Payment System

Overdue fines are calculated automatically at INR 5 per overdue day. Razorpay is used for online fine payments, with payment verification and PDF receipt generation.

### Notifications

Scheduled email reminders notify users about upcoming or overdue books.

## Installation

```bash
git clone https://github.com/Nishita1107/Library-Management-System.git
cd Library-Management-System
npm install
```

Create a `.env` file using `.env.example` and configure the required MongoDB, JWT, Razorpay, and email credentials.

Start the backend:

```bash
node server.js
```

Start the frontend:

```bash
npm start
```

Backend:

```text
http://localhost:5000
```

Frontend:

```text
http://localhost:3000
```

## Learning Outcomes

This project demonstrates practical experience with:

* Full-stack web development
* REST API development
* MongoDB and Mongoose
* Authentication and authorization
* CRUD operations
* Role-based access control
* Payment gateway integration
* PDF generation
* Scheduled background tasks


GitHub: [Nishita1107](https://github.com/Nishita1107)
