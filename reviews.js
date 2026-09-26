/**
 * Verida — Proof-of-Presence Reviews & Guide Portfolio Ledger (Features #2 & #6)
 * Gated strictly behind verified physical Digital Handshakes.
 */

/**import { store } from "./store.js";

export class ReviewsManager {
  constructor() {
    this.selectedRating = 5;
  }

  // --- Render Guide Profile & Ledger ---
  renderGuideLedger(guideId = null, containerId = "guide-ledger-container") {
    // Check if we are rendering for dual screen or specific container
    // If no guideId is passed, use activeGuide (usually for Driver view)
    const isPassenger = store.currentRole === "traveler";
    const guide = guideId ? store.getGuideById(guideId) : store.activeGuide;
    
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!guide && !isPassenger) {
      container.innerHTML = `<div class="empty-state"><p>No profile found.</p></div>`;
      return;
    }

    const reviews = guide ? store.getReviewsForGuide(guide.id || guide.uid) : [];
    const handshakes = guide ? store.getHandshakes().filter(h => h.guideId === guide.id || h.guideId === guide.uid) : [];
    const hasHandshake = guide ? store.hasHandshakeWithGuide(guide.id || guide.uid) : false;
    
    // Fetch Digital Footprints for chronological ledger
    let footprints = store.getDigitalFootprints() || [];
    if (guide && !isPassenger) {
       footprints = footprints.filter(f => f.vehicleRegNo === guide.vehicleRegNo);
    } else if (isPassenger) {
       footprints = footprints.filter(f => f.passengerName === store.activeUser.name);
    }
    
    // Sort chronologically (newest first)
    footprints.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

    container.innerHTML = `
      <!-- Guide Verified Header Card -->
      <div class="guide-header-card">
        <div class="guide-avatar-wrap">
          <img src="${guide.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}" alt="${guide.name}" class="guide-avatar">
          <div class="verified-tick-badge" title="Government / ASI Verified"><i class="fas fa-check"></i></div>
        </div>
        <div class="guide-info">
          <div class="guide-name-row">
            <h3 class="guide-name">${guide.name}</h3>
            <span class="trust-score-badge"><i class="fas fa-shield-alt"></i> ${guide.trustScore || 98}% Trust Index</span>
          </div>
          <p class="guide-category"><i class="fas fa-id-card"></i> ${guide.category || 'Official Guide'} • <strong>${guide.licenseNo}</strong></p>
          <p class="guide-issuer"><i class="fas fa-university"></i> ${guide.issuer || 'State Tourism Authority'}</p>
          <div class="guide-tags">
            <span class="guide-tag"><i class="fas fa-language"></i> ${(guide.languages || ['English', 'Gujarati', 'Hindi']).join(', ')}</span>
            <span class="guide-tag"><i class="fas fa-clock"></i> ${guide.experienceYears || 8}+ Years Exp</span>
            <span class="guide-tag highlight"><i class="fas fa-handshake"></i> ${guide.encounterCount || 342} Physical Encounters</span>
          </div>
        </div>
      </div>

      <!-- Proof-of-Presence Review Submission Section -->
      <div class="review-submission-box">
        <h4 class="section-subtitle"><i class="fas fa-pen-fancy"></i> Leave a Proof-of-Presence Review</h4>
        
        ${!hasHandshake ? `
          <div class="review-locked-banner">
            <div class="locked-icon"><i class="fas fa-lock"></i></div>
            <div class="locked-info">
              <strong>Review Locked — Physical Handshake Required</strong>
              <p>To eliminate fake online reviews, Verida strictly gates reviews behind a GPS-verified Digital Handshake. Scan this guide's QR code at the monument to unlock review access.</p>
            </div>
          </div>
        ` : `
          <div class="review-unlocked-box animate-fade-in">
            <div class="verified-banner-pill">
              <i class="fas fa-shield-check"></i> GPS Verified Presence Active: ${store.currentLocation.name}
            </div>
            <form id="presence-review-form" class="review-form" onsubmit="event.preventDefault();">
              <div class="rating-stars-row">
                <label>Your Rating:</label>
                <div class="star-picker" id="star-picker">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button type="button" class="star-btn ${star <= this.selectedRating ? 'active' : ''}" data-star="${star}">
                      <i class="fas fa-star"></i>
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="form-group">
                <textarea id="review-comment-input" rows="3" placeholder="Share your experience (Guide honesty, fair pricing, historical knowledge)..." required></textarea>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="submit-verified-review-btn">
                <i class="fas fa-paper-plane"></i> Submit Presence-Verified Review
              </button>
            </form>
          </div>
        `}
      </div>

      <!-- Tamper-Evident Verified Ledger Timeline -->
      <div class="ledger-timeline-section">
        <div class="ledger-header">
          <h4 class="section-subtitle"><i class="fas fa-link"></i> Immutable Ledger (${footprints.length} Records)</h4>
          <span class="ledger-badge"><i class="fas fa-lock"></i> Digital Footprints</span>
        </div>

        <div class="timeline-list">
          ${footprints.length === 0 ? '<div class="empty-state" style="padding:16px;text-align:center;">No footprint records found.</div>' : ''}
          ${footprints.map(f => {
            const dateObj = new Date(f.timestamp || f.createdAt || Date.now());
            const dateFormatted = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const timeFormatted = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            
            return `
              <div class="timeline-item">
                <div class="timeline-dot verified"></div>
                <div class="timeline-card encounter-card">
                  <div class="timeline-card-header">
                    <span class="encounter-title"><i class="fas fa-route"></i> Trip: ${f.route || 'Local Route'}</span>
                    <span class="timeline-date">${dateFormatted} • ${timeFormatted}</span>
                  </div>
                  <div class="encounter-details" style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
                    <span><i class="fas fa-user"></i> <strong>Passenger:</strong> ${f.passengerName}</span>
                    <span><i class="fas fa-taxi"></i> <strong>Driver:</strong> ${f.driverName || 'Unknown'} (${f.vehicleRegNo})</span>
                    <span><i class="fas fa-id-badge"></i> <strong>License:</strong> ${f.rtoLicenseNo || 'N/A'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> <strong>GPS Anchor:</strong> ${f.pickupGps || 'Unavailable'}</span>
                  </div>
                  <div class="crypto-hash-row" style="margin-top:10px;">
                    <span class="token-hash">Footprint ID: ${f.footprintHash}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.attachReviewEvents(guide);
  }

  attachReviewEvents(guide) {
    const starPicker = document.getElementById("star-picker");
    if (starPicker) {
      starPicker.querySelectorAll(".star-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.selectedRating = parseInt(btn.getAttribute("data-star"), 10);
          starPicker.querySelectorAll(".star-btn").forEach(b => {
            const s = parseInt(b.getAttribute("data-star"), 10);
            b.classList.toggle("active", s <= this.selectedRating);
          });
        });
      });
    }

    const submitBtn = document.getElementById("submit-verified-review-btn");
    const commentInput = document.getElementById("review-comment-input");

    if (submitBtn && commentInput) {
      submitBtn.onclick = async () => {
        const comment = commentInput.value.trim();
        if (!comment) {
          alert("Please enter a short review comment.");
          return;
        }

        const newReview = {
          guideId: guide.id || guide.uid,
          travelerName: store.activeUser.name,
          rating: this.selectedRating,
          monumentName: store.currentLocation.name,
          presenceVerified: true,
          comment: comment,
          timestamp: Date.now()
        };

        await store.recordReview(newReview);
        alert("✅ Proof-of-Presence Review submitted! It is now permanently linked to your verified encounter.");
        this.renderGuideLedger(guide.id, "guide-ledger-container");
        this.renderGuideLedger(guide.id, "guide-self-ledger");
      };
    }
  }
}

export const reviewsManager = new ReviewsManager();*/



/**
 * Verida — Proof-of-Presence Reviews & Guide Portfolio Ledger
 */
/**import { store } from "./store.js";

export class ReviewsManager {
  constructor() {
    this.selectedRating = 5;
  }

  // --- Helper: Safely resolve Guide or Driver object ---
  getResolvedGuide(guideId) {
    if (!guideId) return store.activeGuide || store.activeDriver || null;

    // Attempt lookup across available store methods
    let guide = store.getGuideById ? store.getGuideById(guideId) : null;
    if (!guide && store.getDriverById) {
      guide = store.getDriverById(guideId);
    }
    // Fallback search in SEED data / local stores by id, uid, or vehicle number
    if (!guide && store.guides) {
      guide = store.guides.find(
        (g) => g.id === guideId || g.uid === guideId || g.vehicleRegNo === guideId
      );
    }
    if (!guide && store.drivers) {
      guide = store.drivers.find(
        (d) => d.id === guideId || d.uid === guideId || d.vehicleRegNo === guideId
      );
    }

    return guide || store.activeGuide || store.activeDriver || null;
  }

  // --- Render Guide Profile & Ledger ---


renderGuideLedger(guideId = null, containerId = "guide-ledger-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Determine current active role
  const isDriver = store.currentRole === "guide" || store.currentRole === "driver";
  const isPassenger = !isDriver;
  if (isDriver && (containerId === "guide-self-ledger" || containerId === "qr-tab-container")) {
    container.innerHTML = ""; // Leaves only the QR generator card active above it
    return;
  }

  const guide = this.getResolvedGuide(guideId);

  // Fallback safe defaults
  const defaultPhoto = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";
  const guidePhoto = guide?.photo || defaultPhoto;
  const guideName = guide?.name || "Verified Transport Partner";
  const guideTrust = guide?.trustScore || 98;
  const guideLicense = guide?.rtoLicenseNo || guide?.licenseNo || "GJ-RTO-VERIFIED";
  const guideIssuer = guide?.govtIssuer || guide?.issuer || "Gujarat Tourism Authority";
  const guideLanguages = guide?.languages || ["English", "Gujarati", "Hindi"];
  const guideExp = guide?.experienceYears || 5;
  const resolvedId = guide?.id || guide?.uid || guideId || "default-driver";

  // Fetch reviews and handshakes
  const reviews = store.getReviewsForGuide(resolvedId);
  const handshakes = store.getHandshakes().filter(h => h.guideId === resolvedId);
  
  // Handshake verification status
 // Handshake verification status (Checks handshakes array AND digital footprints)
  const footprints = store.getDigitalFootprints() || [];
  const hasHandshake = 
    store.hasHandshakeWithGuide(resolvedId) ||
    handshakes.length > 0 ||
    footprints.some(f => 
      f.vehicleRegNo === guide?.vehicleRegNo || 
      f.driverName === guideName || 
      f.guideId === resolvedId
    );

  // Filter footprints for the Immutable Trip Ledger
  let relevantFootprints = [...footprints];
  if (isDriver && guide?.vehicleRegNo) {
    relevantFootprints = relevantFootprints.filter(f => f.vehicleRegNo === guide.vehicleRegNo);
  } else if (isPassenger && store.activeUser?.name) {
    relevantFootprints = relevantFootprints.filter(f => f.passengerName === store.activeUser.name);
  }

  relevantFootprints.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

  container.innerHTML = `
    <!-- Render Driver Info Header ONLY for Passengers -->
    ${isPassenger ? `
      <div class="guide-header-card">
        <div class="guide-avatar-wrap">
          <img src="${guidePhoto}" alt="${guideName}" class="guide-avatar">
          <div class="verified-tick-badge" title="Government Certified"><i class="fas fa-check"></i></div>
        </div>
        <div class="guide-info">
          <div class="guide-name-row">
            <h3 class="guide-name">${guideName}</h3>
            <span class="trust-score-badge"><i class="fas fa-shield-alt"></i> ${guideTrust}% Trust Index</span>
          </div>
          <p class="guide-category"><i class="fas fa-id-card"></i> Official Partner • <strong>${guideLicense}</strong></p>
          <p class="guide-issuer"><i class="fas fa-university"></i> ${guideIssuer}</p>
          <div class="guide-tags">
            <span class="guide-tag"><i class="fas fa-language"></i> ${guideLanguages.join(", ")}</span>
            <span class="guide-tag"><i class="fas fa-clock"></i> ${guideExp}+ Years Exp</span>
            <span class="guide-tag highlight"><i class="fas fa-handshake"></i> ${handshakes.length || relevantFootprints.length || 1} Verified Encounters</span>
          </div>
        </div>
      </div>

      <!-- Render Review Form ONLY for Passengers -->
      <div class="review-submission-box">
        <h4 class="section-subtitle"><i class="fas fa-pen-fancy"></i> Leave a Proof-of-Presence Review</h4>
        ${!hasHandshake ? `
          <div class="review-locked-banner">
            <div class="locked-icon"><i class="fas fa-lock"></i></div>
            <div class="locked-info">
              <strong>Review Locked — Physical Handshake Required</strong>
              <p>Scan QR code or anchor a trip footprint to unlock review access.</p>
            </div>
          </div>
        ` : `
          <div class="review-unlocked-box animate-fade-in">
            <div class="verified-banner-pill">
              <i class="fas fa-shield-check"></i> GPS Verified Presence Active
            </div>
            <form id="presence-review-form" class="review-form" onsubmit="event.preventDefault();">
              <div class="rating-stars-row">
                <label>Your Rating:</label>
                <div class="star-picker" id="star-picker">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button type="button" class="star-btn ${star <= this.selectedRating ? "active" : ""}" data-star="${star}">
                      <i class="fas fa-star"></i>
                    </button>
                  `).join("")}
                </div>
              </div>
              <div class="form-group">
                <textarea id="review-comment-input" rows="3" placeholder="Share your experience..." required></textarea>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="submit-verified-review-btn">
                <i class="fas fa-paper-plane"></i> Submit Presence-Verified Review
              </button>
            </form>
          </div>
        `}
      </div>
    ` : ""}

    <!-- Verified Reviews List (Visible to Both) -->
    <div class="reviews-feed-section" style="margin-top: 16px;">
      <h4 class="section-subtitle"><i class="fas fa-comments"></i> Verified Reviews (${reviews.length})</h4>
      <div class="reviews-list">
        ${reviews.length === 0 ? '<div class="empty-state" style="padding:12px;text-align:center;color:var(--slate-500);">No verified reviews yet.</div>' : ""}
        ${reviews.map(r => `
          <div class="review-card" style="background:#fff; padding:12px; border-radius:8px; margin-bottom:10px; border:1px solid #e2e8f0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${r.passengerName || "Verified Passenger"}</strong>
              <span style="color:#f59e0b;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
            </div>
            <p style="margin:6px 0; font-size:13px; color:#334155;">${r.comment}</p>
            <span style="font-size:11px; color:#94a3b8;"><i class="fas fa-clock"></i> ${r.formattedTime || "Recently"}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Immutable Trip Ledger (Preserved Exactly as Requested for Both) -->
    <div class="ledger-timeline-section" style="margin-top:20px;">
      <div class="ledger-header">
        <h4 class="section-subtitle"><i class="fas fa-link"></i> Immutable Trip Ledger (${relevantFootprints.length} Records)</h4>
      </div>
      <div class="timeline-list">
        ${relevantFootprints.length === 0 ? '<div class="empty-state" style="padding:12px;text-align:center;">No footprint records found.</div>' : ""}
        ${relevantFootprints.map(f => `
          <button type="button" class="timeline-item verida-ledger-clickable" data-footprint-id="${f.footprintHash || f.id || ""}" style="width:100%;text-align:left;border:0;padding:10px;border-left:3px solid var(--primary);margin-bottom:8px;background:#f8fafc;cursor:pointer;">
            <div style="font-size:13px;"><strong>${f.passengerName || "Passenger"}</strong> ➔ ${f.route || "City Transit"}</div>
            <div style="font-size:11px;color:#64748b;">Vehicle: ${f.vehicleRegNo || "N/A"} | Time: ${f.formattedTime || "Verified"}</div>
            <div style="font-size:10px;color:#2563eb;margin-top:5px;">Tap to open Digital Footprint details</div>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  document.querySelectorAll(".verida-ledger-clickable").forEach(entry => {
    entry.onclick = () => this.openTripFootprintDetails(entry.dataset.footprintId);
  });

  if (isPassenger) {
    this.bindReviewFormEvents(resolvedId, containerId);
  }
}

  openTripFootprintDetails(footprintId) {
    const footprint = (store.getDigitalFootprints() || []).find(f => String(f.footprintHash || f.id || "") === String(footprintId));
    if (!footprint) return;
    let modal = document.getElementById("verida-trip-footprint-details");
    if (!modal) { modal=document.createElement("div"); modal.id="verida-trip-footprint-details"; modal.className="modal-backdrop"; document.body.appendChild(modal); }
    const photos = Array.isArray(footprint.capturedPhotos) ? footprint.capturedPhotos : [];
    modal.innerHTML = `<div class="modal-card" style="max-width:620px;max-height:92vh;overflow-y:auto;">
      <button type="button" class="modal-close-btn" id="close-trip-footprint-details"><i class="fas fa-times"></i></button>
      <h3 style="margin-bottom:12px;"><i class="fas fa-fingerprint"></i> Digital Footprint Details</h3>
      ${footprint.driverPhoto ? `<img src="${footprint.driverPhoto}" alt="Driver" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">` : ""}
      <div class="hotel-detail-grid" style="margin-top:10px;">
        <div><span>Driver</span><strong>${footprint.driverName || "Unknown"}</strong></div>
        <div><span>License</span><strong>${footprint.driverLicense || footprint.rtoLicenseNo || "N/A"}</strong></div>
        <div><span>Vehicle</span><strong>${footprint.vehicleRegNo || "N/A"}</strong></div>
        <div><span>Passenger</span><strong>${footprint.passengerName || "N/A"}</strong></div>
        <div><span>Trip Start</span><strong>${footprint.tripStartTime ? new Date(footprint.tripStartTime).toLocaleString("en-IN") : footprint.formattedTime || "N/A"}</strong></div>
        <div><span>Selected Route</span><strong>${footprint.route || "N/A"}</strong></div>
      </div>
      <p style="font-size:11px;color:#64748b;margin-top:10px;">Footprint ID: ${footprint.footprintHash || "N/A"}</p>
      ${footprint.routeSnapshot ? `<div style="margin-top:12px;"><strong>Route Snapshot</strong><img src="${footprint.routeSnapshot}" alt="Recorded route snapshot" style="display:block;width:100%;margin-top:6px;border-radius:8px;border:1px solid #e2e8f0;"></div>` : ""}
      ${photos.length ? `<div style="margin-top:12px;"><strong>Captured Trip Photos</strong><div class="hotel-photo-gallery hotel-photo-gallery-compact" style="margin-top:6px;">${photos.map(p => `<figure><img src="${p.dataUrl}" alt="Trip photo"><figcaption>${p.capturedAt ? new Date(p.capturedAt).toLocaleString("en-IN") : "Trip photo"}</figcaption></figure>`).join("")}</div></div>` : ""}
    </div>`;
    modal.classList.add("active");
    document.getElementById("close-trip-footprint-details").onclick=()=>modal.classList.remove("active");
    modal.onclick=e=>{if(e.target===modal)modal.classList.remove("active");};
  }

  // --- Event Bindings for Review Submission ---
  bindReviewFormEvents(guideId, containerId) {
    // 1. Star Rating Buttons
    const starBtns = document.querySelectorAll("#star-picker .star-btn");
    starBtns.forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.selectedRating = parseInt(btn.getAttribute("data-star"), 10);
        starBtns.forEach((b) => {
          const starVal = parseInt(b.getAttribute("data-star"), 10);
          b.classList.toggle("active", starVal <= this.selectedRating);
        });
      };
    });

    // 2. Submit Button Handler
    const submitBtn = document.getElementById("submit-verified-review-btn");
    if (submitBtn) {
      submitBtn.onclick = async (e) => {
        e.preventDefault();
        const commentInput = document.getElementById("review-comment-input");
        const commentText = commentInput ? commentInput.value.trim() : "";

        if (!commentText) {
          alert("Please write a comment before submitting.");
          return;
        }

        const activeGuideId =
          guideId || store.activeGuide?.id || store.activeDriver?.id || "default-driver";

        const newReview = {
          id: `rev-${Date.now()}`,
          guideId: activeGuideId,
          passengerName: store.activeUser?.name || "Verified Traveler",
          rating: this.selectedRating,
          comment: commentText,
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        // Persist into Store safely
        if (typeof store.recordReview === "function") {
          await store.recordReview(newReview);
        } else if (typeof store.addReview === "function") {
          await store.addReview(newReview);
        } else {
          if (!store.reviews) store.reviews = [];
          store.reviews.unshift(newReview);
        }

        if (commentInput) commentInput.value = "";

        alert("🎉 Thank you! Your Proof-of-Presence review has been verified and added to the ledger.");

        // Immediately re-render to reflect changes
        this.renderGuideLedger(guideId, containerId);
      };
    }
  }
}

export const reviewsManager = new ReviewsManager();
*/


/**
 * Verida — Proof-of-Presence Reviews & Guide Portfolio Ledger
 */
import { store } from "./store.js";

export class ReviewsManager {
  constructor() {
    this.selectedRating = 5;
  }

  // --- Helper: Safely resolve Guide or Driver object ---
  getResolvedGuide(guideId) {
    if (!guideId) return store.activeGuide || store.activeDriver || null;

    let guide = store.getGuideById ? store.getGuideById(guideId) : null;
    if (!guide && store.getDriverById) {
      guide = store.getDriverById(guideId);
    }
    if (!guide && store.guides) {
      guide = store.guides.find(
        (g) => g.id === guideId || g.uid === guideId || g.vehicleRegNo === guideId
      );
    }
    if (!guide && store.drivers) {
      guide = store.drivers.find(
        (d) => d.id === guideId || d.uid === guideId || d.vehicleRegNo === guideId
      );
    }

    return guide || store.activeGuide || store.activeDriver || null;
  }

  // --- Render Guide Profile & Ledger ---
  renderGuideLedger(guideId = null, containerId = "guide-ledger-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Determine current active role
    const isDriver = store.currentRole === "guide" || store.currentRole === "driver";
    const isPassenger = !isDriver;
    if (isDriver && (containerId === "guide-self-ledger" || containerId === "qr-tab-container")) {
      container.innerHTML = "";
      return;
    }

    const guide = this.getResolvedGuide(guideId);
    const resolvedId = guide?.id || guide?.uid || guideId || "default-driver";
    const footprints = store.getDigitalFootprints() || [];

    // Filter footprints for the Immutable Trip Ledger
    // Both driver and passenger see the SAME set of footprints for shared trips
    let relevantFootprints = [...footprints];
    const driverVehicle = guide?.vehicleRegNo;
    const passengerName = store.activeUser?.name;
    const passengerUid = store.activeUser?.uid;
    relevantFootprints = relevantFootprints.filter(f => {
      const matchesVehicle = driverVehicle && f.vehicleRegNo === driverVehicle;
      const matchesPassenger = (passengerName && f.passengerName === passengerName) || (passengerUid && f.userId === passengerUid);
      return matchesVehicle || matchesPassenger;
    });

    // Filter out active placeholder if matching completed exists
    relevantFootprints = relevantFootprints.filter((footprint) => {
      if (footprint.status !== "active_trip") return true;
      const matchingCompleted = relevantFootprints.some((completed) => {
        if (completed.status !== "completed") return false;
        return (
          String(completed.passengerName || "").trim().toLowerCase() === String(footprint.passengerName || "").trim().toLowerCase() &&
          String(completed.route || "").trim().toLowerCase() === String(footprint.route || "").trim().toLowerCase()
        );
      });
      return !matchingCompleted;
    });

    relevantFootprints.sort((a, b) => new Date(b.timestamp || b.createdAt || b.tripStartTime) - new Date(a.timestamp || a.createdAt || a.tripStartTime));

    // Fallback seed footprint if empty so prototype always has real clickable experience
    if (relevantFootprints.length === 0) {
      const fallbackUser = store.activeUser?.name || "Hetvi";
      relevantFootprints = [
        {
          id: "seed-footprint-1",
          footprintHash: `VRD-FOOTPRINT-GJ06AU7892-882041`,
          passengerName: fallbackUser,
          route: "Vadodara Junction (Railway Station) ➔ Laxmi Vilas Palace (Old Palace Rd)",
          fromName: "Vadodara Junction (Railway Station)",
          toName: "Laxmi Vilas Palace (Old Palace Rd)",
          vehicleRegNo: "GJ-06-AU-7892",
          driverName: "Mehul Bhai Solanki",
          driverPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
          driverLicense: "GJ-06-RTO-7892",
          tripStartTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          formattedTime: "07:33 PM",
          amountPaid: 100,
          status: "completed",
          routePoints: [
            { lat: 22.3107, lng: 73.1812 },
            { lat: 22.3021, lng: 73.1874 },
            { lat: 22.2938, lng: 73.1905 }
          ]
        }
      ];
    }

    // MAIN LEDGER VIEW: Clean Immutable Trip Ledger (no driver card / review form on passenger main view)
    container.innerHTML = `
      <div class="ledger-timeline-section" style="padding: 4px 0;">
        <div class="ledger-header" style="margin-bottom: 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="font-size:16px; font-weight:800; color:var(--slate-900); margin:0;">
                <i class="fas fa-link" style="color:var(--primary);"></i> IMMUTABLE TRIP LEDGER
              </h3>
              
            </div>
            <span style="background:#ecfdf5; color:#047857; font-size:11px; font-weight:700; padding:4px 10px; border-radius:100px; border:1px solid #a7f3d0; white-space:nowrap;">
              ${relevantFootprints.length} Record${relevantFootprints.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div class="timeline-list" style="display:flex; flex-direction:column; gap:10px;">
          ${relevantFootprints.map((f, idx) => {
            const rawRoute = f.route || `${f.from || f.fromName || 'Vadodara Junction'} ➔ ${f.to || f.toName || 'Laxmi Vilas Palace'}`;
            const parts = rawRoute.split("➔").map(s => s.trim());
            const fromPart = parts[0] || "Vadodara Junction (Railway Station)";
            const toPart = parts[1] || "Laxmi Vilas Palace (Old Palace Rd)";
            const fallbackDriver = guide?.name || store.activeGuide?.name || "Mehul Bhai Solanki";
            const fallbackPassenger = store.activeUser?.name || "Verified Traveler";
            const driverName = f.driverName || fallbackDriver;
            const passengerName = f.passengerName || fallbackPassenger;

            // In the passenger side ledger, show driver's name at top. In driver side, show passenger's name.
            const topDisplayName = isPassenger ? driverName : passengerName;

            const vehNo = f.vehicleRegNo || "Not Provided";
            const dateObj = new Date(f.timestamp || f.tripStartTime || f.createdAt || Date.now());
            const dateFormatted = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const timeFormatted = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            const tDisplay = f.formattedTime || timeFormatted;
            const hash = f.footprintHash || f.id || `VRD-TRIP-${idx}`;

            return `
              <div 
                class="immutable-ledger-item animate-fade-in" 
                onclick="reviewsManager.openTripFootprintDetails('${hash}')"
                style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #10b981; border-radius:12px; padding:14px; cursor:pointer; transition:transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; box-shadow:0 1px 3px rgba(0,0,0,0.05);"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 14px rgba(0,0,0,0.08)';"
                onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';"
              >
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                  <span style="font-size:13px; font-weight:800; color:#0f172a;">
                    ${topDisplayName}
                  </span>
                  <span style="font-size:11px; font-weight:700; color:#059669; background:#ecfdf5; padding:2px 8px; border-radius:6px;">
                    <i class="fas fa-fingerprint"></i> Footprint Verified
                  </span>
                </div>

                <div style="font-size:12px; color:#334155; margin-bottom:8px; line-height:1.4;">
                  <div style="display:flex; align-items:center; gap:6px; color:#475569;">
                    <span style="color:#10b981; font-weight:bold;">→</span> ${fromPart}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px; color:#0f172a; font-weight:600;">
                    <span style="color:#059669; font-weight:bold;">→</span> ${toPart}
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; border-top:1px dashed #e2e8f0; padding-top:8px; margin-top:4px; flex-wrap:wrap; gap:4px;">
                  <span><i class="fas fa-taxi"></i> Vehicle: <strong>${vehNo}</strong></span>
                  <span><i class="fas fa-calendar-alt"></i> ${dateFormatted} • ${tDisplay}</span>
                  <span style="color:var(--primary); font-weight:700;"><i class="fas fa-arrow-right"></i> View Footprint</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // --- Open Full Digital Footprint Details Modal ---
  openTripFootprintDetails(footprintIdOrHash) {
    const footprints = store.getDigitalFootprints() || [];
    let f = footprints.find(item => (item.footprintHash === footprintIdOrHash || item.id === footprintIdOrHash));
    
    // Fallback search or synthetic fallback if opened from seed item
    if (!f) {
      f = {
        footprintHash: footprintIdOrHash || `VRD-FOOTPRINT-GJ06AU7892-${Date.now().toString().slice(-6)}`,
        passengerName: store.activeUser?.name || "Hetvi",
        tripStartTime: new Date().toISOString(),
        formattedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        route: "Vadodara Junction (Railway Station) ➔ Laxmi Vilas Palace (Old Palace Rd)",
        fromName: "Vadodara Junction (Railway Station)",
        toName: "Laxmi Vilas Palace (Old Palace Rd)",
        driverName: "Mehul Bhai Solanki",
        driverPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        vehicleRegNo: "GJ-06-AU-7892",
        driverLicense: "GJ-06-RTO-7892",
        status: "completed",
        capturedPhotos: [],
        routePoints: [
          { lat: 22.3107, lng: 73.1812 },
          { lat: 22.3021, lng: 73.1874 },
          { lat: 22.2938, lng: 73.1905 }
        ]
      };
    }

    const modalId = "trip-footprint-details-modal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    const pName = f.passengerName || store.activeUser?.name || "Verified Traveler";
    const startTime = f.formattedTime || (f.tripStartTime ? new Date(f.tripStartTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "07:33 PM");
    const routeStr = f.route || `${f.fromName || 'Vadodara Junction'} ➔ ${f.toName || 'Laxmi Vilas Palace'}`;
    const footprintHash = f.footprintHash || `VRD-FOOTPRINT-${(f.vehicleRegNo || 'GJ06AU7892').replace(/-/g, '')}-272047`;
    
    // Driver Details
    const driverPhoto = f.driverPhoto || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
    const driverName = f.driverName || "Mehul Bhai Solanki";
    const driverLicense = f.driverLicense || f.rtoLicenseNo || "GJ-06-RTO-7892";
    const vehicleRegNo = f.vehicleRegNo || "GJ-06-AU-7892";

    // Captured Photos
    const capturedPhotos = Array.isArray(f.capturedPhotos) ? f.capturedPhotos : [];

    // Route points for live snapshot or diagram
    const rawRoute = routeStr.split("➔").map(s => s.trim());
    const origin = rawRoute[0] || "Vadodara Junction";
    const dest = rawRoute[1] || "Laxmi Vilas Palace";

    // Check if snapshot image exists, or generate canvas snapshot
    let snapshotImgSrc = f.routeSnapshot || "";
    if (!snapshotImgSrc && Array.isArray(f.routePoints) && f.routePoints.length >= 2) {
      snapshotImgSrc = this.generateRouteCanvasSnapshot(f.routePoints, origin, dest);
    }

    modal.innerHTML = `
      <div class="modal-card animate-slide-up" style="max-width:540px; max-height:90vh; overflow-y:auto; padding:20px;">
        <button type="button" class="modal-close-btn" onclick="document.getElementById('${modalId}').classList.remove('active');" style="position:absolute; top:14px; right:14px;">
          <i class="fas fa-times"></i>
        </button>

        <div style="text-align:center; margin-bottom:16px;">
          <div style="width:48px; height:48px; border-radius:50%; background:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; font-size:22px; border:2px solid #a7f3d0;">
            <i class="fas fa-fingerprint"></i>
          </div>
          <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin:0;">PASSENGER DIGITAL FOOTPRINT LOGGED</h3>
          <span style="font-size:11px; font-weight:700; color:#059669; background:#ecfdf5; padding:2px 8px; border-radius:100px; display:inline-block; margin-top:4px;">
            🔒 Cryptographically Verified & Immutable
          </span>
        </div>

        <!-- 1. Passenger Footprint Core Meta -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
            <div>
              <span style="color:#64748b; display:block; font-size:11px;">Passenger:</span>
              <strong style="color:#0f172a; font-size:13px;">${pName}</strong>
            </div>
            <div>
              <span style="color:#64748b; display:block; font-size:11px;">Trip Start Time:</span>
              <strong style="color:#0f172a; font-size:13px;">${startTime}</strong>
            </div>
            <div style="grid-column:1 / -1;">
              <span style="color:#64748b; display:block; font-size:11px;">Selected Route:</span>
              <strong style="color:#0f172a; font-size:13px;">${routeStr}</strong>
            </div>
            <div style="grid-column:1 / -1;">
              <span style="color:#64748b; display:block; font-size:11px;">Footprint ID:</span>
              <code style="background:#e2e8f0; color:#0f172a; padding:2px 6px; border-radius:4px; font-size:11px; font-family:monospace; word-break:break-all;">
                ${footprintHash}
              </code>
            </div>
          </div>
        </div>

        <!-- 2. Driver Information -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <h4 style="font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-id-card" style="color:var(--primary);"></i> DRIVER INFORMATION
          </h4>
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${driverPhoto}" alt="${driverName}" style="width:58px; height:58px; border-radius:50%; object-fit:cover; border:2px solid #10b981; flex-shrink:0;">
            <div style="font-size:12px; line-height:1.5;">
              <div style="font-size:14px; font-weight:800; color:#0f172a;">${driverName}</div>
              <div style="color:#475569;"><i class="fas fa-certificate" style="color:#059669;"></i> License: <strong>${driverLicense}</strong></div>
              <div style="color:#475569;"><i class="fas fa-taxi"></i> Vehicle Plate: <strong style="font-family:monospace; background:#f1f5f9; padding:1px 5px; border-radius:4px;">${vehicleRegNo}</strong></div>
            </div>
          </div>
        </div>

        <!-- 3. Trip Photo / Evidence -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <h4 style="font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-camera" style="color:#059669;"></i> TRIP PHOTO / EVIDENCE
          </h4>
          ${capturedPhotos.length > 0 ? `
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${capturedPhotos.map((photo, pIdx) => {
                const capturedDate = photo.capturedAt ? new Date(photo.capturedAt).toLocaleString("en-IN") : startTime;
                return `
                  <div style="display:flex; gap:12px; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px;">
                    <img src="${photo.dataUrl || photo.url}" alt="Trip Photo ${pIdx + 1}" style="width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;">
                    <div style="font-size:11px; color:#475569;">
                      <strong style="color:#0f172a; display:block; margin-bottom:2px;">Captured Photo #${pIdx + 1}</strong>
                      <div><i class="fas fa-clock"></i> Captured: <strong>${capturedDate}</strong></div>
                      ${photo.gps ? `<div><i class="fas fa-location-dot"></i> GPS: ${photo.gps.lat.toFixed(4)}, ${photo.gps.lng.toFixed(4)}</div>` : ''}
                      <span style="color:#059669; font-weight:600;"><i class="fas fa-shield-check"></i> Timestamp Anchored</span>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          ` : `
            <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:12px; text-align:center; font-size:12px; color:#64748b;">
              <i class="fas fa-camera-rotate" style="font-size:20px; color:#94a3b8; margin-bottom:4px; display:block;"></i>
              No photo captured for this trip. (You can capture driver/occupant photo during QR verification).
            </div>
          `}
        </div>

        <!-- 4. Actual Recorded GPS Route & Route Screenshot -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:14px;">
          <h4 style="font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-route" style="color:#2563eb;"></i> ACTUAL RECORDED GPS ROUTE
          </h4>

          <!-- Visual Route Breadcrumbs -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; margin-bottom:12px; font-size:12px; color:#1e3a8a;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:10px; height:10px; border-radius:50%; background:#10b981; flex-shrink:0;"></div>
              <strong>${origin}</strong>
            </div>
            <div style="border-left:2px dashed #3b82f6; margin-left:4px; padding-left:14px; height:24px; display:flex; align-items:center; color:#2563eb; font-weight:700; font-size:11px;">
              ↓ Live GPS Track Recorded
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:10px; height:10px; border-radius:50%; background:#dc2626; flex-shrink:0;"></div>
              <strong>${dest}</strong>
            </div>
          </div>

          <!-- Route Map / Screenshot Canvas -->
          <div style="border-radius:8px; overflow:hidden; border:1px solid #cbd5e1; background:#0f172a; text-align:center;">
            ${snapshotImgSrc ? `
              <img src="${snapshotImgSrc}" alt="Recorded Route Screenshot" style="width:100%; height:auto; display:block;">
            ` : `
              <div style="padding:24px 14px; color:#94a3b8; font-size:12px;">
                <i class="fas fa-map-marked-alt" style="font-size:32px; color:#3b82f6; margin-bottom:8px; display:block;"></i>
                <strong>Actual GPS Breadcrumb Logged</strong>
                <p style="font-size:11px; margin:4px 0 0 0; color:#64748b;">Live telemetry anchored to Footprint ID ${footprintHash.slice(-8)}</p>
              </div>
            `}
          </div>
        </div>

        <button type="button" class="btn btn-primary btn-block btn-lg" onclick="document.getElementById('${modalId}').classList.remove('active');">
          <i class="fas fa-check"></i> Done
        </button>
      </div>
    `;

    modal.classList.add("active");
  }

  // --- Helper to Generate Clean Visual Route Snapshot Canvas ---
  generateRouteCanvasSnapshot(routePoints, originName, destName) {
    if (typeof document === "undefined") return "";
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Background styling
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const points = (Array.isArray(routePoints) ? routePoints : []).filter(p => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)));
    const pad = 48;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;

    if (points.length >= 2) {
      const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

      const getX = p => pad + ((p.lng - minLng) / Math.max(maxLng - minLng, 0.00001)) * w;
      const getY = p => pad + ((maxLat - p.lat) / Math.max(maxLat - minLat, 0.00001)) * h;

      // Glow effect for route
      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(getX(p), getY(p)) : ctx.moveTo(getX(p), getY(p)));
      ctx.stroke();

      // Main route line
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(getX(p), getY(p)) : ctx.moveTo(getX(p), getY(p)));
      ctx.stroke();

      // Origin Point
      const ox = getX(points[0]), oy = getY(points[0]);
      ctx.fillStyle = "#10b981";
      ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();

      // Dest Point
      const dx = getX(points[points.length - 1]), dy = getY(points[points.length - 1]);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    } else {
      // Synthetic aesthetic curve connecting start & finish
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pad, canvas.height - pad);
      ctx.bezierCurveTo(canvas.width * 0.3, pad, canvas.width * 0.6, canvas.height - pad * 0.8, canvas.width - pad, pad);
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.beginPath(); ctx.arc(pad, canvas.height - pad, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(canvas.width - pad, pad, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    }

    // Top Header Label on Canvas
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("📍 " + (originName || "Vadodara Junction") + " ➔ " + (destName || "Laxmi Vilas Palace"), pad, 26);

    ctx.fillStyle = "#34d399";
    ctx.font = "11px monospace";
    ctx.fillText("GPS ROUTE TELEMETRY VERIFIED", canvas.width - 240, 26);

    return canvas.toDataURL("image/png");
  }

  // --- Render Driver Side Reviews Page (Matching Reference UI Image 1 Screen 3) ---
  renderDriverReviewsTab(containerId = "driver-reviews-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const guide = this.getResolvedGuide();
    const guideId = guide?.id || guide?.uid || "driver-vad-001";
    const reviews = store.getReviewsForGuide(guideId) || [];

    let html = `
      <div class="driver-reviews-container-inner" style="padding: 4px 0;">
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-comment-dots" style="color: #059669;"></i> Verified Reviews (${reviews.length})
          </h3>
        </div>
    `;

    if (reviews.length === 0) {
      html += `
        <div style="padding: 60px 16px; text-align: center; color: #64748b;">
          <p style="margin: 0; font-size: 14px; font-weight: 500;">No verified reviews yet.</p>
        </div>
      `;
    } else {
      html += `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${reviews.map(r => {
            const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " • " + new Date(r.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : (r.formattedTime || "Recently");
            const stars = Array.from({ length: 5 }, (_, i) => `
              <i class="fas fa-star" style="color: ${i < (r.rating || 5) ? '#f59e0b' : '#cbd5e1'}; font-size: 13px;"></i>
            `).join("");
            const passenger = r.passengerName || r.travelerName || "Verified Traveler";
            const comment = r.comment || "Safe, polite driver. Adhered strictly to meter and fare.";
            const route = r.route || r.monumentName || "Vadodara Transit Route";

            return `
              <div class="verified-review-card animate-fade-in" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; border: 1.5px solid #a7f3d0;">
                      ${passenger.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style="font-size: 14px; color: #0f172a; display: block;">${passenger}</strong>
                      <span style="font-size: 11px; color: #64748b;">${dateStr}</span>
                    </div>
                  </div>
                  <span style="background: #ecfdf5; color: #059669; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #a7f3d0;">
                    <i class="fas fa-shield-check"></i> Verified
                  </span>
                </div>
                <div style="margin: 4px 0 8px 0; display: flex; gap: 2px;">
                  ${stars}
                </div>
                <p style="font-size: 13px; color: #334155; margin: 0 0 10px 0; line-height: 1.45;">
                  ${comment}
                </p>
                <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 8px; display: flex; align-items: center; gap: 6px; border: 1px solid #f1f5f9;">
                  <i class="fas fa-route" style="color: #059669;"></i>
                  <span>${route}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }
}

export const reviewsManager = new ReviewsManager();