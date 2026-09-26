# 🛡️ SafarSaarthi
### On‑the‑Spot Tourism & Transit Trust Protocol
**Smart India Hackathon 2026**

*Turning uncertain, street‑level tourist interactions into verified, transparent, and safer experiences.*

![SIH 2026](https://img.shields.io/badge/SIH-2026-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/status-live-brightgreen?style=for-the-badge)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green?style=for-the-badge&logo=node.js)

### 🌐 [Live Prototype](https://safarsaarthi-1d969.web.app/) &nbsp;•&nbsp; 💻 [GitHub](https://github.com/drana25/SafarSaarthi/tree/main) &nbsp;•&nbsp; 📄 [Report](./SafarSaarthi_Report.pdf) &nbsp;•&nbsp; 📊 [Presentation](./FLUX1-SIH.pdf) &nbsp;•&nbsp; 🎥 [Demo Video](https://youtu.be/8Rtp1CgdQWQ?si=SbgZAsbnfPaNHQaf)

---

## 📑 Table of Contents

- [About](#-about)
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Core Features](#-core-features)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment & Configuration](#-environment--configuration)
- [Available Scripts](#-available-scripts)
- [Deployment](#-deployment)
- [Data Sources](#-data-sources)
- [Security Notes](#-security-notes)
- [Roadmap](#-roadmap)
- [Challenges & Mitigations](#-challenges--mitigations)
- [Impact](#-impact)
- [SIH 2026 Submission](#-sih-2026-submission)
- [Team](#-team)

---

## 🚀 About

**SafarSaarthi** is a real‑time tourism safety and trust platform built for **Smart India Hackathon 2026**. It targets the moment travelers interact with unknown drivers, guides, hotels, and local vendors **on the spot — without advance booking** — and gives them verification, fair‑price context, local risk awareness, and evidence tools, all in one place.

> **Verify who you meet. Know what you should pay. Understand the local risk. Stay somewhere safe. Create proof if something goes wrong.**

The prototype currently ships as a responsive, installable web app with a **Passenger Mode** and a **Driver/Guide Mode**, backed by Firebase and a real 106‑hotel Vadodara safety dataset.

---

## 🎯 Problem Statement

Tourists routinely face uncertainty during spontaneous, unbooked interactions:

- ❌ Unknown driver / guide identity
- ❌ Unclear or inflated fares
- ❌ Tourist‑targeted scams and touts near stations, landmarks, and hotels
- ❌ No reliable way to judge whether a hotel or its surrounding area is safe
- ❌ Limited trust in anonymous online reviews
- ❌ Difficulty documenting disputes or incidents
- ❌ Limited support in an actual emergency

SafarSaarthi brings **identity verification, pricing context, location‑aware risk data, encounter records, and incident evidence** together into a single, mobile‑first platform.

---

## 💡 Our Solution

| # | Module | What it does |
|---|--------|---------------|
| 1 | 🔐 **Digital Handshake** | GPS‑linked rotating QR verification that turns an anonymous ride/guide interaction into a verified, timestamped encounter. |
| 2 | 💰 **Route Fare Intelligence / Price Pulse** | Shows fair‑price benchmarks for a route using recent passenger‑paid data, so travelers can spot inflated quotes before accepting. |
| 3 | 📷 **Price Camera** | In‑browser OCR (Tesseract.js) that reads a quoted price off a photo and checks it against the live fair‑price bracket, with a negotiation coach. |
| 4 | 📍 **Scam Hotspot Radar** | An interactive map (Leaflet) plus a full places directory that flags tout zones, fake‑guide spots, overcharging hotspots, and ticket scams, with proactive geofence alerts. |
| 5 | 🏨 **My Stay — Hotel & Area Safety Check** | Lets a tourist search a real hotel from the verified **Vadodara Hotel Safety Dataset (106 properties)** and see the surrounding area's amenities, distances, and safety‑relevant context — never a fabricated "safe/unsafe" label. |
| 6 | 🧾 **Proof‑of‑Presence Ledger / Digital Footprint** | Links reviews to a verified physical encounter (passenger → driver/guide → location → timestamp → verification token) instead of anonymous ratings, and keeps a trip‑by‑trip digital footprint with route snapshots. |
| 7 | 🆘 **SOS & Tourist‑Police Evidence Packet** | One‑tap bundle of GPS, timestamp, scanned license/vehicle info, agreed price, and photo evidence — built for reporting to Tourist Police (1363 / 112) — plus a delayed‑trip safety check‑in flow. |
| 8 | 🚕 **Driver / Guide Mode** | Lets verified drivers/guides register, generate rotating QR codes, and get scanned by passengers to complete the handshake. |

---

## 🧠 How It Works

```text
        TOURIST ARRIVES
              ↓
        Select Route
              ↓
     Check Fare Intelligence
              ↓
       Scan Driver QR
              ↓
  Verify Identity + Proximity
              ↓
      DIGITAL HANDSHAKE
              ↓
         Ride / Service
              ↓
      Review + Ledger Entry
              ↓
       SOS IF REQUIRED
```

**Passenger flow:** Open app → GPS/location → Route selection → Fare benchmark → Driver verification → Verified encounter → Trip/service → Digital footprint entry → Review.

**Driver / Guide flow:** Register profile → Add vehicle/license details → Generate rotating QR → Passenger scans QR → Identity/proximity check → Verified encounter → Trust ledger.

**Traditional platforms:** `BOOK → TRAVEL → REVIEW`
**SafarSaarthi:** `MEET → VERIFY → CHECK PRICE → STAY SAFE → TRAVEL → PROVE`

---

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3 (custom design system in `css/`)
- Vanilla JavaScript (ES Modules) — no framework, no build step

**Client‑side libraries**
- Leaflet (Scam Hotspot Radar map)
- QRCode.js / html5‑qrcode (Digital Handshake QR generation & scanning)
- Tesseract.js (Price Camera OCR)
- Canvas Confetti (UI feedback)

**Backend & Data**
- Node.js (zero‑dependency built‑in `http` dev server — `server.js`)
- Firebase Hosting + Cloud Firestore + Firestore Security Rules (`firebase.json`, `firestore.rules`)
- Vercel serverless function for AI photo review (`api/analyze-hotel-photo.js`)

**Data**
- `Vadodara_Hotel_Safety_Dataset_106.xlsx` — verified, real hotel records (source of truth for `data/vadodaraHotels.js`)
- `data/seedData.js` — tourism knowledge base (routes, fare benchmarks, hotspots) for Vadodara, Agra, Delhi NCR, and Jaipur

---

## 📁 Project Structure

```text
SafarSaarthi/
│
├── index.html                      # App shell / entry point
├── server.js                       # Zero-dependency local dev server
├── package.json
├── firebase.json                   # Firebase Hosting + Firestore config
├── firestore.rules                 # Firestore security rules
├── .firebaserc                     # Firebase project alias
├── vercel.json                     # Vercel deployment config
├── START_SAFARSAARTHI.bat          # One-click local server launcher (Windows)
│
├── css/
│   ├── main.css                    # Core design system (colors, layout, typography)
│   ├── components.css              # Reusable UI components
│   └── responsive.css              # Breakpoints (320–430px mobile, tablet, desktop)
│
├── js/
│   ├── app.js                      # Main application controller & view router
│   ├── store.js                    # Reactive state store & data repository
│   ├── authManager.js              # Passenger/Driver onboarding & auth
│   ├── firebase-config.js          # Firestore config + local-storage fallback engine
│   ├── handshake.js                # Digital Handshake (QR + GPS verification)
│   ├── pricePulse.js               # Live fare ticker & fair-price brackets
│   ├── priceCamera.js              # OCR-based price check + negotiation coach
│   ├── hotspots.js                 # Scam Hotspot Radar (map + places directory)
│   ├── hotelSafety.js              # "My Stay" hotel & surrounding-area safety
│   ├── transitSafety.js            # Route fare intelligence & digital footprint
│   ├── reviews.js                  # Proof-of-presence reviews / guide ledger
│   ├── evidencePacket.js           # One-tap Tourist Police evidence dossier
│   └── demoSimulator.js            # Fast demo/testing suite for live judging
│
├── data/
│   ├── vadodaraHotels.js           # Generated from the 106-hotel dataset (do not hand-edit)
│   └── seedData.js                 # Multi-city tourism knowledge base & benchmarks
│
├── api/
│   └── analyze-hotel-photo.js      # Vercel serverless: server-side AI photo review
│
├── Vadodara_Hotel_Safety_Dataset_106.xlsx   # Source dataset (106 verified hotels)
├── logo.jpeg / chat_box.jpeg / rickshow.png # Brand & UI assets
└── README.md
```

---

## ▶️ Getting Started

### Requirements
- **Node.js** ≥ 18
- A modern browser (Chrome/Edge/Firefox) with camera + geolocation permissions for full functionality

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/safarsaarthi.git
cd safarsaarthi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the local server

```bash
npm start
```

(Windows users can also double‑click **`START_SAFARSAARTHI.bat`**.)

### 4. Open the app

```text
http://localhost:3000
```

---

## ⚙️ Environment & Configuration

| Variable | Where used | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `server.js` / `api/analyze-hotel-photo.js` | Server‑side key for the AI hotel/area photo review. Never exposed to the browser. |
| `VERIDA_VISION_MODEL` | Same as above | Vision model used for photo review (defaults to `gpt-4.1-mini`). |

Set these as environment variables (or Vercel/Firebase project secrets) before deploying. If unset, the **Add Hotel / Area Photo** flow will honestly report that AI review isn't configured and will **not** mark a photo as approved evidence.

Firebase connection details live in `js/firebase-config.js`, which also implements a hybrid local‑storage cache so the app stays responsive with instant reads/writes and syncs to Firestore in the background.

---

## 📜 Available Scripts

```bash
npm start              # Run the local dev server (server.js) on :3000
npm run dev            # Same as npm start
npm run deploy         # Deploy hosting + Firestore rules to Firebase
npm run deploy:hosting # Deploy only Firebase Hosting
npm run deploy:firestore # Deploy only Firestore security rules
```

---

## ☁️ Deployment

- **Firebase Hosting** — configured via `firebase.json` / `.firebaserc`. Serves the static app with a single‑page rewrite to `index.html` and 1‑day cache headers on static assets. This is the **actual live deployment**: [safarsaarthi-1d969.web.app](https://safarsaarthi-1d969.web.app/).
- **Vercel** — `vercel.json` and the `/api/analyze-hotel-photo` serverless function are present in the repo (written for Vercel's function convention), but the project is **not currently deployed on Vercel**. These files are ready to use if you deploy there in the future, but Firebase Hosting is the live version right now.

---

## 🗃️ Data Sources

- **Vadodara Hotel Safety Dataset (106 hotels)** — the primary, verified source for hotel search, results, details, and map placement in Passenger Mode → My Stay. Coordinate quality is preserved and surfaced honestly: only a small subset of records have exact GPS pins, the rest use approximate locality centroids, and this is labeled in the UI rather than hidden.
- **Multi‑city seed data** (`data/seedData.js`) — tourism locations, transit routes, fare benchmarks, recent passenger‑paid examples, verified guides, and scam hotspots for **Vadodara, Agra, Delhi NCR, and Jaipur**.

No hotel, rating, safety score, distance, or coordinate is fabricated — where verified data isn't available, the UI says so instead of inventing a value.

---

## 🔒 Security Notes

- AI photo review runs **server‑side only**; API keys are never sent to or stored in the browser.
- Digital Handshake combines **QR token + GPS proximity + timestamp** to reduce spoofing/replay risk from a single leaked signal.
- Firestore access is governed by `firestore.rules` rather than open read/write.
- This is a **hackathon prototype**, not a production‑hardened system — see [Roadmap](#-roadmap) for what a production build would add.

---

## 🔮 Roadmap

- Secure backend synchronization & production‑grade authentication
- Live government / RTO driver‑guide verification integration
- Real‑time data pipelines beyond the current seed/dataset model
- Stronger privacy controls and minimal‑data‑collection defaults
- Scalable cloud infrastructure for multi‑city rollout
- AI‑assisted scam detection, fare‑anomaly detection, and incident classification
- Dashboards for tourism authorities, tourist police, and transport operators

---

## ⚠️ Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Data accuracy (fares/hotspots/hotels) | Use verified datasets only; label confidence/coordinate quality instead of guessing |
| Privacy (identity, location, incidents) | Minimize data collection; secure backend authorization |
| Informal driver adoption | Offer a zero‑app / plate‑based driver verification flow |
| Poor tourist connectivity | Design for offline‑tolerant operation |
| QR/identity fraud | Short‑lived, rotating QR tokens combined with GPS + timestamp |
| Government integration | Partner with tourism departments & transport authorities |

---

## 🌱 Impact

- **Social:** Safer tourism experiences, greater traveler confidence, better accountability.
- **Economic:** Reduces overcharging, supports legitimate local drivers/guides/hotels.
- **Tourism:** Improves visitor experience and destination reputation.
- **Safety:** Faster identity verification, proactive scam awareness, structured incident documentation.

---

## 📌 SIH 2026 Submission

| Field | Value |
|---|---|
| **Event** | Smart India Hackathon 2026 |
| **Project** | SafarSaarthi |
| **Category** | Software |
| **Theme** | Travel & Tourism |
| **Team Name** | FLUX1 |
| **Problem Statement ID** | SIH26204 |
| **Problem Statement Title** | Student Innovation - A solution/idea that can boost the current situation of the tourism industries including hotels, travel and others. |

---

## 👥 Team — FLUX1

| Member | Role |
|---|---|
| Devanshi Rana | Leader |
| Dodiya Dhruhi Manindrasinh | Team Member |
| Patel Archi Samirbhai | Team Member |
| Rathod Hetviben Jayeshkumar | Team Member |
| Dhwani Katuwa | Team Member |
| Khatri Geet Maheshbhai | Team Member |

---

## 📚 References

1. Ministry of Tourism, Government of India — [data.tourism.gov.in](https://data.tourism.gov.in/)
2. UN Tourism — [International Code for the Protection of Tourists](https://www.unwto.org/)
3. Government of India — [Digital Personal Data Protection Act, 2023](https://www.indiacode.nic.in/)
4. OWASP — [Mobile Application Security](https://mas.owasp.org/)
5. Google Maps Platform — [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
6. Firebase — [Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## ⭐ SafarSaarthi in One Sentence

> **SafarSaarthi transforms uncertain, street‑level tourism interactions into verified, transparent, and safer experiences — from the ride, to the stay, to the trip home.**
