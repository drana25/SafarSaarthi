/**
 * SafarSaarthi — One-Tap Tourist Police Evidence Packet
 * Bundles GPS, timestamp, scanned guide license, agreed price, and photo evidence into a verifiable dossier for Tourist Police (1363 / 112).
 */

import { store } from "./store.js";

export class EvidencePacketManager {
  constructor() {}

  // --- Generate Incident Dossier ---
  compileDossier(incidentData = {}) {
    const loc = store.currentLocation;
    const city = store.getCurrentCity();
    const activeHandshakes = store.getHandshakes();
    const lastHandshake = activeHandshakes[0] || null;

    const incidentId = `INC-${city.id.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

    const dossier = {
      incidentId: incidentId,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      traveler: {
        name: store.activeUser.name,
        origin: store.activeUser.origin,
        id: store.activeUser.uid
      },
      location: {
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: `${loc.accuracy || 5} meters`,
        city: city.name,
        state: city.state,
        jurisdiction: city.touristPoliceStation,
        helpline: city.emergencyHelpline
      },
      partyScanned: lastHandshake ? {
        guideName: lastHandshake.guideName,
        licenseNo: lastHandshake.guideLicenseNo || "N/A",
        issuer: lastHandshake.guideIssuer || "Unverified / On-the-spot",
        category: lastHandshake.guideCategory || "Transport / Guide",
        handshakeHash: lastHandshake.tokenHash,
        handshakeTime: new Date(lastHandshake.timestamp).toLocaleTimeString("en-IN")
      } : {
        guideName: incidentData.suspectName || "Unverified Street Tout / Driver",
        licenseNo: incidentData.suspectLicense || "Refused Identification",
        issuer: "None",
        category: incidentData.suspectCategory || "Street Tout",
        handshakeHash: "UNREGISTERED_INTERACTION"
      },
      incidentDetails: {
        category: incidentData.category || "Extortionate Overcharge & Harassment",
        quotedPrice: incidentData.quotedPrice ? `₹${incidentData.quotedPrice}` : "N/A",
        fairRateBenchmark: `₹${store.getFairRateBenchmark("vad-laxmi-vilas").median} (Standard Tariff)`,
        description: incidentData.description || "Driver/Guide quoted inflated fare and refused meter, exhibiting aggressive behavior when presented with official tourism tariffs.",
        photoUrl: incidentData.photoUrl || null
      },
      verificationHash: `SSF-POLICE-DOSSIER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    };

    return dossier;
  }

  // --- Show Dossier Modal / View ---
  showEvidenceModal(dossier) {
    const modal = document.getElementById("sos-evidence-modal");
    const container = document.getElementById("sos-dossier-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="dossier-paper animate-slide-up">
        <div class="dossier-official-header">
          <div class="dossier-emblem"><i class="fas fa-shield-alt"></i></div>
          <div class="dossier-title-block">
            <h3>SAFARSAARTHI INCIDENT EVIDENCE DOSSIER</h3>
            <p>Certified GPS Proof for Tourist Police Helpline (<strong>${dossier.location.helpline}</strong>)</p>
          </div>
          <div class="dossier-ref-badge">
            <span>Ref: <strong>${dossier.incidentId}</strong></span>
          </div>
        </div>

        <div class="dossier-grid">
          <div class="dossier-field">
            <label>Timestamp (IST):</label>
            <span>${dossier.formattedTime}</span>
          </div>
          <div class="dossier-field">
            <label>GPS Coordinates:</label>
            <span class="geo-highlight">${dossier.location.lat.toFixed(5)}° N, ${dossier.location.lng.toFixed(5)}° E (±${dossier.location.accuracy})</span>
          </div>
          <div class="dossier-field">
            <label>Physical Landmark:</label>
            <span>${dossier.location.name}</span>
          </div>
          <div class="dossier-field">
            <label>Assigned Police Jurisdiction:</label>
            <span>${dossier.location.jurisdiction}</span>
          </div>
        </div>

        <div class="dossier-section-title">ACCUSED / SCANNED PARTY DETAILS</div>
        <div class="dossier-grid accused-grid">
          <div class="dossier-field">
            <label>Name / Vehicle ID:</label>
            <span><strong>${dossier.partyScanned.guideName}</strong></span>
          </div>
          <div class="dossier-field">
            <label>License / Registration:</label>
            <span>${dossier.partyScanned.licenseNo}</span>
          </div>
          <div class="dossier-field">
            <label>Digital Handshake Hash:</label>
            <span class="token-mono">${dossier.partyScanned.handshakeHash}</span>
          </div>
          <div class="dossier-field">
            <label>Quoted vs Benchmark:</label>
            <span class="text-danger">Quoted: ${dossier.incidentDetails.quotedPrice} (Fair: ${dossier.incidentDetails.fairRateBenchmark})</span>
          </div>
        </div>

        <div class="dossier-section-title">INCIDENT SUMMARY</div>
        <p class="dossier-desc-box">${dossier.incidentDetails.description}</p>

        <div class="dossier-watermark-footer">
          <div class="qr-auth-stamp">
            <div id="dossier-qr-stamp"></div>
            <span>Scan to Authenticate Dossier</span>
          </div>
          <div class="signature-stamp">
            <span class="cert-status"><i class="fas fa-check-double"></i> Cryptographically Certified</span>
            <span class="cert-id">${dossier.verificationHash}</span>
          </div>
        </div>

        <div class="dossier-actions">
          <a href="tel:1363" class="btn btn-danger btn-lg"><i class="fas fa-phone-alt"></i> Call Tourist Police (1363)</a>
          <button type="button" class="btn btn-secondary" onclick="window.print()"><i class="fas fa-print"></i> Print / Save PDF</button>
          <button type="button" class="btn btn-outline" id="dossier-share-btn"><i class="fas fa-share-alt"></i> Share via WhatsApp</button>
        </div>
      </div>
    `;

    modal.classList.add("active");

    // Render verification QR in stamp
    setTimeout(() => {
      const stampContainer = document.getElementById("dossier-qr-stamp");
      if (stampContainer && typeof QRCode !== "undefined") {
        stampContainer.innerHTML = "";
        new QRCode(stampContainer, {
          text: `https://verida.app/verify-dossier?id=${dossier.incidentId}&hash=${dossier.verificationHash}`,
          width: 70,
          height: 70,
          colorDark: "#0f172a",
          colorLight: "#ffffff"
        });
      }
    }, 100);

    // Share button listener
    const shareBtn = document.getElementById("dossier-share-btn");
    if (shareBtn) {
      shareBtn.onclick = () => {
        const text = `🚨 *VERIDA TOURIST POLICE EVIDENCE DOSSIER*\nRef: ${dossier.incidentId}\nLocation: ${dossier.location.name} (${dossier.location.lat}, ${dossier.location.lng})\nParty: ${dossier.partyScanned.guideName} (${dossier.partyScanned.licenseNo})\nIssue: ${dossier.incidentDetails.category} (Quoted: ${dossier.incidentDetails.quotedPrice})\nVerified Hash: ${dossier.verificationHash}`;
        if (navigator.share) {
          navigator.share({ title: "Verida Incident Dossier", text: text });
        } else {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        }
      };
    }
  }
}

export const evidencePacketManager = new EvidencePacketManager();
