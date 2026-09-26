# 🛡️ SafarSaarthi
## On-the-Spot Tourism & Transit Trust Protocol

> Turning uncertain street-level tourism interactions into verified, data-backed transactions.

---

## 🌐 Overview & Capabilities

SafarSaarthi is a real-time tourism safety and trust platform designed for situations where travelers interact with unknown drivers, guides, and local service providers on the spot, without advance booking.

### Core Modules & Features:

- 🔐 **Digital Handshake & QR verification**: Rotating short-lived QR codes with GPS proximity bounding.
- 🏨 **Check My Stay / Hotel Safety**: Verified safety badges, AI photo validation, and local risk signals.
- 💰 **Route Fare Intelligence**: Real-world fare benchmarks based on recent passenger transactions.
- 📍 **Personalized Radar & Safe Discovery**: Dynamic suggestions matching traveler vibes and interests.
- 🚕 **Driver / Guide Ledger**: Verified proof-of-presence reputation ledger.
- 🆘 **Tourist Safety / SOS Evidence Dossier**: Instant police-ready evidence packaging with exportable reports.
- 📱 **Responsive Mobile-First UI**: Seamless experience on smartphones, tablets, and desktops.

---

## 🎯 The Problem

Tourists often face uncertainty during spontaneous local interactions:

- ❌ Unknown driver or guide identity & legitimacy
- ❌ Unclear, inflated, or arbitrary fares
- ❌ Tourist-targeted touts and scam zones
- ❌ Lack of authentic, tamper-proof reviews
- ❌ Difficulty documenting disputes or emergency incidents

SafarSaarthi unifies identity verification, fair pricing intelligence, location context, encounter records, and instant SOS evidence into a single, intuitive platform.

---

## 💡 Solution Architecture

### 🔐 1. Digital Handshake
Passengers can verify a driver or guide on the spot using a GPS-linked rotating QR code:
- Driver / guide identity & vehicle information
- Live GPS proximity validation
- Short-lived rotating QR tokens
- Cryptographically verifiable encounter records

### 🏨 2. Check My Stay & Hotel Intelligence
Comprehensive safety analytics for tourist accommodations:
- Neighborhood safety score and night-walk ratings
- Curated scam warnings and emergency service contacts
- Evidence photo verification via AI image analysis

### 💰 3. Route Fare Intelligence
Provides fair price benchmarks based on recent traveler payments:
- Live minimum, average, and high price bounds
- Prevents predatory pricing before entering a vehicle

### 🧾 4. Proof-of-Presence Ledger
Connects driver/guide reputation to real, verified encounters:
- `Passenger ➔ Driver/Guide ➔ GPS ➔ Timestamp ➔ Verified Token ➔ Ledger Record`

### 🆘 5. Tourist Safety SOS & Evidence Dossier
Generates a structured, police-ready incident report containing:
- GPS coordinates & exact timestamp
- Operator credentials & vehicle details
- Quoted fares vs. actual charges
- Exportable high-resolution dossier for law enforcement

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Modern ES6+ JavaScript, Font Awesome 6
- **Mapping & Location:** Google Maps JavaScript API / OpenStreetMap
- **QR & Computer Vision:** QRCode.js, Html5-QRCode, Tesseract OCR
- **Backend & APIs:** Node.js, Express, Firebase / Vercel Serverless Functions
- **AI Integrations:** Vision-based evidence validation & intelligent recommendations

---

## 📁 Project Structure

```text
SafarSaarthi/
│
├── index.html              # Main application single-page interface
├── server.js               # Node.js backend server
├── package.json            # Node project configuration
├── START_SAFARSAARTHI.bat  # Quick launch script for Windows
├── logo.jpeg               # Application brand logo
├── rickshow.png            # Asset illustrations
│
├── js/                     # Application logic modules
│   ├── app.js              # Core UI orchestration & navigation
│   ├── authManager.js      # Role-based identity & profile manager
│   ├── handshake.js        # Digital Handshake & QR flow
│   ├── hotelSafety.js      # Hotel Safety & Check My Stay engine
│   ├── evidencePacket.js   # SOS & Evidence Dossier generator
│   ├── store.js            # Central state & local storage controller
│   ├── seedData.js         # Curated seed datasets (Vadodara & multi-city)
│   ├── utils.js            # Formatting, crypto & math utilities
│   └── ...
│
├── css/                    # Modular stylesheet architecture
│   ├── main.css            # Global styling & layout system
│   ├── components.css      # Reusable UI component styles
│   └── responsive.css      # Mobile, tablet & desktop media queries
│
├── api/                    # Serverless API routes
│   └── analyze-hotel-photo.js
│
└── data/                   # Data assets & seeds
```

---

## ▶️ How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or newer recommended)

### 2. Quick Start (Windows)
Double-click `START_SAFARSAARTHI.bat` or run:

```bash
npm start
```

### 3. Manual Start
```bash
# Install dependencies
npm install

# Start local server
node server.js
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## ⭐ SafarSaarthi in One Sentence

> **SafarSaarthi transforms uncertain, street-level tourism interactions into verified, transparent, and safer experiences for travelers worldwide.**
