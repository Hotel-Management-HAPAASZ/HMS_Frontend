import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatSnackBarModule],
  template: `
<header class="site-header">
  <nav class="navbar container">
    <!-- Brand pinned to the left edge -->
    <a class="brand" routerLink="/">
      <span class="logo-badge">H</span>
      <span class="brand-title">Grand Palace Hotel</span>
    </a>

    <!-- Primary nav centered (hidden on small) -->
    <ul class="nav-links d-none d-md-flex">
      <li><a href="#search">Search</a></li>
      <li><a href="#amenities">Amenities</a></li>
      <li><a href="#highlights">Why Us</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#testimonials">Reviews</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>

    <!-- CTAs pinned to the right edge -->
    <div class="nav-cta">
      <a routerLink="/auth/register" class="btn btn-outline-primary d-none d-sm-inline-flex">Create account</a>
      <a href="#login" class="btn btn-app">Login</a>
    </div>
  </nav>
</header>

<!-- HERO -->
<section class="hero-section" id="top">
  <div class="container hero-grid">
    <div class="hero-copy">
      <div class="eyebrow">Stays • Rooms • Bookings • Hotels</div>
      <h1 class="hero-title">
        Find your next stay, <span class="gradient-text">made effortless.</span>
      </h1>
      <p class="hero-subtitle">
        Book verified hotel rooms with flexible policies, transparent pricing, and
        dedicated support. Inspired by the best of modern hotel management apps.
      </p>

      <div class="trust-row">
        <div class="trust-item"><strong>3M+</strong> nights booked</div>
        <div class="divider"></div>
        <div class="trust-item"><strong>4.8/5</strong> guest rating</div>
        <div class="divider"></div>
        <div class="trust-item"><strong>1000+</strong> partner properties</div>
      </div>
    </div>

    <!-- LOGIN CARD (bindings unchanged) -->
    <div id="login" class="app-card login-card p-3 p-md-4">
      <div class="text-center mb-3">
        <div class="logo-badge mx-auto mb-2">H</div>
        <h3 class="fw-bold mb-1">Login</h3>
        <p class="text-muted mb-0 small">Sign in to continue</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Email -->
        <div class="mb-2">
          <label class="form-label fw-semibold small">Email</label>
          <input
            type="email"
            class="form-control"
            formControlName="email"
            placeholder="you@email.com"
          />
          <div
            class="text-danger small mt-1"
            *ngIf="form.controls.email.touched && form.controls.email.invalid"
          >
            Valid email required
          </div>
        </div>

        <!-- Password -->
        <div class="mb-2">
          <label class="form-label fw-semibold small">Password</label>
          <input
            type="password"
            class="form-control"
            formControlName="password"
            placeholder="********"
          />
          <div
            class="text-danger small mt-1"
            *ngIf="form.controls.password.touched && form.controls.password.invalid"
          >
            Password required
          </div>
        </div>

        <!-- Forgot Password -->
        <div class="d-flex justify-content-end mb-2">
          <a routerLink="/auth/forgot-password" class="small text-decoration-none">
            Forgot password?
          </a>
        </div>

        <!-- Button -->
        <button
          type="submit"
          class="btn btn-app w-100"
          [disabled]="form.invalid || loading"
        >
          <span *ngIf="!loading">Login</span>
          <span *ngIf="loading" class="d-inline-flex align-items-center gap-2">
            <span class="spinner-border spinner-border-sm"></span>
            Logging in...
          </span>
        </button>

        <!-- Register -->
        <div class="text-center mt-2">
          <span class="text-muted small">New user?</span>
          <a routerLink="/auth/register" class="small fw-semibold text-decoration-none ms-1">
            Create account
          </a>
        </div>
      </form>
    </div>
  </div>

  <!-- SEARCH RIBBON -->
  <!-- <div id="search" class="search-ribbon container">
    <div class="search-grid">
      <div class="search-field">
        <label class="small">Where are you going?</label>
        <input class="form-control" placeholder="City or property name" />
      </div>

      <div class="search-field">
        <label class="small">Check‑in</label>
        <input type="date" class="form-control" />
      </div>

      <div class="search-field">
        <label class="small">Check‑out</label>
        <input type="date" class="form-control" />
      </div>

      <div class="search-field">
        <label class="small">Guests &amp; Rooms</label>
        <select class="form-select">
          <option selected>2 Adults • 1 Room</option>
          <option>1 Adult • 1 Room</option>
          <option>2 Adults • 2 Rooms</option>
          <option>Family • 2 Adults • 1 Child</option>
        </select>
      </div>

      <button class="btn btn-app search-btn" type="button">Search</button>
    </div>
    <div class="search-hint small text-muted mt-2">
      Tip: Sign in to unlock member prices.
    </div>
  </div>
</section> -->

<!-- AMENITIES -->
<section id="amenities" class="section container">
  <h2 class="section-title">Amenities that matter</h2>
  <p class="section-subtitle">Curated for comfort and convenience</p>

  <div class="card-grid">
    <article class="mini-card">
      <div class="badge-icon">🏊</div>
      <h3>Pool &amp; Spa</h3>
      <p>Relax with temperature‑controlled pools and signature spa therapies.</p>
    </article>
    <article class="mini-card">
      <div class="badge-icon">🍳</div>
      <h3>Breakfast Included</h3>
      <p>Complimentary multi‑cuisine breakfast to start your day.</p>
    </article>
    <article class="mini-card">
      <div class="badge-icon">📶</div>
      <h3>Hi‑speed Wi‑Fi</h3>
      <p>Reliable connectivity for workcations and streaming.</p>
    </article>
    <article class="mini-card">
      <div class="badge-icon">🚗</div>
      <h3>Airport Transfers</h3>
      <p>Door‑to‑door convenience with verified drivers.</p>
    </article>
    <article class="mini-card">
      <div class="badge-icon">🧹</div>
      <h3>Daily Housekeeping</h3>
      <p>Spotless rooms maintained by trained staff.</p>
    </article>
    <article class="mini-card">
      <div class="badge-icon">🛡️</div>
      <h3>24×7 Support</h3>
      <p>We’re a ping away for any assistance during your stay.</p>
    </article>
  </div>
</section>

<!-- HIGHLIGHTS / WHY US -->
<section id="highlights" class="section container">
  <div class="feature-banner">
    <div class="feature-copy">
      <h2 class="section-title">Why book with us?</h2>
      <ul class="feature-list">
        <li>Best price guarantee with no hidden charges</li>
        <li>Flexible cancellations on most rooms</li>
        <li>Verified photos and honest guest reviews</li>
        <li>Loyalty credits on every booking</li>
      </ul>
      <a href="#login" class="btn btn-app mt-2">Sign in to unlock deals</a>
    </div>

    <!-- Right-side image -->
    <div class="feature-media">
      <img
        src="https://placeideal.com/wp-content/uploads/2024/10/18-16-1536x1152.jpg"
        alt="Comfortable modern hotel room"
        loading="lazy"
      />
    </div>
  </div>
</section>

<!-- ABOUT -->
<section id="about" class="section container">
  <h2 class="section-title">About us</h2>
  <p class="section-subtitle">
    From boutique stays to business hotels, our platform connects travelers to
    well‑rated properties with transparent pricing and responsive support.
  </p>

  <div class="about-grid">
    <div class="about-card app-card">
      <h3>Our story</h3>
      <p>
        We started with a simple mission—make great stays easy to discover.
        Today, we partner with trusted hospitality brands to deliver consistent experiences.
      </p>
    </div>
    <div class="about-card app-card">
      <h3>Our values</h3>
      <p>
        Guest‑first service, fair pricing, and quality standards guide every listing and interaction.
      </p>
    </div>
    <div class="about-card app-card">
      <h3>Our footprint</h3>
      <p>
        Rapidly growing across major Indian cities and leisure destinations—more choices, more savings.
      </p>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section id="testimonials" class="section container">
  <h2 class="section-title">What guests say</h2>

  <!-- Grid on desktop; smooth horizontal scroll on small screens -->
  <div class="reviews-grid h-scroll-on-mobile">
    <blockquote class="review-card app-card">
      <p>“Clean rooms, quick check‑in, and the breakfast was fantastic!”</p>
      <footer>— Aditi, Mumbai</footer>
    </blockquote>
    <blockquote class="review-card app-card">
      <p>“The app made it easy to compare options and book in minutes.”</p>
      <footer>— Karan, Pune</footer>
    </blockquote>
    <blockquote class="review-card app-card">
      <p>“Loved the location suggestions and flexible cancellation policy.”</p>
      <footer>— Neha, Bengaluru</footer>
    </blockquote>
    <blockquote class="review-card app-card">
      <p>“Great value for money. Will definitely use again.”</p>
      <footer>— Rohan, Delhi</footer>
    </blockquote>
  </div>
</section>

<!-- CONTACT -->
<section id="contact" class="section container contact">
  <div class="contact-grid">
    
    <!-- CONTACT CARD -->
    <div class="contact-card app-card contact-pro">
      <div class="contact-header">
        <h3>Contact Us</h3>
        <p class="text-muted small">
          Need support with a booking or have a question? Our team responds 24×7.
        </p>
      </div>

      <form class="contact-form stack gap-2">
        <div class="input-wrap">
          <label>Your Name</label>
          <input class="form-control" placeholder="John Doe" />
        </div>

        <div class="input-wrap">
          <label>Email</label>
          <input class="form-control" placeholder="you@example.com" />
        </div>

        <div class="input-wrap">
          <label>Message</label>
          <textarea class="form-control" rows="3" placeholder="Write your message..."></textarea>
        </div>

        <button type="button" class="btn btn-app w-100 contact-btn">
          Send Message
        </button>
      </form>

      <div class="contact-info">
        <div class="info-item">
          <span class="icon">📞</span>
          <span>+91 80 1234 5678</span>
        </div>

        <div class="info-item">
          <span class="icon">✉️</span>
          <span>support&#64;hotelbooking.example</span>
        </div>
      </div>
    </div>

    <!-- MAP -->
    <div class="map-card app-card map-pro">
      <div class="map-embed">
        <iframe
          src="https://maps.google.com/maps?q=Pune%20India&z=11&output=embed"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>

  </div>
</section>

<!-- FOOTER -->
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <div class="logo-badge mb-2">H</div>
      <p class="text-muted small mb-2">© 2026 Hotel Booking System</p>
      <div class="social">
        <a href="#" aria-label="Instagram">📸</a>
        <a href="#" aria-label="X">𝕏</a>
        <a href="#" aria-label="Facebook">📘</a>
      </div>
    </div>

    <div class="links">
      <h4>Company</h4>
      <a href="#about">About</a>
      <a href="#highlights">Why Us</a>
      <a href="#contact">Support</a>
    </div>

    <div class="links">
      <h4>Explore</h4>
      <a href="#search">Hotels</a>
      <a href="#search">Resorts</a>
      <a href="#search">Apartments</a>
    </div>

    <div class="links">
      <h4>Legal</h4>
      <a href="#">Terms</a>
      <a href="#">Privacy</a>
      <a href="#">Cancellations</a>
    </div>
  </div>
</footer>
  `,
  styles: [`
/* ---------- Layout helpers ---------- */
.container { max-width: 1200px; margin-inline: auto; padding-inline: 16px; }
.section { padding: 64px 0; }
.section-title { font-weight: 800; font-size: clamp(24px, 3vw, 34px); margin-bottom: 8px; color: var(--app-text); }
.section-subtitle { color: rgba(15,23,42,.65); margin-bottom: 24px; }
.stack { display: flex; flex-direction: column; }
.gap-2 { gap: .75rem; }
.divider { width: 1px; height: 20px; background: var(--app-border); }

/* Make in-page anchors play well with sticky header */
[id] { scroll-margin-top: 84px; }

/* ---------- Header (aligned edges) ---------- */
.site-header {
  --header-h: 64px;
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: saturate(140%) blur(8px);
  background: linear-gradient(to bottom, rgba(255,255,255,.86), rgba(255,255,255,.58));
  border-bottom: 1px solid var(--app-border);
}

/* Grid: brand | nav-links (center) | ctas */
.navbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: var(--header-h);
  gap: 16px;
}

/* Brand pinned hard-left within container */
.brand { display:flex; align-items:center; gap:12px; justify-self: start; }
.brand-title { font-size: 20px; font-weight: 1000; letter-spacing: .3px; color: var(--app-text); text-decoration: none}

/* Nav centered */
.nav-links { list-style:none; display:flex; gap:18px; padding:0; margin:0; justify-self: center; }
.nav-links a {
  color: var(--app-text); text-decoration: none; opacity:.86;
  padding: 6px 8px; border-radius: 8px; position: relative; transition: color .2s ease, opacity .2s ease;
}
.nav-links a::after {
  content:""; position:absolute; left:8px; right:8px; bottom:2px;
  height:2px; background: transparent; border-radius: 2px; transition: background .2s ease;
}
.nav-links a:hover { opacity:1; color: var(--app-primary); }
.nav-links a:hover::after { background: linear-gradient(90deg, var(--app-primary), var(--app-secondary)); }

/* CTAs pinned hard-right */
.nav-cta { justify-self: end; display:flex; align-items:center; gap: 14px; }
.btn-outline-primary { border:1px solid var(--app-primary); color: var(--app-primary); background: transparent; }
.btn-outline-primary:hover { background: rgba(79,70,229,.06); }

/* ---------- Logo badge ---------- */
.logo-badge {
  width: 54px; height: 54px; border-radius: 16px; display:grid; place-items:center;
  font-size: 20px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
}

/* ---------- Hero ---------- */
/* Space between sticky header and hero */
.hero-section {
  position: relative;
  margin-top: clamp(10px, 2.2vw, 18px);
  padding: 48px 0 24px;
  background:
    radial-gradient(900px 500px at 75% -10%, rgba(6, 182, 212, 0.15), transparent 55%),
    radial-gradient(800px 450px at -5% 40%, rgba(79, 70, 229, 0.12), transparent 60%),
    var(--app-bg);
}
.hero-grid {
  display: grid; grid-template-columns: 1fr minmax(520px, 1.15fr); gap: 28px; align-items: center;
}
.hero-copy .eyebrow { color: var(--app-primary); font-weight: 700; text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; }
.hero-title { font-size: clamp(28px, 4.6vw, 48px); line-height: 1.12; margin: 8px 0 10px; color: var(--app-text); }
.gradient-text { background: linear-gradient(135deg, #111, var(--app-primary) 40%, var(--app-secondary)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-subtitle { color: rgba(15,23,42,.70); max-width: 56ch; }
.trust-row { margin-top: 18px; display:flex; flex-wrap: wrap; gap:12px; align-items: center; }
.trust-item { color:#111a; background: #fff; border:1px solid var(--app-border); padding:8px 12px; border-radius: 12px; box-shadow: 0 6px 14px rgba(2,8,23,.06); }

/* ---------- Login card (wider) ---------- */
.login-card {
  width: min(80%, 700px);
  margin-left: auto; /* keep to the right of hero grid */
}
.login-card .form-control { padding: 10px 12px; font-size: 0.95rem; }

/* ---------- Search ribbon ---------- */
.search-ribbon { margin-top: 18px; }
.search-grid {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1.2fr auto; gap: 10px;
  align-items: end;
  background: var(--app-card); padding: 12px; border-radius: 14px; border: 1px solid var(--app-border);
  box-shadow: 0 12px 30px rgba(2,8,23,.08);
}
.search-field label { color: rgba(15,23,42,.65); display:block; margin: 4px 2px; }
.search-btn {
  padding-inline: 22px; min-height: 20px; height: 50%;
  display:flex; align-items:center; justify-content:center;
  border-radius: 12px;
}

/* ---------- Amenity grid ---------- */
.card-grid { margin-top: 10px; display:grid; gap: 16px; grid-template-columns: repeat(6, 1fr); }
@media (max-width: 1100px){ .card-grid{ grid-template-columns: repeat(3,1fr); } }
@media (max-width: 640px){ .card-grid{ grid-template-columns: repeat(2,1fr); } }
.mini-card {
  background: var(--app-card); border:1px solid var(--app-border); border-radius: 14px; padding: 16px;
  transition: transform .2s ease, box-shadow .2s ease;
  box-shadow: 0 10px 22px rgba(2,8,23,.06);
}
.mini-card:hover { transform: translateY(-4px); box-shadow: 0 16px 28px rgba(2,8,23,.10); }
.mini-card h3 { font-size: 1rem; margin: 8px 0 4px; color: var(--app-text); }
.mini-card p { color: rgba(15,23,42,.70); margin: 0; }
.badge-icon { font-size: 20px; background: rgba(79,70,229,0.10); border: 1px solid var(--app-border); width: 36px; height: 36px; display:grid; place-items:center; border-radius: 10px; }

/* ---------- Why book with us ---------- */
.feature-banner {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  align-items: stretch;
  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.05));
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 14px 32px rgba(2, 8, 23, .08);
}
.feature-copy {
  padding: 32px 34px;
  display: flex; flex-direction: column; gap: 18px;
}
.feature-copy h2.section-title { margin-bottom: 4px !important; }
.feature-list {
  padding-left: 20px; display: flex; flex-direction: column; gap: 10px;
  font-size: 1rem; color: rgba(15, 23, 42, .78); line-height: 1.55;
}
.feature-copy .btn-app { margin-top: 4px; padding: 10px 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; }
.feature-media { position: relative; min-height: 260px; }
.feature-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0; }

@media (max-width: 900px) {
  .feature-banner { grid-template-columns: 1fr; }
  .feature-media { height: 220px; }
}

/* ---------- About ---------- */
.about-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px; align-items: stretch;
}
@media (max-width: 1024px) { .about-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .about-grid { grid-template-columns: 1fr; } }

.about-card {
  display: flex; flex-direction: column; justify-content: flex-start; gap: 10px;
  background: var(--app-card, #fff); border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 14px; box-shadow: 0 10px 22px rgba(2, 8, 23, .06);
  padding: 18px 18px 20px 18px; min-height: 164px;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.about-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(2, 8, 23, .10);
  border-color: color-mix(in oklab, var(--app-primary, #4f46e5) 22%, var(--app-border, #e5e7eb));
}
.about-card h3 { margin: 0; color: var(--app-text, #0f172a); font-size: 1.05rem; font-weight: 700; letter-spacing: .1px; line-height: 1.25; }
.about-card p { margin: 0; color: rgba(15, 23, 42, .75); line-height: 1.55; text-wrap: pretty; word-break: normal; }

/* ---------- Testimonials ---------- */
.reviews-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px; align-items: stretch;
}
.review-card {
  background: var(--app-card, #fff);
  border: 1px solid var(--app-border, #e5e7eb);
  border-radius: 14px; box-shadow: 0 10px 22px rgba(2, 8, 23, .06);
  margin-top: 20px;
  display: flex; flex-direction: column; justify-content: space-between;
  gap: 12px; min-height: 150px; padding: 18px;
  position: relative; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.review-card::before {
  content: "“"; position: absolute; top: 10px; left: 12px; font-size: 32px; line-height: 1;
  color: rgba(79, 70, 229, .18); pointer-events: none;
}
.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(2, 8, 23, .10);
  border-color: color-mix(in oklab, var(--app-primary, #4f46e5) 22%, var(--app-border, #e5e7eb));
}
.review-card p { margin: 0; padding-left: 6px; color: var(--app-text, #0f172a); font-size: .995rem; line-height: 1.55; text-wrap: pretty; word-break: normal; }
.review-card footer { margin: 0; padding-left: 6px; color: rgba(15, 23, 42, .65); font-size: .92rem; display: inline-flex; align-items: center; gap: 8px; }
.review-card footer::before { content: "—"; color: rgba(15, 23, 42, .45); }

/* Horizontal scroll on narrow screens */
@media (max-width: 1024px) {
  .reviews-grid {
    display: grid; grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr);
    overflow-x: auto; gap: 16px; padding-bottom: 6px; scroll-snap-type: x mandatory;
  }
  .reviews-grid > * { scroll-snap-align: start; }
}
@media (max-width: 520px) { .reviews-grid { grid-auto-columns: 88%; } }
.h-scroll-on-mobile { overflow: hidden; }

/* ---------- Contact ---------- */
/* ----------- PROFESSIONAL CONTACT CARD ----------- */

.contact-pro {
  padding: 26px 26px 30px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  box-shadow: 0 14px 28px rgba(2, 8, 23, 0.06);
  background: #ffffff;
}

/* Header spacing */
.contact-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.contact-header p {
  margin-bottom: 18px;
  color: rgba(15, 23, 42, 0.65);
}

/* Input wrappers */
.input-wrap label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.65);
  margin-bottom: 4px;
  display: block;
}

.contact-form .form-control {
  height: 44px;
  padding: 10px 12px;
  font-size: 0.92rem;
  border-radius: 10px;
}

/* Textarea height */
.contact-form textarea.form-control {
  height: auto;
  resize: vertical;
}

/* Send button */
.contact-btn {
  margin-top: 6px;
  padding: 12px 0;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.28);
}

/* Contact info section */
.contact-info {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--app-border);
  display: grid;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.93rem;
  color: rgba(15, 23, 42, 0.75);
}

.info-item .icon {
  font-size: 1.1rem;
  width: 32px;
  height: 32px;
  background: rgba(79, 70, 229, 0.10);
  border-radius: 8px;
  display: grid;
  place-items: center;
  border: 1px solid var(--app-border);
}

/* ---------- MAP CARD PROFESSIONAL ---------- */
.map-pro {
  padding: 0;
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 28px rgba(2, 8, 23, 0.06);
}

.map-embed {
  position: relative;
  padding-top: 68%;
}

.map-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Responsive Fix */
@media (max-width: 900px) {
  .contact-pro {
    padding: 20px;
  }
}

/* ---------- Footer ---------- */
.site-footer {
  margin-top: 40px; padding: 36px 0; border-top: 1px solid var(--app-border);
  background: linear-gradient(180deg, rgba(79,70,229,0.06), rgba(6,182,212,0.04));
}
.footer-grid { display:grid; grid-template-columns: 1.2fr repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px){ .footer-grid{ grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px){ .footer-grid{ grid-template-columns: 1fr; } }
.links { display:flex; flex-direction: column; gap: 8px; }
.links a { color: rgba(15,23,42,.75); text-decoration: none; }
.links a:hover { color: var(--app-primary); }
.social a { margin-right: 10px; text-decoration: none; }

/* ---------- Responsive tweaks ---------- */
@media (max-width: 980px){
  .hero-grid{ grid-template-columns: 1fr; }
  .login-card{ width: min(100%, 900px); margin: 8px 0 0 0; }
  .search-grid{ grid-template-columns: 1fr 1fr 1fr 1fr; }
  .search-btn{ grid-column: span 4; }
}
@media (max-width: 640px){
  .nav-links{ display:none !important; }
  .hero-section{ padding-top: 36px; }
  .search-grid{ grid-template-columns: 1fr; }
  .search-btn{ grid-column: auto; }
}
  `]
})
export class LoginComponent {
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) { }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: (user) => {
        this.loading = false;
        console.log('[LOGIN SUCCESS]', user);
        this.snack.open(`Welcome ${user.fullName}`, 'OK', { duration: 2000 });

        if (user.role === 'ADMIN') this.router.navigateByUrl('/admin/dashboard');
        else if (user.role === 'STAFF') this.router.navigateByUrl('/staff/dashboard');
        else this.router.navigateByUrl('/customer/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.message ?? 'Login failed', 'OK', { duration: 3000 });
      }
    });
  }
}