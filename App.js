import React from 'react';
import './App.css';
import logo from './logo.png';
import libraryPhoto from './lib.jpg';

function App() {
  return (
    <div className="App">

      {/* Navbar */}
      <header className="navbar">
        <div className="nav-brand">
          <img src={logo} alt="DY Patil RAIT logo" className="nav-logo-img" />
        </div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero" id="home">
        <img src={libraryPhoto} alt="RAIT Library" className="hero-bg-img" />

        <div className="hero-overlay">
          <h1 className="hero-title">RAMRAO ADIK INSTITUTE OF TECHNOLOGY</h1>

          <div className="hero-text">
            <p className="hero-subtext">RAIT Smart Library</p>

            <div className="hero-actions">
              <button className="btn btn-hero">Login</button>
              <button className="btn btn-hero">Register</button>
            </div>
          </div>
        </div>
      </section>

      {/* About the Library */}
      <section className="about-section">
        <h2>About the Library</h2>
        <p>
          The library has e-books, more than 1000 international and national
          e-journals, more than 80 printed journals, books, and 2000+ CDs and
          DVDs, among other resources. The ambience is suitable to write,
          read, and conceive new ideas. The library also gives unlimited
          access to many reputed journals to foster research amongst
          teachers and learners.
        </p>
      </section>

      {/* Footer */}
      <footer className="site-footer" id="contact">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>RAIT Smart Library</h3>
            <p>
              Sector 7, Phase I,<br />
              Dr. D. Y. Patil Vidyapeeth,<br />
              Nerul, Navi Mumbai - 400706,<br />
              Maharashtra, India
            </p>
          </div>
          <div className="footer-col">
            <h3>Library Hours</h3>
            <ul>
              <li>Mon - Sat: 9:00 AM - 5:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Contact</h3>
            <ul>
              <li>022-27709574</li>
              <li>022-27709505</li>
              <li>library@rait.ac.in</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          Ramrao Adik Institute of Technology - Smart Library Management System
        </div>
      </footer>

    </div>
  );
}

export default App;