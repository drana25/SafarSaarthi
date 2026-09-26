/**
 * Verida — Live Stage Demo Simulator
 * Fast testing suite for hackathon presentations, judge live evaluations, and dual-phone preview.
 */

import { store } from "./store.js";
import { hotspotRadar } from "./hotspots.js";
import { digitalHandshake } from "./handshake.js";
import { pricePulse } from "./pricePulse.js";
import { priceCamera } from "./priceCamera.js";
import { reviewsManager } from "./reviews.js";
import { SAMPLE_TEST_CHITS } from "../data/seedData.js";

export class DemoSimulator {
  constructor() {
    this.isDualScreen = false;
  }

  // --- Teleport to Pre-Configured Location ---
  teleport(locationKey) {
    const locations = {
      "vad-laxmi-vilas": {
        city: "vadodara",
        lat: 22.2937,
        lng: 73.1916,
        name: "Laxmi Vilas Palace, Vadodara"
      },
      "vad-station-hotspot": {
        city: "vadodara",
        lat: 22.3106,
        lng: 73.1813,
        name: "Vadodara Junction (Platform 6 - Alkapuri Tout Hotspot)"
      },
      "vad-champaner": {
        city: "vadodara",
        lat: 22.4833,
        lng: 73.5333,
        name: "Champaner-Pavagadh UNESCO Site"
      },
      "vad-sayaji-baug": {
        city: "vadodara",
        lat: 22.3142,
        lng: 73.1873,
        name: "Sayaji Baug, Vadodara"
      },
      "agr-taj-mahal": {
        city: "agra",
        lat: 27.1751,
        lng: 78.0421,
        name: "Taj Mahal East Gate, Agra"
      },
      "del-red-fort": {
        city: "delhi",
        lat: 28.6562,
        lng: 77.2410,
        name: "Red Fort Lahori Gate (Scam Hotspot), Delhi"
      },
      "jai-hawa-mahal": {
        city: "jaipur",
        lat: 26.9239,
        lng: 75.8267,
        name: "Hawa Mahal, Jaipur"
      }
    };

    const target = locations[locationKey] || locations["vad-laxmi-vilas"];
    store.setCity(target.city);
    store.currentLocation = {
      lat: target.lat,
      lng: target.lng,
      name: target.name,
      accuracy: 4
    };

    // Update UI elements
    const citySelector = document.getElementById("header-city-selector");
    if (citySelector) citySelector.value = target.city;

    const locPill = document.getElementById("current-location-pill");
    if (locPill) locPill.innerHTML = `<i class="fas fa-location-arrow"></i> ${target.name}`;

    hotspotRadar.teleportTo(target.lat, target.lng, target.name);
    pricePulse.renderTicker();
  }

  // --- Toggle Dual-Screen Presenter View ---
  toggleDualScreen() {
    this.isDualScreen = !this.isDualScreen;
    const body = document.body;
    body.classList.toggle("dual-screen-mode", this.isDualScreen);

    const dualBtn = document.getElementById("toggle-dual-screen-btn");
    if (dualBtn) {
      dualBtn.innerHTML = this.isDualScreen
        ? `<i class="fas fa-mobile-alt"></i> Single Mobile View`
        : `<i class="fas fa-columns"></i> Dual Stage View (Traveler + Guide)`;
    }

    if (this.isDualScreen) {
      digitalHandshake.startGuideQrRotation("guide-qr-canvas-dual", "qr-countdown-badge-dual");
    }
  }

  // --- Quick Test Chit Loader for Price Camera ---
  loadSampleChit(sampleId, statusCallback) {
    const chit = SAMPLE_TEST_CHITS.find(c => c.id === sampleId) || SAMPLE_TEST_CHITS[0];
    const result = priceCamera.evaluateExtractedPrice(chit.sampleText);

    const modal = document.getElementById("price-result-modal");
    const container = document.getElementById("price-result-content");
    if (!modal || !container) return;

    const verdictClass = result.verdict === "red" ? "badge-danger" : (result.verdict === "yellow" ? "badge-warning" : "badge-success");
    const verdictBg = result.verdict === "red" ? "#fef2f2" : (result.verdict === "yellow" ? "#fffbeb" : "#ecfdf5");
    const verdictBorder = result.verdict === "red" ? "#ef4444" : (result.verdict === "yellow" ? "#f59e0b" : "#10b981");

    container.innerHTML = `
      <div class="verdict-banner" style="background: ${verdictBg}; border-left: 4px solid ${verdictBorder};">
        <h3 style="color: ${verdictBorder}; margin: 0 0 6px 0;">${result.verdictTitle}</h3>
        <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.5;">${result.verdictAdvice}</p>
      </div>

      <div class="comparison-card">
        <div class="price-comparison-grid">
          <div class="price-col">
            <span class="label">Quoted / Detected:</span>
            <span class="val text-danger">₹${result.extractedAmount}</span>
          </div>
          <div class="price-col divider">
            <span class="label">Verida Fair Median:</span>
            <span class="val text-success">₹${result.benchmark.median}</span>
          </div>
          <div class="price-col">
            <span class="label">Verified Range:</span>
            <span class="val text-muted">₹${result.benchmark.min}–₹${result.benchmark.max}</span>
          </div>
        </div>
      </div>

      <div class="ocr-raw-box">
        <label><i class="fas fa-file-invoice"></i> Recognized Text from Chit / Menu:</label>
        <pre>${chit.sampleText}</pre>
      </div>

      <div class="modal-actions-row">
        <button type="button" class="btn btn-primary btn-block" onclick="document.getElementById('price-result-modal').classList.remove('active');">
          <i class="fas fa-check"></i> Got It — Apply Safe Rate
        </button>
      </div>
    `;

    modal.classList.add("active");
  }
}

export const demoSimulator = new DemoSimulator();
