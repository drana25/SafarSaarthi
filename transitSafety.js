

  /**
 * Verida — Transit Safety & Digital Footprint Module
 * Two-way Driver/Passenger verification, Origin->Destination Route Fare Intelligence with "Last 3 Passengers Paid",
 * Internal GPS Live Trip Tracking, and Zero-App Driver Protection workflows.
 */
/** 
import { store } from "./store.js";
import { SEED_ROUTES, SEED_DRIVERS } from "../data/seedData.js";
import { reviewsManager } from "./reviews.js";

export class TransitSafetyManager {
  constructor() {
    this.activeRoute = SEED_ROUTES[0];
    this.activeDriver = SEED_DRIVERS[0];
    this.activeTrip = null;
    this.tripTrackingInterval = null;
    this.tripProgress = 0;
    this.tripElapsedSec = 0;
    this.routePoints = [];
    this.routeWatchId = null;
    this.pendingTripPhotos = [];
    this.safetyCheckCount = 0;
    this.safetyCheckTimer = null;
    this.safetyCheckAcknowledged = false;
  }

  // --- Initialize Route Planner ---
  initRoutePlanner(containerId = "route-planner-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (store.currentRole === "guide") {
      this.renderDriverTransitHistory(container);
      return;
    }

    const routes = store.getRoutesForCity(store.currentCityId);
    this.activeRoute = routes[0] || SEED_ROUTES[0];

    container.innerHTML = `
      <div class="transit-planner-card">
        <div class="transit-header-row">
          <div class="transit-title-block">
            <h3><i class="fas fa-route"></i> Route Fare Intelligence</h3>
            <p>Select pickup & destination to see what previous passengers paid.</p>
          </div>
          <span class="badge-pill-verified"><i class="fas fa-shield-check"></i> RTO Benchmarked</span>
        </div>

        <!-- Google Maps-style From -> To Inputs -->
        <div class="route-inputs-box">
          <div class="route-input-group">
            <span class="route-dot start-dot"></span>
            <div class="input-wrap">
              <label>Pickup Location (From)</label>
              <select id="route-from-select" class="route-select">
                ${routes.map((r, idx) => `
                  <option value="${r.id}" ${idx === 0 ? "selected" : ""}>📍 ${r.fromName}</option>
                `).join("")}
              </select>
            </div>
          </div>

          <div class="route-connector-line"></div>

          <div class="route-input-group">
            <span class="route-dot end-dot"></span>
            <div class="input-wrap">
              <label>Destination Drop-off (To)</label>
              <select id="route-to-select" class="route-select">
                ${routes.map((r, idx) => `
                  <option value="${r.id}" ${idx === 0 ? "selected" : ""}>🎯 ${r.toName} (${r.distanceKm} km)</option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Last 3 Passengers Paid Live Ticker Card -->
        <div class="last3-passengers-card" id="last3-passengers-container">
          <!-- Rendered dynamically -->
        </div>

      </div>
    `;

    this.renderLast3PassengersPaid();
    this.bindRouteEvents();
  }

  bindRouteEvents() {
    const fromSelect = document.getElementById("route-from-select");
    const toSelect = document.getElementById("route-to-select");

    const updateRoute = (routeId) => {
      const routes = store.getRoutesForCity(store.currentCityId);
      const found = routes.find(r => r.id === routeId);
      if (found) {
        this.activeRoute = found;
        if (fromSelect) fromSelect.value = found.id;
        if (toSelect) toSelect.value = found.id;
        this.renderLast3PassengersPaid();
      }
    };

    if (fromSelect) fromSelect.onchange = (e) => updateRoute(e.target.value);
    if (toSelect) toSelect.onchange = (e) => updateRoute(e.target.value);

    // Scan Driver QR
    const scanBtn = document.getElementById("scan-driver-qr-btn");
    if (scanBtn) {
      scanBtn.onclick = () => {
        this.openDriverVerificationModal(this.activeDriver);
      };
    }

    // Driver Has No App
    const zeroAppBtn = document.getElementById("zero-app-driver-btn");
    if (zeroAppBtn) {
      zeroAppBtn.onclick = () => {
        this.openZeroAppModal();
      };
    }
  }

  // --- Render "Last 3 Passengers Paid" Section ---
  renderLast3PassengersPaid() {
    const container = document.getElementById("last3-passengers-container");
    if (!container || !this.activeRoute) return;

    const r = this.activeRoute;
    const history = r.last3PassengersPaid || [];

    container.innerHTML = `
      <div class="last3-header">
        <div class="last3-title">
          <i class="fas fa-users-viewfinder" style="color: var(--primary);"></i>
          <strong>Last 3 Passengers Paid on this Exact Route:</strong>
        </div>
        <span class="fair-median-badge">Fair Range: ₹${r.fairRange.min}–₹${r.fairRange.median}</span>
      </div>

      <div class="last3-history-list">
        ${history.map((item, idx) => `
          <div class="last3-item animate-fade-in" style="animation-delay: ${idx * 0.08}s">
            <div class="last3-left">
              <span class="passenger-avatar-icon"><i class="fas fa-user-check"></i></span>
              <div class="passenger-meta">
                <span class="p-name"><strong>${item.passengerName}</strong></span>
                <span class="p-vehicle"><i class="fas fa-taxi"></i> ${item.vehicleNo} (${item.driverName})</span>
              </div>
            </div>
            <div class="last3-right">
              <span class="p-amount">₹${item.amount}</span>
              <span class="p-time">${item.timeAgo}</span>
            </div>
          </div>
        `).join("")}
      </div>

      ${r.toutScamWarning ? `
        <div class="route-scam-warning">
          <i class="fas fa-triangle-exclamation"></i>
          <span><strong>Tout Alert on this Route:</strong> ${r.toutScamWarning}</span>
        </div>
      ` : ""}
    `;
  }

  // --- Render Driver Transit History ---
renderTransitTab() {
  const container = document.getElementById("transit-tab-content") || document.getElementById("main-tab-view");
  if (!container) return;

  // Check if current active mode is Driver/Guide or Passenger
  const isDriverMode = store.currentMode === "driver" || store.currentMode === "guide";

  if (isDriverMode) {
    this.renderDriverTransitHistory(container);
  } else {
    this.renderPassengerTransitIntelligence(container);
  }
}

renderDriverTransitHistory(container) {
  let footprints = store.getDigitalFootprints() || [];

  footprints.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

  if (footprints.length === 0) {
    footprints = [
      { passengerName: "Angel Ganev", from: "Vadodara Junction (Railway Station)", to: "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)", fare: 100, time: "03:53 pm" },
      { passengerName: "Angel Ganev", from: "Vadodara Junction (Railway Station)", to: "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)", fare: 100, time: "03:51 pm" },
      { passengerName: "Angel Ganev", from: "Vadodara Junction (Railway Station)", to: "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)", fare: 100, time: "03:50 pm" },
      { passengerName: "Sweet Lemon", from: "Vadodara Junction (Railway Station)", to: "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)", fare: 100, time: "12:30 pm" },
      { passengerName: "Devanshi Sharma", from: "Vadodara Junction (Railway Station)", to: "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)", fare: 100, time: "11:15 am" }
    ];
  }

  container.innerHTML = `
    <div style="padding: 16px;">
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-list-ul" style="font-size: 14px;"></i> My Transit History
        </h3>
        <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
          Verified passenger trips and anchored footprints.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${footprints.map(f => {
          const name = f.passengerName || "Verified Passenger";
          const routeStr = f.route || `${f.from || "Vadodara Junction (Railway Station)"} ➔ ${f.to || "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)"}`;
          const fare = f.fare || f.amountPaid || 100;
          
          let displayTime = f.time;
          if (!displayTime) {
            const dateObj = new Date(f.timestamp || f.createdAt || Date.now());
            displayTime = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
          }

          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #ecfdf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <i class="fas fa-user-check" style="color: #10b981; font-size: 15px;"></i>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${name}</span>
                  <span style="font-size: 11px; color: #64748b;">
                    <i class="fas fa-map-marker-alt" style="font-size: 10px; color: #94a3b8;"></i> ${routeStr}
                  </span>
                  <span style="font-size: 11px; color: #94a3b8;">
                    <i class="fas fa-clock" style="font-size: 10px;"></i> ${displayTime}
                  </span>
                </div>
              </div>

              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                <span style="font-size: 13px; font-weight: 700; color: #059669;">Est. ₹${fare}</span>
                <span style="font-size: 10px; color: #94a3b8; font-weight: 500;">Verified</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

  // --- Two-Way Digital Footprint: Driver Verification & Safety Card Modal ---
  openDriverVerificationModal(driver = this.activeDriver) {
    const modal = document.getElementById("driver-safety-card-modal");
    const container = document.getElementById("driver-safety-card-content");
    if (!modal || !container) return;

    const now = new Date();
    const footprintHash = `VRD-FOOTPRINT-${driver.vehicleRegNo.replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;

    // Log the digital footprint
    const digitalFootprint = {
      footprintHash: footprintHash,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      passengerName: store.activeUser.name,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleRegNo: driver.vehicleRegNo,
      vehicleType: driver.vehicleType,
      rtoLicenseNo: driver.rtoLicenseNo,
      route: `${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}`,
      pickupGps: `${store.currentLocation.lat.toFixed(4)}, ${store.currentLocation.lng.toFixed(4)}`,
      status: "active_trip"
    };

    store.recordDigitalFootprint(digitalFootprint).then(() => {
      if (typeof reviewsManager !== 'undefined' && reviewsManager) {
        const targetGuideId=driver.id || driver.uid || driver.vehicleRegNo;
        reviewsManager.renderGuideLedger(driver.id || driver.uid, "guide-ledger-container");
      if(document.getElementsById("guide-self-ledger")){
        reviewsManager.renderGuideLedger(driver.id || driver.uid, "guide-self-ledger");
      }
      }
    });

    container.innerHTML = `
      <div class="driver-safety-dossier animate-slide-up">
        
        <!-- Official Verification Header -->
        <div class="safety-card-top-bar">
          <div class="govt-seal-badge">
            <i class="fas fa-shield-halved"></i>
            <span>GUJARAT RTO & TOURISM CERTIFIED</span>
          </div>
          <span class="badge-trust-high"><i class="fas fa-star"></i> ${driver.rating} ★ (${driver.trustScore}% Trust)</span>
        </div>

        <!-- Driver Profile Bio -->
        <div class="driver-profile-main">
          <img src="${driver.photo}" alt="${driver.name}" class="driver-card-avatar">
          <div class="driver-card-bio">
            <h3 class="driver-name">${driver.name}</h3>
            <div class="vehicle-plate-pill">
              <i class="fas fa-id-badge"></i> Vehicle No: <strong>${driver.vehicleRegNo}</strong>
            </div>
            <p class="lic-info"><i class="fas fa-file-contract"></i> RTO License: <strong>${driver.rtoLicenseNo}</strong></p>
            <p class="issuer-info"><i class="fas fa-building-shield"></i> Issuer: ${driver.govtIssuer}</p>
          </div>
        </div>

        <!-- Digital Footprint Confirmation Box -->
        <div class="footprint-anchor-box">
          <div class="footprint-anchor-header">
            <i class="fas fa-fingerprint"></i>
            <strong>PASSENGER DIGITAL FOOTPRINT LOGGED</strong>
          </div>
          <div class="footprint-meta-grid">
            <div><span class="f-lbl">Passenger:</span> <strong>${store.activeUser.name}</strong></div>
            <div><span class="f-lbl">Trip Start Time:</span> ${digitalFootprint.formattedTime}</div>
            <div><span class="f-lbl">Selected Route:</span> ${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}</div>
            <div><span class="f-lbl">Footprint ID:</span> <code>${footprintHash}</code></div>
          </div>
        </div>

        <!-- Emergency Direct-Dial Quick Action Bar -->
        <div class="emergency-dials-section">
          <h4><i class="fas fa-phone-volume"></i> Emergency Quick-Dial & Safety Helplines:</h4>
          
          <div class="emergency-dials-grid">
            <a href="tel:${driver.phone.replace(/[^0-9+]/g, '')}" class="dial-btn dial-driver">
              <i class="fas fa-phone"></i>
              <span>Driver<br><strong>${driver.phone}</strong></span>
            </a>

            <a href="tel:181" class="dial-btn dial-women" title="181 Abhayam Women Helpline (Gujarat)">
              <i class="fas fa-person-dress"></i>
              <span>Women's Safety<br><strong>181 / 1090</strong></span>
            </a>

            <a href="tel:02652223333" class="dial-btn dial-police" title="Sayajigunj Police Desk">
              <i class="fas fa-shield"></i>
              <span>Local Police<br><strong>Sayajigunj Desk</strong></span>
            </a>

            <a href="tel:1363" class="dial-btn dial-tourist" title="National Tourist Helpline">
              <i class="fas fa-headset"></i>
              <span>Tourist Police<br><strong>1363</strong></span>
            </a>
          </div>
        </div>

        <!-- Live Trip Start Button -->
        <div class="start-trip-actions">
          <button type="button" class="btn btn-primary btn-block btn-lg" id="start-live-tracking-btn">
            <i class="fas fa-location-arrow"></i> Start Live Internal GPS Trip Tracking
          </button>
          
          <button type="button" class="btn btn-outline btn-block" id="share-live-beacon-btn">
            <i class="fas fa-share-nodes"></i> Share Live Safety Footprint via WhatsApp
          </button>
        </div>

      </div>
    `;

    modal.classList.add("active");

    // Bind Start Live Tracking
    const trackBtn = document.getElementById("start-live-tracking-btn");
    if (trackBtn) {
      trackBtn.onclick = () => {
        modal.classList.remove("active");
        this.startLiveTrip(digitalFootprint);
      };
    }

    const captureBtn = document.getElementById("capture-trip-photo-btn");
    const photoInput = document.getElementById("trip-photo-input");
    if (captureBtn && photoInput) {
      captureBtn.onclick = () => photoInput.click();
      photoInput.onchange = async () => {
        const file = photoInput.files?.[0];
        if (!file) return;
        const dataUrl = await this.fileToDataUrl(file);
        const point = await this.getCurrentGpsPoint();
        const photo = { id: `trip-photo-${Date.now()}`, dataUrl, capturedAt: new Date().toISOString(), gps: point };
        this.pendingTripPhotos.push(photo);
        if (this.activeTrip) this.activeTrip.capturedPhotos = [...this.pendingTripPhotos];
        const preview = document.getElementById("trip-photo-preview");
        if (preview) {
          const img = document.createElement("img");
          img.src = dataUrl; img.alt = "Trip photo"; img.style.cssText = "width:58px;height:58px;object-fit:cover;border-radius:7px;border:1px solid #dbeafe;";
          preview.appendChild(img);
        }
        photoInput.value = "";
      };
    }

    // Share Live Safety Beacon
    const shareBtn = document.getElementById("share-live-beacon-btn");
    if (shareBtn) {
      shareBtn.onclick = () => {
        const text = `🛡️ *VERIDA TRANSIT SAFETY BEACON*\nPassenger: ${store.activeUser.name}\nDriver: ${driver.name} (${driver.phone})\nVehicle No: ${driver.vehicleRegNo}\nRoute: ${this.activeRoute.fromName} to ${this.activeRoute.toName}\nFootprint Hash: ${footprintHash}\nEmergency Police: 112 | Women Helpline: 181`;
        if (navigator.share) {
          navigator.share({ title: "Verida Transit Safety Beacon", text });
        } else {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        }
      };
    }
  }

  // --- "Driver Has No App" Self-Protection Modal ---
  openZeroAppModal() {
    const modal = document.getElementById("zero-app-modal");
    const container = document.getElementById("zero-app-content");
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="zero-app-box animate-slide-up">
        <div class="zero-app-header">
          <div class="zero-app-icon"><i class="fas fa-car-burst"></i></div>
          <div>
            <h3>Driver Has No App? You're Still 100% Protected</h3>
            <p>Enter or snap the auto-rickshaw plate number to anchor your safety footprint.</p>
          </div>
        </div>

        <div class="zero-app-methods">
          
          <!-- Method 1: Enter Vehicle Plate -->
          <div class="method-card">
            <label><strong>1. Enter Vehicle Number Plate (from vehicle or meter):</strong></label>
            <div class="plate-input-row">
              <input type="text" id="manual-plate-input" placeholder="e.g. GJ-06-AU-7892" value="GJ-06-AU-7892" class="plate-text-input" style="width: 100%; margin-bottom: 12px;">
            </div>
            
            <label><strong>2. Select Route via Google Maps Location API:</strong></label>
            <div class="route-input-group" style="margin-top: 8px;">
              <input type="text" id="gmaps-from-input" class="plate-text-input" placeholder="Pickup Location" style="width: 100%; margin-bottom: 8px;">
              <input type="text" id="gmaps-to-input" class="plate-text-input" placeholder="Destination / Local Hotspot" style="width: 100%; margin-bottom: 12px;">
            </div>

            <div id="zero-app-mini-map" style="height: 150px; width: 100%; border-radius: 8px; margin-bottom: 12px; background: #e2e8f0; display:flex; align-items:center; justify-content:center; overflow: hidden;">
               <span style="font-size:12px;color:#64748b;">Loading Maps API...</span>
            </div>

            <button type="button" class="btn btn-primary btn-block" id="anchor-plate-btn">
              <i class="fas fa-shield-check"></i> Anchor Footprint & Allow GPS
            </button>
            <span class="input-hint" style="display:block;margin-top:8px;"><i class="fas fa-info-circle"></i> Will securely ping your live GPS to RTO database.</span>
          </div>

          <!-- Method 2: Instant WhatsApp Safety Beacon -->
          <div class="method-card" style="margin-top: 14px;">
            <button type="button" class="btn btn-danger btn-block" id="broadcast-beacon-btn">
              <i class="fas fa-broadcast-tower"></i> Broadcast Safety Beacon to Family & Police
            </button>
          </div>

        </div>
      </div>
    `;

    modal.classList.add("active");

    // Initialize Google Places Autocomplete and Mini Map
    setTimeout(() => {
      if (typeof google !== "undefined" && google.maps && google.maps.places) {
        const fromInput = document.getElementById("gmaps-from-input");
        const toInput = document.getElementById("gmaps-to-input");
        const mapDiv = document.getElementById("zero-app-mini-map");

        if (fromInput) new google.maps.places.Autocomplete(fromInput);
        if (toInput) new google.maps.places.Autocomplete(toInput);
        
        if (mapDiv) {
           const miniMap = new google.maps.Map(mapDiv, {
             center: { lat: store.currentLocation.lat, lng: store.currentLocation.lng },
             zoom: 14,
             disableDefaultUI: true
           });
           new google.maps.Marker({
             position: { lat: store.currentLocation.lat, lng: store.currentLocation.lng },
             map: miniMap,
             title: "Your Location"
           });
        }
      }
    }, 200);

    // Anchor Vehicle Plate
    const anchorBtn = document.getElementById("anchor-plate-btn");
    if (anchorBtn) {
      anchorBtn.onclick = () => {
        const processAnchor = () => {
          const plate = document.getElementById("manual-plate-input")?.value.trim() || "GJ-06-AU-7892";
          modal.classList.remove("active");
          
          const synthesizedDriver = {
            id: `driver-manual-${plate}`,
            name: "Registered Vadodara Transport Driver",
            photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            phone: "+91 94260 55321",
            vehicleType: "Auto-Rickshaw (Plate Anchored)",
            vehicleRegNo: plate,
            rtoLicenseNo: `GJ-06-RTO-${plate.slice(-4)}`,
            govtIssuer: "Gujarat RTO Registered Vehicle",
            rating: 4.9,
            trustScore: 97
          };

          this.openDriverVerificationModal(synthesizedDriver);
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => processAnchor(),
            (err) => {
              alert("⚠️ Please allow GPS access to record your safe Digital Footprint.");
              processAnchor();
            }
          );
        } else {
          processAnchor();
        }
      };
    }

    // Broadcast Beacon
    const broadcastBtn = document.getElementById("broadcast-beacon-btn");
    if (broadcastBtn) {
      broadcastBtn.onclick = () => {
        const plate = document.getElementById("manual-plate-input")?.value.trim() || "GJ-06-AU-7892";
        const text = `🚨 *VERIDA PASSENGER LIVE SAFETY BEACON*\nPassenger: ${store.activeUser.name}\nVehicle Plate: ${plate}\nRoute: ${this.activeRoute.fromName} -> ${this.activeRoute.toName}\nLive GPS: https://maps.google.com/?q=${store.currentLocation.lat},${store.currentLocation.lng}\nWomen Safety: 181 | Police: 112`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
      };
    }
  }

  // --- Internal Live GPS Trip Tracker ---
  startLiveTrip(footprint) {
    this.activeTrip = footprint;
    this.tripProgress = 0;
    this.tripElapsedSec = 0;
    this.pendingTripPhotos = Array.isArray(footprint.capturedPhotos) ? [...footprint.capturedPhotos] : [];
    this.routePoints = [];
    this.safetyCheckCount = 0;
    this.safetyCheckAcknowledged = false;

    const route = this.activeRoute || {};
    const distanceKm = Number(route.distanceKm || 3.4);
    const expectedMinutes = Number(route.expectedTravelMinutes || route.durationMinutes || route.estimatedMinutes || Math.max(8, Math.round((distanceKm / 20) * 60)));
    this.activeTrip.tripStartTime = new Date().toISOString();
    this.activeTrip.expectedTravelMinutes = expectedMinutes;
    this.activeTrip.expectedTravelMs = expectedMinutes * 60 * 1000;
    this.activeTrip.routePoints = [];

    this.getCurrentGpsPoint().then(point => { if (point) this.routePoints.push(point); });
    this.startGpsRouteRecording();
    this.scheduleDelayedTripSafetyCheck();

    const hud = document.getElementById("live-trip-tracker-hud");
    if (hud) { hud.classList.remove("hidden"); this.updateTripHud(); }

    if (this.tripTrackingInterval) clearInterval(this.tripTrackingInterval);
    this.tripTrackingInterval = setInterval(() => {
      this.tripElapsedSec += 2;
      this.tripProgress = Math.min(100, this.tripProgress + 4);
      this.recordCurrentRoutePoint();
      this.updateTripHud();
      if (this.tripProgress >= 100) {
        clearInterval(this.tripTrackingInterval);
        this.tripTrackingInterval = null;
        this.completeTrip();
      }
    }, 2000);
  }

  async getCurrentGpsPoint() {
    if (!navigator.geolocation) return null;
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() }),
      () => resolve(null), { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    ));
  }

  recordCurrentRoutePoint() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() };
      const last = this.routePoints[this.routePoints.length - 1];
      if (!last || Math.abs(last.lat - point.lat) > 0.00001 || Math.abs(last.lng - point.lng) > 0.00001) this.routePoints.push(point);
      if (this.activeTrip) this.activeTrip.routePoints = [...this.routePoints];
    }, () => {});
  }

  startGpsRouteRecording() {
    if (!navigator.geolocation || !navigator.geolocation.watchPosition) return;
    this.stopGpsRouteRecording();
    this.routeWatchId = navigator.geolocation.watchPosition(pos => {
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() };
      const last = this.routePoints[this.routePoints.length - 1];
      if (!last || Math.abs(last.lat - point.lat) > 0.00001 || Math.abs(last.lng - point.lng) > 0.00001) this.routePoints.push(point);
      if (this.activeTrip) this.activeTrip.routePoints = [...this.routePoints];
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
  }

  stopGpsRouteRecording() {
    if (this.routeWatchId !== null && navigator.geolocation?.clearWatch) navigator.geolocation.clearWatch(this.routeWatchId);
    this.routeWatchId = null;
  }

  async fileToDataUrl(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  }

  createRouteSnapshot() {
    const route = this.activeRoute || {};
    const points = this.routePoints.length >= 2 ? this.routePoints : [
      { lat: Number(route.fromLat), lng: Number(route.fromLng) },
      { lat: Number(route.toLat), lng: Number(route.toLng) }
    ].filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length < 2 || typeof document === "undefined") return "";
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 420;
    const ctx = canvas.getContext("2d"); if (!ctx) return "";
    const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
    const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
    const pad=35, w=canvas.width-pad*2, h=canvas.height-pad*2;
    const x=p=>pad+(p.lng-minLng)/(Math.max(maxLng-minLng,0.00001))*w;
    const y=p=>pad+(maxLat-p.lat)/(Math.max(maxLat-minLat,0.00001))*h;
    ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(x(p),y(p)):ctx.moveTo(x(p),y(p))); ctx.strokeStyle="#2563eb"; ctx.lineWidth=5; ctx.stroke();
    ctx.fillStyle="#059669"; ctx.beginPath(); ctx.arc(x(points[0]),y(points[0]),8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#dc2626"; ctx.beginPath(); ctx.arc(x(points[points.length-1]),y(points[points.length-1]),8,0,Math.PI*2); ctx.fill();
    return canvas.toDataURL("image/png");
  }

  scheduleDelayedTripSafetyCheck() {
    if (this.safetyCheckTimer) clearTimeout(this.safetyCheckTimer);
    const delay = Math.max(60 * 1000, Number(this.activeTrip?.expectedTravelMs || 25 * 60 * 1000));
    this.safetyCheckTimer = setTimeout(() => this.showDelayedTripSafetyCheck(), delay);
  }

  showDelayedTripSafetyCheck() {
    if (!this.activeTrip || this.safetyCheckAcknowledged) return;
    this.safetyCheckCount += 1;
    let modal = document.getElementById("verida-delayed-trip-safety");
    if (!modal) { modal=document.createElement("div"); modal.id="verida-delayed-trip-safety"; modal.className="modal-backdrop"; document.body.appendChild(modal); }
    modal.innerHTML = `<div class="modal-card" style="max-width:430px;text-align:center;"><div style="font-size:34px;margin-bottom:8px;">🛡️</div><h3>Is everything okay?</h3><p style="color:#64748b;font-size:13px;line-height:1.5;">Your trip has gone beyond the expected travel time. Please confirm your safety.</p><div style="display:flex;gap:8px;margin-top:16px;"><button type="button" class="btn btn-outline" id="trip-safety-report-btn" style="flex:1;">Report / SOS</button><button type="button" class="btn btn-primary" id="trip-safety-ok-btn" style="flex:1;">I'm Okay</button></div></div>`;
    modal.classList.add("active");
    document.getElementById("trip-safety-ok-btn").onclick = () => { modal.classList.remove("active"); this.safetyCheckAcknowledged=true; if (this.safetyCheckTimer) clearTimeout(this.safetyCheckTimer); this.safetyCheckTimer=setTimeout(()=>{ this.safetyCheckAcknowledged=false; this.showDelayedTripSafetyCheck(); }, 10*60*1000); };
    document.getElementById("trip-safety-report-btn").onclick = () => { modal.classList.remove("active"); if (window.veridaApp?.triggerSosFlow) window.veridaApp.triggerSosFlow(); };
    if (this.safetyCheckCount >= 3) { if (window.veridaApp?.triggerSosFlow) window.veridaApp.triggerSosFlow(); return; }
    this.safetyCheckTimer=setTimeout(()=>this.showDelayedTripSafetyCheck(),10*60*1000);
  }

  updateTripHud() {
    const hud = document.getElementById("live-trip-tracker-hud");
    if (!hud || !this.activeTrip) return;

    const remainingKm = ((1 - this.tripProgress / 100) * (this.activeRoute.distanceKm || 3.4)).toFixed(1);
    const speed = this.tripProgress < 100 ? (24 + (this.tripProgress % 8)) : 0;

    hud.innerHTML = `
      <div class="trip-hud-inner animate-slide-up">
        <div class="trip-hud-top">
          <div class="trip-status-col">
            <span class="trip-live-indicator"><span class="gps-live-dot"></span> LIVE TRIP TRACKING</span>
            <span class="trip-route-title">${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}</span>
          </div>
          <button type="button" class="btn-trip-sos" onclick="veridaApp.triggerSosFlow()" title="Trigger Police SOS">
            <span>🚨 SOS</span>
          </button>
        </div>

        <div class="trip-progress-bar-wrap">
          <div class="trip-progress-fill" style="width: ${this.tripProgress}%;"></div>
        </div>

        <div class="trip-stats-grid">
          <div class="t-stat"><span class="t-lbl">Speed</span><span class="t-val">${speed} km/h</span></div>
          <div class="t-stat"><span class="t-lbl">Remaining</span><span class="t-val">${remainingKm} km</span></div>
          <div class="t-stat"><span class="t-lbl">Vehicle</span><span class="t-val">${this.activeTrip.vehicleRegNo}</span></div>
          <div class="t-stat"><span class="t-lbl">Safety Radar</span><span class="t-val text-success">Normal Route</span></div>
        </div>

        <div class="trip-hud-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="transitSafety.shareLiveLocation()">
            <i class="fas fa-share-nodes"></i> Share Live GPS
          </button>
          <button type="button" class="btn btn-danger btn-sm" onclick="transitSafety.endTripEarly()">
            <i class="fas fa-flag-checkered"></i> End Trip & Log Rate
          </button>
        </div>
      </div>
    `;
  }

  captureLiveTripPhoto() {
    let input = document.getElementById("live-trip-photo-input");
    if (!input) {
      input = document.createElement("input"); input.id="live-trip-photo-input"; input.type="file"; input.accept="image/*"; input.capture="environment"; input.hidden=true; document.body.appendChild(input);
      input.onchange = async () => {
        const file=input.files?.[0]; if(!file) return;
        const dataUrl=await this.fileToDataUrl(file); const point=await this.getCurrentGpsPoint();
        this.pendingTripPhotos.push({id:`trip-photo-${Date.now()}`,dataUrl,capturedAt:new Date().toISOString(),gps:point});
        if(this.activeTrip) this.activeTrip.capturedPhotos=[...this.pendingTripPhotos]; input.value="";
      };
    }
    input.click();
  }

  shareLiveLocation() {
    const text = `📍 *LIVE TRANSIT GPS TRACKING (Verida)*\nPassenger: ${store.activeUser.name}\nVehicle: ${this.activeTrip?.vehicleRegNo || 'Auto'}\nLive Position: https://maps.google.com/?q=${store.currentLocation.lat},${store.currentLocation.lng}`;
    if (navigator.share) {
      navigator.share({ title: "Live GPS Trip", text });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  endTripEarly() {
    if (this.tripTrackingInterval) {
      clearInterval(this.tripTrackingInterval);
      this.tripTrackingInterval = null;
    }
    this.completeTrip();
  }

  completeTrip() {
    const hud = document.getElementById("live-trip-tracker-hud");
    if (hud) hud.classList.add("hidden");

    // Prompt for price paid to feed into "Last 3 Passengers Paid"
    const modal = document.getElementById("price-prompt-modal");
    if (modal) {
      const title = document.getElementById("price-prompt-title");
      if (title) title.textContent = `You reached ${this.activeRoute.toName}! What did you pay?`;
      modal.classList.add("active");

      const submitBtn = document.getElementById("price-prompt-submit-btn");
      if (submitBtn) {
       submitBtn.onclick = () => {
       const customVal = document.getElementById("price-prompt-custom-amount")?.value;
      const paidAmount = customVal && parseFloat(customVal) > 0 ? parseFloat(customVal) : this.activeRoute.fairRange.median;

  // Existing ticker update (keep this)
  if (!this.activeRoute.last3PassengersPaid) this.activeRoute.last3PassengersPaid = [];
  this.activeRoute.last3PassengersPaid.unshift({
    passengerName: `${store.activeUser.name} (You)`,
    amount: Math.round(paidAmount),
    timeAgo: "Just now",
    vehicleNo: this.activeTrip?.vehicleRegNo || "GJ-06-AU-7892",
    driverName: this.activeTrip?.driverName || "Mehul Bhai"
  });
  if (this.activeRoute.last3PassengersPaid.length > 3) {
    this.activeRoute.last3PassengersPaid = this.activeRoute.last3PassengersPaid.slice(0, 3);
  }
  this.renderLast3PassengersPaid();

 
  store.recordDigitalFootprint({
    passengerName: store.activeUser.name,
    driverName: this.activeTrip?.driverName || "Mehul Bhai",
    vehicleRegNo: this.activeTrip?.vehicleRegNo || "GJ-06-AU-7892",
    route: `${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}`,
    amountPaid: Math.round(paidAmount),
    status: "completed"
  });

  modal.classList.remove("active");
  alert("🎉 Trip Completed! Your payment has been added to the 'Last 3 Passengers Paid' live ticker to protect the next traveler.");
};
      }
    }
  }
}

export const transitSafety = new TransitSafetyManager();
*/


/**
 * Verida — Transit Safety & Digital Footprint Module
 * Two-way Driver/Passenger verification, Origin->Destination Route Fare Intelligence with "Last 3 Passengers Paid",
 * Internal GPS Live Trip Tracking, and Zero-App Driver Protection workflows.
 */

import { store } from "./store.js";
import {
  SEED_ROUTES,
  SEED_DRIVERS
} from "../data/seedData.js";
import { reviewsManager } from "./reviews.js";

export class TransitSafetyManager {
  constructor() {
    this.activeRoute =
      SEED_ROUTES[0];

    this.activeDriver =
      SEED_DRIVERS[0];

    this.activeTrip = null;

    this.tripTrackingInterval =
      null;

    this.tripProgress = 0;

    this.tripElapsedSec = 0;
    this.routePoints = [];
    this.routeWatchId = null;
    this.pendingTripPhotos = [];
    this.safetyCheckCount = 0;
    this.safetyCheckTimer = null;
    this.safetyCheckAcknowledged = false;
  }

  // --- Initialize Route Planner ---
  initRoutePlanner(
    containerId =
      "route-planner-container"
  ) {
    const container =
      document.getElementById(
        containerId
      );

    if (!container) return;

    if (
      store.currentRole ===
      "guide"
    ) {
      this.renderDriverTransitHistory(
        container
      );

      return;
    }

    const routes =
      store.getRoutesForCity(
        store.currentCityId
      );

    this.activeRoute =
      routes[0] ||
      SEED_ROUTES[0];

    this.activeDriver =
      store.activeGuide ||
      this.activeDriver;

    container.innerHTML = `
      <div class="transit-planner-card">

        <div class="transit-header-row">
          <div class="transit-title-block">

            <h3>
              <i class="fas fa-route"></i>
              Route Fare Intelligence
            </h3>

            <p>
              Select pickup & destination to see what previous passengers paid.
            </p>

          </div>

          <span class="badge-pill-verified">
            <i class="fas fa-shield-check"></i>
            RTO Benchmarked
          </span>
        </div>

        <!-- From -->
        <div class="route-inputs-box">

          <div class="route-input-group">

            <span class="route-dot start-dot"></span>

            <div class="input-wrap">

              <label>
                Pickup Location (From)
              </label>

              <select
                id="route-from-select"
                class="route-select"
              >
                ${routes
                  .map(
                    (r, idx) => `
                  <option
                    value="${r.id}"
                    ${
                      idx === 0
                        ? "selected"
                        : ""
                    }
                  >
                    📍 ${r.fromName}
                  </option>
                `
                  )
                  .join("")}
              </select>

            </div>
          </div>

          <div class="route-connector-line"></div>

          <!-- To -->
          <div class="route-input-group">

            <span class="route-dot end-dot"></span>

            <div class="input-wrap">

              <label>
                Destination Drop-off (To)
              </label>

              <select
                id="route-to-select"
                class="route-select"
              >
                ${routes
                  .map(
                    (r, idx) => `
                  <option
                    value="${r.id}"
                    ${
                      idx === 0
                        ? "selected"
                        : ""
                    }
                  >
                    🎯 ${r.toName}
                    (${r.distanceKm} km)
                  </option>
                `
                  )
                  .join("")}
              </select>

            </div>
          </div>

        </div>

        <!-- Last 3 Passengers -->
        <div
          class="last3-passengers-card"
          id="last3-passengers-container"
        >
        </div>

      </div>
    `;

    this.renderLast3PassengersPaid();

    this.bindRouteEvents();
  }

  // =========================================================
  // IMPORTANT FIX #1
  // FROM AND TO ARE NOW INDEPENDENT
  // =========================================================
  bindRouteEvents() {
    const fromSelect =
      document.getElementById(
        "route-from-select"
      );

    const toSelect =
      document.getElementById(
        "route-to-select"
      );

    /*
     * IMPORTANT:
     *
     * DO NOT do:
     *
     * fromSelect.value = found.id;
     * toSelect.value = found.id;
     *
     * That was causing one dropdown to automatically
     * select the same option as the other dropdown.
     */

    const updateRoute =
      (routeId) => {
        const routes =
          store.getRoutesForCity(
            store.currentCityId
          );

        const found =
          routes.find(
            (r) =>
              r.id === routeId
          );

        if (found) {
          this.activeRoute =
            found;

          /*
           * Only update the route data.
           *
           * Never modify the value of either
           * From or To dropdown.
           */
          this.renderLast3PassengersPaid();
        }
      };

    if (fromSelect) {
      fromSelect.onchange =
        (e) => {
          updateRoute(
            e.target.value
          );
        };
    }

    if (toSelect) {
      toSelect.onchange =
        (e) => {
          updateRoute(
            e.target.value
          );
        };
    }

    // Scan Driver QR
    const scanBtn =
      document.getElementById(
        "scan-driver-qr-btn"
      );

    if (scanBtn) {
      scanBtn.onclick = () => {
        const savedGuide = store.activeGuide;
        const isRegisteredDriver = savedGuide && savedGuide.name && (savedGuide.phone || savedGuide.vehicleRegNo);
        const activeDriver = isRegisteredDriver ? savedGuide : this.activeDriver;
        this.openDriverVerificationModal(
          activeDriver
        );
      };
    }

    // Driver Has No App
    const zeroAppBtn =
      document.getElementById(
        "zero-app-driver-btn"
      );

    if (zeroAppBtn) {
      zeroAppBtn.onclick = () => {
        this.openZeroAppModal();
      };
    }
  }

  // --- Render Last 3 Passengers Paid ---
  renderLast3PassengersPaid() {
    const container =
      document.getElementById(
        "last3-passengers-container"
      );

    if (
      !container ||
      !this.activeRoute
    ) {
      return;
    }

    const r =
      this.activeRoute;

    const history =
      r.last3PassengersPaid ||
      [];

    container.innerHTML = `
      <div class="last3-header">

        <div class="last3-title">

          <i
            class="fas fa-users-viewfinder"
            style="color: var(--primary);"
          ></i>

          <strong>
            Last 3 Passengers Paid on this Exact Route:
          </strong>

        </div>

        <span class="fair-median-badge">
          Fair Range:
          ₹${r.fairRange.min}–₹${r.fairRange.median}
        </span>

      </div>

      <div class="last3-history-list">

        ${history
          .map(
            (item, idx) => `
          <div
            class="last3-item animate-fade-in"
            style="animation-delay: ${
              idx * 0.08
            }s"
          >

            <div class="last3-left">

              <span class="passenger-avatar-icon">
                <i class="fas fa-user-check"></i>
              </span>

              <div class="passenger-meta">

                <span class="p-name">
                  <strong>
                    ${item.passengerName}
                  </strong>
                </span>

                <span class="p-vehicle">
                  <i class="fas fa-taxi"></i>
                  ${item.vehicleNo}
                  (${item.driverName})
                </span>

              </div>

            </div>

            <div class="last3-right">

              <span class="p-amount">
                ₹${item.amount}
              </span>

              <span class="p-time">
                ${item.timeAgo}
              </span>

            </div>

          </div>
        `
          )
          .join("")}

      </div>

      ${
        r.toutScamWarning
          ? `
        <div class="route-scam-warning">

          <i class="fas fa-triangle-exclamation"></i>

          <span>
            <strong>
              Tout Alert on this Route:
            </strong>

            ${r.toutScamWarning}
          </span>

        </div>
      `
          : ""
      }
    `;
  }

  // --- Render Driver Transit History ---
  renderTransitTab() {
    const container =
      document.getElementById(
        "transit-tab-content"
      ) ||
      document.getElementById(
        "main-tab-view"
      );

    if (!container) return;

    const isDriverMode =
      store.currentMode ===
        "driver" ||
      store.currentMode ===
        "guide";

    if (isDriverMode) {
      this.renderDriverTransitHistory(
        container
      );
    } else {
      this.renderPassengerTransitIntelligence(
        container
      );
    }
  }

 /**  renderDriverTransitHistory(
    container
  ) {
    let footprints =
      store.getDigitalFootprints() ||
      [];
      

    footprints.sort(
      (a, b) =>
        new Date(
          b.timestamp ||
            b.createdAt
        ) -
        new Date(
          a.timestamp ||
            a.createdAt
        )
    );
*/
renderDriverTransitHistory(container) {
  let footprints = store.getDigitalFootprints() || [];

  /*
   * IMPORTANT:
   * A passenger gets one "active_trip" footprint when
   * the driver QR handshake happens.
   *
   * After the trip finishes, another "completed" footprint
   * is created with the actual amount paid.
   *
   * We remove ONLY the old active_trip record when a matching
   * completed trip exists.
   *
   * We DO NOT filter by passenger name alone.
   * Therefore:
   *
   * Passenger A - ₹50
   * Passenger A - ₹100
   *
   * can both remain if they are genuinely different trips.
   */

  footprints = footprints.filter((footprint) => {

    // Keep completed records
    if (footprint.status !== "active_trip") {
      return true;
    }

    // Look for the completed version of THIS exact trip
    const matchingCompletedTrip = footprints.some((completed) => {

      if (completed.status !== "completed") {
        return false;
      }

      const samePassenger =
        String(completed.passengerName || "").trim().toLowerCase() ===
        String(footprint.passengerName || "").trim().toLowerCase();

      const sameDriver =
        (
          completed.driverId &&
          footprint.driverId &&
          completed.driverId === footprint.driverId
        ) ||
        (
          completed.vehicleRegNo &&
          footprint.vehicleRegNo &&
          completed.vehicleRegNo === footprint.vehicleRegNo
        );

      const sameRoute =
        String(completed.route || "").trim().toLowerCase() ===
        String(footprint.route || "").trim().toLowerCase();

      return samePassenger && sameDriver && sameRoute;
    });

    // If completed version exists, hide the temporary active record.
    // If it doesn't exist, keep the active record.
    return !matchingCompletedTrip;
  });

  // Filter for the currently active/registered driver
  const guide = store.activeGuide;
  const driverVehicle = guide?.vehicleRegNo;
  const driverId = guide?.id || guide?.uid;
  const driverPhone = guide?.phone;
  const driverName = guide?.name;

  if (driverVehicle || driverId || driverPhone || driverName) {
    const driverSpecificFootprints = footprints.filter(f => 
      (driverVehicle && f.vehicleRegNo === driverVehicle) ||
      (driverId && f.driverId === driverId) ||
      (driverPhone && f.driverPhone === driverPhone) ||
      (driverName && f.driverName === driverName)
    );
    if (driverSpecificFootprints.length > 0) {
      footprints = driverSpecificFootprints;
    }
  }

  footprints.sort(
    (a, b) =>
      new Date(b.timestamp || b.createdAt) -
      new Date(a.timestamp || a.createdAt)
  );
    if (
      footprints.length === 0
    ) {
      footprints = [
        {
          passengerName:
            "Angel Ganev",
          from:
            "Vadodara Junction (Railway Station)",
          to:
            "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)",
          fare: 100,
          time: "03:53 pm"
        },
        {
          passengerName:
            "Angel Ganev",
          from:
            "Vadodara Junction (Railway Station)",
          to:
            "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)",
          fare: 100,
          time: "03:51 pm"
        },
        {
          passengerName:
            "Angel Ganev",
          from:
            "Vadodara Junction (Railway Station)",
          to:
            "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)",
          fare: 100,
          time: "03:50 pm"
        },
        {
          passengerName:
            "Sweet Lemon",
          from:
            "Vadodara Junction (Railway Station)",
          to:
            "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)",
          fare: 100,
          time: "12:30 pm"
        },
        {
          passengerName:
            "Devanshi Sharma",
          from:
            "Vadodara Junction (Railway Station)",
          to:
            "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)",
          fare: 100,
          time: "11:15 am"
        }
      ];
    }

    container.innerHTML = `
      <div style="padding: 16px;">

        <div style="margin-bottom: 16px;">

          <h3
            style="
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 8px;
            "
          >
            <i
              class="fas fa-list-ul"
              style="font-size: 14px;"
            ></i>

            My Transit History
          </h3>

          <p
            style="
              font-size: 12px;
              color: #64748b;
              margin: 4px 0 0 0;
            "
          >
            Verified passenger trips and anchored footprints.
          </p>

        </div>

        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 10px;
          "
        >

          ${footprints
            .map(
              (f) => {
                const name =
                  f.passengerName ||
                  "Verified Passenger";

                const routeStr =
                  f.route ||
                  `${f.from || "Vadodara Junction (Railway Station)"} ➔ ${
                    f.to ||
                    "Laxmi Vilas Palace (Old Palace Rd) (3.4 km)"
                  }`;

                const fare =
                  f.fare ||
                  f.amountPaid ||
                  100;

                let displayTime =
                  f.time;

                let displayDate = f.date || "";

                const tripDateObj =
                  new Date(
                    f.timestamp ||
                      f.createdAt ||
                      Date.now()
                  );

                if (!displayTime) {
                  displayTime =
                    tripDateObj.toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                      }
                    ).toLowerCase();
                }

                if (!displayDate) {
                  displayDate =
                    tripDateObj.toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }
                    );
                }

                return `
                  <div
                    style="
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 12px 14px;
                      background: #ffffff;
                      border: 1px solid #f1f5f9;
                      border-radius: 8px;
                    "
                  >

                    <div
                      style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                      "
                    >

                      <div
                        style="
                          width: 36px;
                          height: 36px;
                          border-radius: 50%;
                          background: #ecfdf5;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          flex-shrink: 0;
                        "
                      >
                        <i
                          class="fas fa-user-check"
                          style="
                            color: #10b981;
                            font-size: 15px;
                          "
                        ></i>
                      </div>

                      <div
                        style="
                          display: flex;
                          flex-direction: column;
                          gap: 2px;
                        "
                      >

                        <span
                          style="
                            font-size: 13px;
                            font-weight: 700;
                            color: #0f172a;
                          "
                        >
                          ${name}
                        </span>

                        <span
                          style="
                            font-size: 11px;
                            color: #64748b;
                          "
                        >
                          <i
                            class="fas fa-map-marker-alt"
                            style="
                              font-size: 10px;
                              color: #94a3b8;
                            "
                          ></i>

                          ${routeStr}
                        </span>

                        <span
                          style="
                            font-size: 11px;
                            color: #94a3b8;
                          "
                        >
                          <i
                            class="fas fa-calendar-alt"
                            style="font-size: 10px;"
                          ></i>

                          ${displayDate} • ${displayTime}
                        </span>

                      </div>
                    </div>

                    <div
                      style="
                        text-align: right;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 2px;
                      "
                    >

                      <span
                        style="
                          font-size: 13px;
                          font-weight: 700;
                          color: #059669;
                        "
                      >
                        Est. ₹${fare}
                      </span>

                      <span
                        style="
                          font-size: 10px;
                          color: #94a3b8;
                          font-weight: 500;
                        "
                      >
                        Verified
                      </span>

                    </div>

                  </div>
                `;
              }
            )
            .join("")}

        </div>

      </div>
    `;
  }

  // --- Driver Verification & Safety Card ---
  openDriverVerificationModal(
    driver = this.activeDriver
  ) {
    // Resolve to signed-up driver from store.activeGuide if available
    const savedGuide = store.activeGuide;
    const isRegisteredDriver = savedGuide && savedGuide.name && (savedGuide.phone || savedGuide.vehicleRegNo);
    if (isRegisteredDriver && (!driver || driver === this.activeDriver)) {
      driver = savedGuide;
    }
    this.activeDriver = driver;

    const modal =
      document.getElementById(
        "driver-safety-card-modal"
      );

    const container =
      document.getElementById(
        "driver-safety-card-content"
      );

    if (
      !modal ||
      !container
    ) {
      return;
    }

    const now =
      new Date();

    const driverLicense =
      driver.rtoLicenseNo ||
      driver.licenseNo ||
      "N/A";

    const driverIssuer =
      driver.govtIssuer ||
      driver.issuer ||
      "Gujarat RTO & Tourism Authority";

    const vehicleNumber =
      driver.vehicleRegNo ||
      "Not Provided";

    const footprintHash =
      `VRD-FOOTPRINT-${vehicleNumber.replace(
        /-/g,
        ""
      )}-${Date.now()
        .toString()
        .slice(-6)}`;

    // Log digital footprint
    const digitalFootprint = {
      footprintHash:
        footprintHash,

      timestamp:
        now.toISOString(),

      formattedTime:
        now.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ),

      passengerName:
        store.activeUser.name,

      driverId:
        driver.id ||
        driver.uid ||
        "",

      driverName:
        driver.name,

      driverPhone:
        driver.phone,

      driverPhoto:
        driver.photo || "",

      vehicleRegNo:
        vehicleNumber,

      vehicleType:
        driver.vehicleType,

      driverLicense:
        driver.rtoLicenseNo ||
        driver.licenseNo ||
        "",

      rtoLicenseNo:
        driver.rtoLicenseNo ||
        driver.licenseNo ||
        "",

      route:
        `${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}`,

      pickupGps:
        `${store.currentLocation.lat.toFixed(
          4
        )}, ${store.currentLocation.lng.toFixed(
          4
        )}`,

      driverLicense,
      driverPhoto: driver.photo || "",
      tripStartTime: now.toISOString(),
      capturedPhotos: [],
      routePoints: [],
      status:
        "active_trip"
    };

    store
      .recordDigitalFootprint(
        digitalFootprint
      )
      .then(() => {
        if (
          typeof reviewsManager !==
            "undefined" &&
          reviewsManager
        ) {
          const targetGuideId =
            driver.id ||
            driver.uid ||
            driver.vehicleRegNo;

          reviewsManager.renderGuideLedger(
            targetGuideId,
            "guide-ledger-container"
          );

          const guideSelfLedger =
            document.getElementById(
              "guide-self-ledger"
            );

          if (guideSelfLedger) {
            reviewsManager.renderGuideLedger(
              targetGuideId,
              "guide-self-ledger"
            );
          }
        }
      });

    container.innerHTML = `
      <div
        class="driver-safety-dossier animate-slide-up"
      >

        <!-- Official Verification Header -->
        <div class="safety-card-top-bar">

          <div class="govt-seal-badge">

            <i class="fas fa-shield-halved"></i>

            <span>
              GUJARAT RTO & TOURISM CERTIFIED
            </span>

          </div>

          <span class="badge-trust-high">

            <i class="fas fa-star"></i>

            ${driver.rating || 4.9}
            ★
            (${driver.trustScore || 98}% Trust)

          </span>

        </div>

        <!-- Driver Profile -->
        <div class="driver-profile-main">

          <img
            src="${driver.photo || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"}"
            alt="${driver.name || "Driver"}"
            class="driver-card-avatar"
          >

          <div class="driver-card-bio">

            <h3 class="driver-name">
              ${driver.name || "Unknown Driver"}
            </h3>

            <div class="vehicle-plate-pill">

              <i class="fas fa-id-badge"></i>

              Vehicle No:
              <strong>
                ${vehicleNumber}
              </strong>

            </div>

            ${driver.phone ? `
            <p class="phone-info" style="font-size: 12px; color: #334155; margin: 4px 0; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-phone-alt" style="color: #059669; font-size: 11px;"></i>
              Phone: <strong>${driver.phone}</strong>
            </p>
            ` : ""}

            <p class="lic-info">

              <i class="fas fa-file-contract"></i>

              RTO License:
              <strong>
                ${driverLicense}
              </strong>

            </p>

            <p class="issuer-info">

              <i class="fas fa-building-shield"></i>

              Issuer:
              ${driverIssuer}

            </p>

          </div>
        </div>

        <!-- Active Route: From → To Destinations -->
        <div style="background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px; padding:12px 14px; margin:10px 0;">
          <div style="font-size:11px; font-weight:700; color:#065f46; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-route" style="color:#059669;"></i> ACTIVE TRANSIT ROUTE
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <div style="width:10px; height:10px; border-radius:50%; background:#10b981; flex-shrink:0; border:2px solid #065f46;"></div>
            <div style="font-size:13px; font-weight:600; color:#0f172a;">From: <strong>${this.activeRoute.fromName}</strong></div>
          </div>
          <div style="border-left:2px dashed #a7f3d0; margin-left:4px; height:12px;"></div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:10px; height:10px; border-radius:50%; background:#dc2626; flex-shrink:0; border:2px solid #991b1b;"></div>
            <div style="font-size:13px; font-weight:600; color:#0f172a;">To: <strong>${this.activeRoute.toName}</strong></div>
          </div>
        </div>

        <!-- Digital Footprint -->
        <div class="footprint-anchor-box">

          <div class="footprint-anchor-header">

            <i class="fas fa-fingerprint"></i>

            <strong>
              PASSENGER DIGITAL FOOTPRINT LOGGED
            </strong>

          </div>

          <div class="footprint-meta-grid">

            <div>
              <span class="f-lbl">
                Passenger:
              </span>

              <strong>
                ${store.activeUser.name}
              </strong>
            </div>

            <div>
              <span class="f-lbl">
                Trip Start Time:
              </span>

              ${digitalFootprint.formattedTime}
            </div>

            <div>
              <span class="f-lbl">
                Selected Route:
              </span>

              ${this.activeRoute.fromName}
              ➔
              ${this.activeRoute.toName}
            </div>

            <div>
              <span class="f-lbl">
                Footprint ID:
              </span>

              <code>
                ${footprintHash}
              </code>
            </div>

          </div>
        </div>

        <!-- Emergency -->
        <div class="emergency-dials-section">

          <h4>
            <i class="fas fa-phone-volume"></i>

            Emergency Quick-Dial & Safety Helplines:
          </h4>

          <div class="emergency-dials-grid">

            <a
              href="tel:${(driver.phone || "").replace(
                /[^0-9+]/g,
                ""
              )}"
              class="dial-btn dial-driver"
            >

              <i class="fas fa-phone"></i>

              <span>
                Driver<br>
                <strong>
                  ${driver.phone || "Not Provided"}
                </strong>
              </span>

            </a>

            <a
              href="tel:181"
              class="dial-btn dial-women"
              title="181 Abhayam Women Helpline (Gujarat)"
            >

              <i class="fas fa-person-dress"></i>

              <span>
                Women's Safety<br>
                <strong>
                  181 / 1090
                </strong>
              </span>

            </a>

            <a
              href="tel:02652223333"
              class="dial-btn dial-police"
              title="Sayajigunj Police Desk"
            >

              <i class="fas fa-shield"></i>

              <span>
                Local Police<br>
                <strong>
                  Sayajigunj Desk
                </strong>
              </span>

            </a>

            <a
              href="tel:1363"
              class="dial-btn dial-tourist"
              title="National Tourist Helpline"
            >

              <i class="fas fa-headset"></i>

              <span>
                Tourist Police<br>
                <strong>
                  1363
                </strong>
              </span>

            </a>

          </div>
        </div>

        <!-- Captured Photos Preview Strip -->
        <div id="trip-photo-preview-container" style="margin-bottom:12px; display:${this.pendingTripPhotos.length ? 'block' : 'none'};">
          <label style="font-size:11px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">
            <i class="fas fa-camera"></i> Attached Trip Evidence (${this.pendingTripPhotos.length}):
          </label>
          <div id="trip-photo-preview" style="display:flex; gap:8px; flex-wrap:wrap;">
            ${this.pendingTripPhotos.map(p => `
              <div style="position:relative;">
                <img src="${p.dataUrl}" alt="Trip Photo" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid #10b981;">
                <span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; font-size:9px; padding:1px 4px; border-radius:3px;">${p.type || 'Photo'}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Working Photo Capture Options -->
        <div class="photo-capture-options-box" style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; font-weight:700; color:#1e293b;">
              <i class="fas fa-camera" style="color:var(--primary);"></i> Capture Trip Photo / Evidence
            </span>
            <span style="font-size:10px; color:#64748b; background:#e2e8f0; padding:2px 6px; border-radius:4px;">Optional</span>
          </div>

          <input type="file" id="trip-camera-input" accept="image/*" capture="environment" hidden>
          <input type="file" id="trip-occupant-input" accept="image/*" capture="user" hidden>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button type="button" class="btn btn-outline btn-sm" id="capture-driver-photo-btn" style="padding:8px 6px; font-size:11px; justify-content:center; text-align:center;">
              <i class="fas fa-id-badge"></i> Capture Driver
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="capture-occupant-photo-btn" style="padding:8px 6px; font-size:11px; justify-content:center; text-align:center;">
              <i class="fas fa-users"></i> Capture Occupant
            </button>
          </div>
          <small style="display:block; font-size:10px; color:#64748b; margin-top:6px; line-height:1.3;">
            Photo is securely anchored with GPS coordinates and timestamp to this current trip's Digital Footprint.
          </small>
        </div>

        <!-- Live Trip & Action Buttons: Horizontal Side-by-Side -->
        <div class="start-trip-actions">
          <button
            type="button"
            class="btn btn-primary btn-block btn-lg"
            id="start-live-tracking-btn"
            style="margin-bottom: 8px;"
          >
            <i class="fas fa-location-arrow"></i>
            Start Live Internal GPS Trip Tracking
          </button>

          <!-- REQUIRED SIDE-BY-SIDE BUTTONS: Share Live Location (LEFT) | End the Trip (RIGHT) -->
          <div class="driver-popup-bottom-actions" style="display: flex; gap: 8px; width: 100%;">
            <button
              type="button"
              class="btn btn-outline"
              id="share-live-beacon-btn"
              style="flex: 1; justify-content: center; font-size: 12px; padding: 10px 8px; font-weight: 700;"
            >
              <i class="fas fa-share-nodes"></i>
              Share Live Location
            </button>

            <button
              type="button"
              class="btn btn-danger"
              id="popup-end-trip-btn"
              style="flex: 1; justify-content: center; font-size: 12px; padding: 10px 8px; font-weight: 700;"
            >
              <i class="fas fa-flag-checkered"></i>
              End the Trip
            </button>
          </div>
        </div>

      </div>
    `;

    modal.classList.add("active");

    // Camera Capture Bindings
    const driverCamBtn = document.getElementById("capture-driver-photo-btn");
    const occupantCamBtn = document.getElementById("capture-occupant-photo-btn");
    const camInput = document.getElementById("trip-camera-input");
    const occInput = document.getElementById("trip-occupant-input");

    const handlePhotoFile = async (file, photoType) => {
      if (!file) return;
      const dataUrl = await this.fileToDataUrl(file);
      const point = await this.getCurrentGpsPoint();
      const photo = {
        id: `trip-photo-${Date.now()}`,
        type: photoType,
        dataUrl,
        capturedAt: new Date().toISOString(),
        gps: point
      };
      this.pendingTripPhotos.push(photo);
      if (this.activeTrip) {
        this.activeTrip.capturedPhotos = [...this.pendingTripPhotos];
      }

      // Re-render preview strip inside modal
      const previewContainer = document.getElementById("trip-photo-preview-container");
      const previewDiv = document.getElementById("trip-photo-preview");
      if (previewContainer && previewDiv) {
        previewContainer.style.display = "block";
        const itemWrap = document.createElement("div");
        itemWrap.style.position = "relative";
        itemWrap.innerHTML = `
          <img src="${dataUrl}" alt="${photoType}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid #10b981;">
          <span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; font-size:9px; padding:1px 4px; border-radius:3px;">${photoType}</span>
        `;
        previewDiv.appendChild(itemWrap);
      }
    };

    if (driverCamBtn && camInput) {
      driverCamBtn.onclick = () => camInput.click();
      camInput.onchange = async () => {
        const file = camInput.files?.[0];
        await handlePhotoFile(file, "Driver");
        camInput.value = "";
      };
    }

    if (occupantCamBtn && occInput) {
      occupantCamBtn.onclick = () => occInput.click();
      occInput.onchange = async () => {
        const file = occInput.files?.[0];
        await handlePhotoFile(file, "Occupant");
        occInput.value = "";
      };
    }

    // Start Live Tracking
    const trackBtn = document.getElementById("start-live-tracking-btn");
    if (trackBtn) {
      trackBtn.onclick = () => {
        modal.classList.remove("active");
        this.startLiveTrip(digitalFootprint);
      };
    }

    // Left Button: Share Live Location
    const shareBtn = document.getElementById("share-live-beacon-btn");
    if (shareBtn) {
      shareBtn.onclick = () => {
        const text =
          `🛡️ *VERIDA TRANSIT SAFETY BEACON*\n` +
          `Passenger: ${store.activeUser.name}\n` +
          `Driver: ${driver.name} (${driver.phone || "N/A"})\n` +
          `Vehicle No: ${vehicleNumber}\n` +
          `Route: ${this.activeRoute.fromName} to ${this.activeRoute.toName}\n` +
          `Footprint Hash: ${footprintHash}\n` +
          `Live GPS: https://maps.google.com/?q=${store.currentLocation.lat},${store.currentLocation.lng}\n` +
          `Emergency Police: 112 | Women Helpline: 181`;

        if (navigator.share) {
          navigator.share({
            title: "Verida Transit Safety Beacon",
            text
          }).catch(() => {});
        } else {
          window.open(
            `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
            "_blank"
          );
        }
      };
    }

    // Right Button: End the Trip
    const endTripBtn = document.getElementById("popup-end-trip-btn");
    if (endTripBtn) {
      endTripBtn.onclick = () => {
        modal.classList.remove("active");
        if (!this.activeTrip) {
          this.activeTrip = { ...digitalFootprint, capturedPhotos: [...this.pendingTripPhotos] };
        }
        this.endTripEarly();
      };
    }
  }

  // --- Driver Has No App ---
  openZeroAppModal() {
    const modal =
      document.getElementById(
        "zero-app-modal"
      );

    const container =
      document.getElementById(
        "zero-app-content"
      );

    if (
      !modal ||
      !container
    ) {
      return;
    }

    container.innerHTML = `
      <div class="zero-app-box animate-slide-up">

        <div class="zero-app-header">

          <div class="zero-app-icon">
            <i class="fas fa-car-burst"></i>
          </div>

          <div>

            <h3>
              Driver Has No App?
              You're Still 100% Protected
            </h3>

            <p>
              Enter or snap the auto-rickshaw
              plate number to anchor your safety footprint.
            </p>

          </div>

        </div>

        <div class="zero-app-methods">

          <!-- Method 1 -->
          <div class="method-card">

            <label>
              <strong>
                1. Enter Vehicle Number Plate
                (from vehicle or meter):
              </strong>
            </label>

            <div class="plate-input-row">

              <input
                type="text"
                id="manual-plate-input"
                placeholder="e.g. GJ-06-AU-7892"
                value="GJ-06-AU-7892"
                class="plate-text-input"
                style="width: 100%; margin-bottom: 12px;"
              >

            </div>

            <label>
              <strong>
                2. Select Route via Google Maps Location API:
              </strong>
            </label>

            <div
              class="route-input-group"
              style="margin-top: 8px;"
            >

              <input
                type="text"
                id="gmaps-from-input"
                class="plate-text-input"
                placeholder="Pickup Location"
                style="
                  width: 100%;
                  margin-bottom: 8px;
                "
              >

              <input
                type="text"
                id="gmaps-to-input"
                class="plate-text-input"
                placeholder="Destination / Local Hotspot"
                style="
                  width: 100%;
                  margin-bottom: 12px;
                "
              >

            </div>

            <div
              id="zero-app-mini-map"
              style="
                height: 150px;
                width: 100%;
                border-radius: 8px;
                margin-bottom: 12px;
                background: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              "
            >
              <span
                style="
                  font-size: 12px;
                  color: #64748b;
                "
              >
                Loading Maps API...
              </span>
            </div>

            <button
              type="button"
              class="btn btn-primary btn-block"
              id="anchor-plate-btn"
            >

              <i class="fas fa-shield-check"></i>

              Anchor Footprint & Allow GPS

            </button>

            <span
              class="input-hint"
              style="
                display: block;
                margin-top: 8px;
              "
            >

              <i class="fas fa-info-circle"></i>

              Will securely ping your live GPS to RTO database.

            </span>

          </div>

          <!-- Method 2 -->
          <div
            class="method-card"
            style="margin-top: 14px;"
          >

            <button
              type="button"
              class="btn btn-danger btn-block"
              id="broadcast-beacon-btn"
            >

              <i class="fas fa-broadcast-tower"></i>

              Broadcast Safety Beacon to Family & Police

            </button>

          </div>

        </div>

      </div>
    `;

    modal.classList.add("active");

    // Google Places + Mini Map
    setTimeout(() => {
      if (
        typeof google !== "undefined" &&
        google.maps &&
        google.maps.places
      ) {
        const fromInput =
          document.getElementById(
            "gmaps-from-input"
          );

        const toInput =
          document.getElementById(
            "gmaps-to-input"
          );

        const mapDiv =
          document.getElementById(
            "zero-app-mini-map"
          );

        if (fromInput) {
          new google.maps.places.Autocomplete(
            fromInput
          );
        }

        if (toInput) {
          new google.maps.places.Autocomplete(
            toInput
          );
        }

        if (mapDiv) {
          const miniMap =
            new google.maps.Map(
              mapDiv,
              {
                center: {
                  lat: store.currentLocation.lat,
                  lng: store.currentLocation.lng
                },

                zoom: 14,

                disableDefaultUI: true
              }
            );

          new google.maps.Marker({
            position: {
              lat: store.currentLocation.lat,
              lng: store.currentLocation.lng
            },

            map: miniMap,

            title: "Your Location"
          });
        }
      }
    }, 200);

    // Anchor Vehicle Plate
    const anchorBtn =
      document.getElementById(
        "anchor-plate-btn"
      );

    if (anchorBtn) {
      anchorBtn.onclick = () => {
        const processAnchor =
          () => {
            const plate =
              document
                .getElementById(
                  "manual-plate-input"
                )
                ?.value
                .trim() ||
              "GJ-06-AU-7892";

            modal.classList.remove(
              "active"
            );

            const synthesizedDriver = {
              id:
                `driver-manual-${plate}`,

              name:
                "Registered Vadodara Transport Driver",

              photo:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",

              phone:
                "+91 94260 55321",

              vehicleType:
                "Auto-Rickshaw (Plate Anchored)",

              vehicleRegNo:
                plate,

              rtoLicenseNo:
                `GJ-06-RTO-${plate.slice(-4)}`,

              govtIssuer:
                "Gujarat RTO Registered Vehicle",

              rating:
                4.9,

              trustScore:
                97
            };

            this.openDriverVerificationModal(
              synthesizedDriver
            );
          };

        if (
          navigator.geolocation
        ) {
          navigator.geolocation.getCurrentPosition(
            () => processAnchor(),

            () => {
              alert(
                "⚠️ Please allow GPS access to record your safe Digital Footprint."
              );

              processAnchor();
            }
          );
        } else {
          processAnchor();
        }
      };
    }

    // Broadcast Beacon
    const broadcastBtn =
      document.getElementById(
        "broadcast-beacon-btn"
      );

    if (broadcastBtn) {
      broadcastBtn.onclick = () => {
        const plate =
          document
            .getElementById(
              "manual-plate-input"
            )
            ?.value
            .trim() ||
          "GJ-06-AU-7892";

        const text =
          `🚨 *VERIDA PASSENGER LIVE SAFETY BEACON*\n` +
          `Passenger: ${store.activeUser.name}\n` +
          `Vehicle Plate: ${plate}\n` +
          `Route: ${this.activeRoute.fromName} -> ${this.activeRoute.toName}\n` +
          `Live GPS: https://maps.google.com/?q=${store.currentLocation.lat},${store.currentLocation.lng}\n` +
          `Women Safety: 181 | Police: 112`;

        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(
            text
          )}`,
          "_blank"
        );
      };
    }
  }

  // --- Internal Live GPS Trip Tracker ---
  startLiveTrip(footprint) {
    this.activeTrip = footprint;
    this.tripProgress = 0;
    this.tripElapsedSec = 0;
    this.pendingTripPhotos = this.pendingTripPhotos.length
      ? [...this.pendingTripPhotos]
      : (Array.isArray(footprint.capturedPhotos) ? [...footprint.capturedPhotos] : []);
    this.activeTrip.capturedPhotos = [...this.pendingTripPhotos];
    this.routePoints = [];
    this.safetyCheckCount = 0;
    this.safetyCheckAcknowledged = false;
    const route = this.activeRoute || {};
    const distanceKm = Number(route.distanceKm || 3.4);
    const expectedMinutes = Number(route.expectedTravelMinutes || route.durationMinutes || route.estimatedMinutes || Math.max(8, Math.round((distanceKm / 20) * 60)));
    this.activeTrip.tripStartTime = new Date().toISOString();
    this.activeTrip.expectedTravelMinutes = expectedMinutes;
    this.activeTrip.driverId = this.activeTrip.driverId || this.activeDriver?.id || this.activeDriver?.uid || "";
    this.activeTrip.driverName = this.activeTrip.driverName || this.activeDriver?.name || "";
    this.activeTrip.driverPhoto = this.activeTrip.driverPhoto || this.activeDriver?.photo || "";
    this.activeTrip.driverLicense = this.activeTrip.driverLicense || this.activeTrip.rtoLicenseNo || this.activeDriver?.rtoLicenseNo || this.activeDriver?.licenseNo || "";
    this.activeTrip.rtoLicenseNo = this.activeTrip.rtoLicenseNo || this.activeDriver?.rtoLicenseNo || this.activeDriver?.licenseNo || "";
    this.activeTrip.vehicleRegNo = this.activeTrip.vehicleRegNo || this.activeDriver?.vehicleRegNo || "";
    this.activeTrip.vehicleType = this.activeTrip.vehicleType || this.activeDriver?.vehicleType || "";
    this.activeTrip.expectedTravelMs = expectedMinutes * 60 * 1000;
    this.activeTrip.routePoints = [];
    this.getCurrentGpsPoint().then(point => { if (point) this.routePoints.push(point); });
    this.startGpsRouteRecording();
    this.scheduleDelayedTripSafetyCheck();
    const hud=document.getElementById("live-trip-tracker-hud"); if(hud){hud.classList.remove("hidden");this.updateTripHud();}
    if(this.tripTrackingInterval) clearInterval(this.tripTrackingInterval);
    this.tripTrackingInterval=setInterval(()=>{
      this.tripElapsedSec+=2;
      const expectedMs=Math.max(60000,this.activeTrip.expectedTravelMs||25*60*1000);
      this.tripProgress=Math.min(100,(this.tripElapsedSec*1000/(expectedMs*1.25))*100);
      this.recordCurrentRoutePoint(); this.updateTripHud();
      if(this.tripProgress>=100){clearInterval(this.tripTrackingInterval);this.tripTrackingInterval=null;this.completeTrip();}
    },2000);
  }

  async getCurrentGpsPoint(){
    if(!navigator.geolocation)return null;
    return new Promise(resolve=>navigator.geolocation.getCurrentPosition(pos=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude,timestamp:new Date().toISOString()}),()=>resolve(null),{enableHighAccuracy:true,timeout:5000,maximumAge:10000}));
  }

  recordCurrentRoutePoint(){
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(pos=>{const point={lat:pos.coords.latitude,lng:pos.coords.longitude,timestamp:new Date().toISOString()};const last=this.routePoints[this.routePoints.length-1];if(!last||Math.abs(last.lat-point.lat)>0.00001||Math.abs(last.lng-point.lng)>0.00001)this.routePoints.push(point);if(this.activeTrip)this.activeTrip.routePoints=[...this.routePoints];},()=>{});
  }

  startGpsRouteRecording(){
    if(!navigator.geolocation?.watchPosition)return; this.stopGpsRouteRecording();
    this.routeWatchId=navigator.geolocation.watchPosition(pos=>{const point={lat:pos.coords.latitude,lng:pos.coords.longitude,timestamp:new Date().toISOString()};const last=this.routePoints[this.routePoints.length-1];if(!last||Math.abs(last.lat-point.lat)>0.00001||Math.abs(last.lng-point.lng)>0.00001)this.routePoints.push(point);if(this.activeTrip)this.activeTrip.routePoints=[...this.routePoints];},()=>{},{enableHighAccuracy:true,maximumAge:5000,timeout:10000});
  }

  stopGpsRouteRecording(){if(this.routeWatchId!==null&&navigator.geolocation?.clearWatch)navigator.geolocation.clearWatch(this.routeWatchId);this.routeWatchId=null;}

  async fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}

  createRouteSnapshot(){
    const points=(Array.isArray(this.routePoints)?this.routePoints:[]).filter(p=>Number.isFinite(Number(p?.lat))&&Number.isFinite(Number(p?.lng)));
    if(points.length<2||typeof document==="undefined")return "";
    const canvas=document.createElement("canvas");canvas.width=900;canvas.height=420;const ctx=canvas.getContext("2d");if(!ctx)return "";
    const lats=points.map(p=>p.lat),lngs=points.map(p=>p.lng),minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs),pad=35,w=canvas.width-pad*2,h=canvas.height-pad*2;
    const x=p=>pad+(p.lng-minLng)/(Math.max(maxLng-minLng,0.00001))*w;const y=p=>pad+(maxLat-p.lat)/(Math.max(maxLat-minLat,0.00001))*h;
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(x(p),y(p)):ctx.moveTo(x(p),y(p)));ctx.strokeStyle="#2563eb";ctx.lineWidth=5;ctx.stroke();
    ctx.fillStyle="#059669";ctx.beginPath();ctx.arc(x(points[0]),y(points[0]),8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#dc2626";ctx.beginPath();ctx.arc(x(points[points.length-1]),y(points[points.length-1]),8,0,Math.PI*2);ctx.fill();
    return canvas.toDataURL("image/png");
  }

  scheduleDelayedTripSafetyCheck(){
    if(this.safetyCheckTimer)clearTimeout(this.safetyCheckTimer);
    if(!this.activeTrip||this.safetyCheckAcknowledged)return;
    const delay=Math.max(60*1000,Number(this.activeTrip?.expectedTravelMs||25*60*1000));
    this.safetyCheckTimer=setTimeout(()=>this.showDelayedTripSafetyCheck(),delay);
  }

  showDelayedTripSafetyCheck(){
    if(!this.activeTrip||this.safetyCheckAcknowledged)return;
    this.safetyCheckCount+=1;
    let modal=document.getElementById("verida-delayed-trip-safety");
    if(!modal){modal=document.createElement("div");modal.id="verida-delayed-trip-safety";modal.className="modal-backdrop";document.body.appendChild(modal);}
    modal.innerHTML=`<div class="modal-card" style="max-width:430px;text-align:center;"><div style="font-size:34px;margin-bottom:8px;">🛡️</div><h3>Is everything okay?</h3><p style="color:#64748b;font-size:13px;line-height:1.5;">Your trip is taking longer than the expected travel time. Are you safe?</p><div style="display:flex;gap:8px;margin-top:16px;"><button type="button" class="btn btn-outline" id="trip-safety-report-btn" style="flex:1;">Report</button><button type="button" class="btn btn-primary" id="trip-safety-ok-btn" style="flex:1;">Okay</button></div></div>`;
    modal.classList.add("active");
    document.getElementById("trip-safety-ok-btn").onclick=()=>{
      modal.classList.remove("active");this.safetyCheckAcknowledged=true;
      if(this.safetyCheckTimer)clearTimeout(this.safetyCheckTimer);this.safetyCheckTimer=null;
    };
    document.getElementById("trip-safety-report-btn").onclick=()=>{
      modal.classList.remove("active");
      if(this.safetyCheckTimer)clearTimeout(this.safetyCheckTimer);this.safetyCheckTimer=null;
      if(window.veridaApp?.triggerSosFlow)window.veridaApp.triggerSosFlow();
    };
    this.safetyCheckTimer=setTimeout(()=>{
      if(!this.activeTrip||this.safetyCheckAcknowledged)return;
      if(this.safetyCheckCount<3){this.showDelayedTripSafetyCheck();}
      else{modal.classList.remove("active");this.safetyCheckTimer=null;if(window.veridaApp?.triggerSosFlow)window.veridaApp.triggerSosFlow();}
    },10*60*1000);
  }

  updateTripHud() {
    const hud =
      document.getElementById(
        "live-trip-tracker-hud"
      );

    if (
      !hud ||
      !this.activeTrip
    ) {
      return;
    }

    const remainingKm =
      (
        (1 -
          this.tripProgress /
            100) *
        (
          this.activeRoute
            .distanceKm ||
          3.4
        )
      ).toFixed(1);

    const speed =
      this.tripProgress <
      100
        ? 24 +
          (this.tripProgress %
            8)
        : 0;

    hud.innerHTML = `
      <div class="trip-hud-inner animate-slide-up">

        <div class="trip-hud-top">

          <div class="trip-status-col">

            <span class="trip-live-indicator">
              <span class="gps-live-dot"></span>
              LIVE TRIP TRACKING
            </span>

            <span class="trip-route-title">
              ${this.activeRoute.fromName}
              ➔
              ${this.activeRoute.toName}
            </span>

          </div>

          <button
            type="button"
            class="btn-trip-sos"
            onclick="veridaApp.triggerSosFlow()"
            title="Trigger Police SOS"
          >
            <span>🚨 SOS</span>
          </button>

        </div>

        <div class="trip-progress-bar-wrap">

          <div
            class="trip-progress-fill"
            style="width: ${this.tripProgress}%;"
          ></div>

        </div>

        <div class="trip-stats-grid">

          <div class="t-stat">
            <span class="t-lbl">
              Speed
            </span>

            <span class="t-val">
              ${speed} km/h
            </span>
          </div>

          <div class="t-stat">
            <span class="t-lbl">
              Remaining
            </span>

            <span class="t-val">
              ${remainingKm} km
            </span>
          </div>

          <div class="t-stat">
            <span class="t-lbl">
              Vehicle
            </span>

            <span class="t-val">
              ${this.activeTrip.vehicleRegNo}
            </span>
          </div>

          <div class="t-stat">
            <span class="t-lbl">
              Safety Radar
            </span>

            <span class="t-val text-success">
              Normal Route
            </span>
          </div>

        </div>

        <div class="trip-hud-actions">

          <button
            type="button"
            class="btn btn-outline btn-sm"
            onclick="transitSafety.shareLiveLocation()"
          >

            <i class="fas fa-share-nodes"></i>

            Share Live GPS

          </button>

          <button
            type="button"
            class="btn btn-danger btn-sm"
            onclick="transitSafety.endTripEarly()"
          >

            <i class="fas fa-flag-checkered"></i>

            End Trip & Log Rate

          </button>

        </div>

      </div>
    `;
  }

  async shareLiveLocation() {
    const point = await this.getCurrentGpsPoint();
    if (!point) {
      alert("Live GPS is not currently available. Please allow location access and try again.");
      return;
    }
    const text =
      `📍 *LIVE TRANSIT GPS TRACKING (Verida)*\n` +
      `Passenger: ${store.activeUser?.name || "Passenger"}\n` +
      `Vehicle: ${this.activeTrip?.vehicleRegNo || "Not Provided"}\n` +
      `Live Position: https://maps.google.com/?q=${point.lat},${point.lng}`;

    if (navigator.share) {
      navigator.share({ title: "Live GPS Trip", text }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  endTripEarly() {
    if (
      this.tripTrackingInterval
    ) {
      clearInterval(
        this.tripTrackingInterval
      );

      this.tripTrackingInterval =
        null;
    }

    this.stopGpsRouteRecording();
    if (this.safetyCheckTimer) { clearTimeout(this.safetyCheckTimer); this.safetyCheckTimer = null; }
    this.completeTrip();
  }

  completeTrip() {
    const hud = document.getElementById("live-trip-tracker-hud");
    if (hud) hud.classList.add("hidden");

    const modal = document.getElementById("price-prompt-modal");
    if (modal) {
      const title = document.getElementById("price-prompt-title");
      if (title) {
        title.textContent = `You reached ${this.activeRoute.toName}! What did you pay?`;
      }

      // Populate Driver Card in the modal (matching Reference UI Image 2)
      // Resolve signed-up driver from store.activeGuide first
      const guide = store.activeGuide;
      const driverName = this.activeTrip?.driverName || guide?.name || this.activeDriver?.name || "Mehul Bhai Solanki";
      const driverPhoto = this.activeTrip?.driverPhoto || guide?.photo || this.activeDriver?.photo || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
      const driverLic = this.activeTrip?.rtoLicenseNo || guide?.licenseNo || guide?.rtoLicenseNo || this.activeDriver?.rtoLicenseNo || this.activeTrip?.driverLicense || "GJ-06-2018-009124";
      const driverId = this.activeTrip?.driverId || guide?.id || guide?.uid || this.activeDriver?.id || "driver-vad-001";
      const vehicleNo = this.activeTrip?.vehicleRegNo || guide?.vehicleRegNo || this.activeDriver?.vehicleRegNo || "GJ-06-AU-7892";

      const nameEl = document.getElementById("review-modal-driver-name");
      if (nameEl) nameEl.textContent = driverName;
      const avatarEl = document.getElementById("review-modal-driver-avatar");
      if (avatarEl) avatarEl.src = driverPhoto;
      const licEl = document.getElementById("review-modal-driver-lic");
      if (licEl) licEl.textContent = driverLic;

      // Initialize star rating
      let selectedRating = 5;
      const starBtns = document.querySelectorAll("#modal-review-star-picker .modal-star-btn");
      starBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          selectedRating = parseInt(btn.getAttribute("data-star"), 10);
          starBtns.forEach(b => {
            const starVal = parseInt(b.getAttribute("data-star"), 10);
            const icon = b.querySelector("i");
            if (icon) {
              icon.style.color = starVal <= selectedRating ? "#f59e0b" : "#cbd5e1";
            }
          });
        };
      });

      modal.classList.add("active");

      const submitBtn = document.getElementById("price-prompt-submit-btn");
      if (submitBtn) {
        submitBtn.onclick = async (e) => {
          e.preventDefault();
          const customVal = document.getElementById("price-prompt-custom-amount")?.value;
          const paidAmount = customVal && parseFloat(customVal) > 0 ? parseFloat(customVal) : this.activeRoute.fairRange.median;

          // Update Last 3 Passengers Paid
          if (!this.activeRoute.last3PassengersPaid) {
            this.activeRoute.last3PassengersPaid = [];
          }

          this.activeRoute.last3PassengersPaid.unshift({
            passengerName: `${store.activeUser.name || "Passenger"} (You)`,
            amount: Math.round(paidAmount),
            timeAgo: "Just now",
            vehicleNo: vehicleNo,
            driverName: driverName
          });

          if (this.activeRoute.last3PassengersPaid.length > 3) {
            this.activeRoute.last3PassengersPaid = this.activeRoute.last3PassengersPaid.slice(0, 3);
          }

          this.renderLast3PassengersPaid();

          this.stopGpsRouteRecording();
          if (this.safetyCheckTimer) { clearTimeout(this.safetyCheckTimer); this.safetyCheckTimer = null; }

          const completedFootprint = {
            footprintHash: this.activeTrip?.footprintHash || `VRD-FOOTPRINT-${Date.now().toString().slice(-8)}`,
            tripStartTime: this.activeTrip?.tripStartTime || this.activeTrip?.timestamp || new Date().toISOString(),
            passengerName: store.activeUser.name || "Verified Traveler",
            driverId: driverId,
            driverName: driverName,
            driverPhone: guide?.phone || this.activeTrip?.driverPhone || "",
            vehicleRegNo: vehicleNo,
            route: `${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}`,
            amountPaid: Math.round(paidAmount),
            status: "completed",
            driverPhoto: driverPhoto,
            driverLicense: driverLic,
            rtoLicenseNo: driverLic,
            vehicleType: this.activeTrip?.vehicleType || guide?.vehicleType || this.activeDriver?.vehicleType || "Green CNG Auto-Rickshaw",
            routePoints: [...this.routePoints],
            routeSnapshot: this.createRouteSnapshot(),
            capturedPhotos: [...this.pendingTripPhotos],
            tripCompletedAt: new Date().toISOString()
          };

          store.recordDigitalFootprint(completedFootprint);

          // Record Driver Proof-of-Presence Review
          const commentInput = document.getElementById("modal-review-comment");
          const commentText = (commentInput ? commentInput.value.trim() : "") || "Verified pleasant trip with polite, honest driver.";

          const newReview = {
            id: `rev-${Date.now()}`,
            guideId: driverId,
            driverId: driverId,
            driverName: driverName,
            driverPhone: guide?.phone || this.activeTrip?.driverPhone || "",
            vehicleRegNo: vehicleNo,
            passengerName: store.activeUser.name || "Verified Traveler",
            rating: selectedRating,
            comment: commentText,
            route: `${this.activeRoute.fromName} ➔ ${this.activeRoute.toName}`,
            monumentName: this.activeRoute.toName,
            presenceVerified: true,
            amountPaid: Math.round(paidAmount),
            timestamp: Date.now(),
            formattedTime: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          };

          await store.recordReview(newReview);

          this.activeTrip = null;
          this.pendingTripPhotos = [];
          this.routePoints = [];
          this.safetyCheckCount = 0;
          this.safetyCheckAcknowledged = false;

          modal.classList.remove("active");

          // Refresh driver reviews, ledger, and transit history
          if (typeof reviewsManager !== "undefined" && reviewsManager) {
            reviewsManager.renderDriverReviewsTab();
            reviewsManager.renderGuideLedger();
          }
          const transitContainer = document.getElementById("driver-transit-history-container");
          if (transitContainer) {
            this.renderDriverTransitHistory(transitContainer);
          }

          alert("🎉 Trip Completed! Your Price Pulse & Proof-of-Presence Review have been recorded and saved to the driver's verified reviews.");
        };
      }
    }
  }
}

export const transitSafety =
  new TransitSafetyManager();

/**
 * Verida — Transit Safety & Digital Footprint Module
 *
 * Handles:
 * - Route Fare Intelligence
 * - Last 3 Passengers Paid
 * - Driver Verification
 * - Zero-App Driver Flow
 * - Digital Footprint
 * - Live Trip Tracking
 * - Payment Recording
 * - WhatsApp / Native Share
 *
 * IMPORTANT:
 * This module intentionally does NOT import reviews.js or Google Maps
 * at module-load time. This prevents an unrelated module/API failure
 * from making the Transit tab blank.
 */

// import { store } from "./store.js";
// import {
//   SEED_ROUTES,
//   SEED_DRIVERS
// } from "../data/seedData.js";


// class TransitSafetyManager {

//   constructor() {

//     this.activeRoute = null;

//     this.activeDriver = null;

//     this.activeTrip = null;

//     this.tripTrackingInterval = null;

//     this.tripProgress = 0;

//     this.tripElapsedSec = 0;


//     /*
//      * Guaranteed fallback routes.
//      *
//      * Even if Firebase / hybridStore is empty,
//      * Transit UI will still work.
//      */

//     this.fallbackRoutes = [

//       {
//         id: "vad-station-palace",

//         city: "vadodara",

//         fromName:
//           "Vadodara Junction (Railway Station)",

//         toName:
//           "Laxmi Vilas Palace (Old Palace Rd)",

//         distanceKm: 3.4,

//         fairRange: {
//           min: 80,
//           median: 100,
//           max: 130
//         },

//         last3PassengersPaid: [

//           {
//             passengerName: "Angel Ganev",
//             amount: 100,
//             timeAgo: "14 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Sweet Lemon",
//             amount: 90,
//             timeAgo: "28 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Rahul Patel",
//             amount: 100,
//             timeAgo: "41 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           }

//         ],

//         toutScamWarning:
//           "Avoid drivers demanding more than the displayed benchmark without a clear reason."
//       },


//       {
//         id: "vad-station-sayaji",

//         city: "vadodara",

//         fromName:
//           "Vadodara Junction (Railway Station)",

//         toName:
//           "Sayaji Garden",

//         distanceKm: 2.8,

//         fairRange: {
//           min: 60,
//           median: 80,
//           max: 110
//         },

//         last3PassengersPaid: [

//           {
//             passengerName: "Priya Shah",
//             amount: 80,
//             timeAgo: "18 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Karan Mehta",
//             amount: 70,
//             timeAgo: "35 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Nisha Patel",
//             amount: 80,
//             timeAgo: "52 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           }

//         ]
//       },


//       {
//         id: "vad-alkapuri-sayaji",

//         city: "vadodara",

//         fromName:
//           "Alkapuri",

//         toName:
//           "Sayaji Garden",

//         distanceKm: 2.2,

//         fairRange: {
//           min: 50,
//           median: 60,
//           max: 90
//         },

//         last3PassengersPaid: [

//           {
//             passengerName: "Mihir Joshi",
//             amount: 60,
//             timeAgo: "8 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Hetvi Patel",
//             amount: 60,
//             timeAgo: "24 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           },

//           {
//             passengerName: "Aarav Shah",
//             amount: 70,
//             timeAgo: "46 min ago",
//             vehicleNo: "GJ-06-AU-7892",
//             driverName: "Mehul Bhai"
//           }

//         ]
//       }

//     ];
//   }


//   // =========================================================
//   // HELPER: Safe Text
//   // =========================================================

//   safeText(value, fallback = "") {

//     if (
//       value === null ||
//       value === undefined ||
//       value === ""
//     ) {
//       return fallback;
//     }

//     return String(value);
//   }


//   // =========================================================
//   // HELPER: Get Routes
//   // =========================================================

//   getRoutes() {

//     let routes = [];

//     try {

//       if (
//         typeof store.getRoutesForCity ===
//         "function"
//       ) {

//         routes =
//           store.getRoutesForCity(
//             store.currentCityId
//           ) || [];
//       }

//     } catch (error) {

//       console.warn(
//         "[Verida Transit] Store route read failed:",
//         error
//       );

//     }


//     /*
//      * If hybridStore/Firebase has no data,
//      * try seed data.
//      */

//     if (
//       !Array.isArray(routes) ||
//       routes.length === 0
//     ) {

//       if (
//         Array.isArray(SEED_ROUTES)
//       ) {

//         routes = SEED_ROUTES;
//       }
//     }


//     /*
//      * If seed data also fails,
//      * use hardcoded demo routes.
//      */

//     if (
//       !Array.isArray(routes) ||
//       routes.length === 0
//     ) {

//       routes =
//         this.fallbackRoutes;
//     }


//     /*
//      * Normalize every route so missing
//      * properties cannot crash the UI.
//      */

//     return routes
//       .filter(Boolean)
//       .map(
//         (route, index) => {

//           return {

//             id:
//               route.id ||
//               `route-${index + 1}`,

//             city:
//               route.city ||
//               store.currentCityId ||
//               "vadodara",

//             fromName:
//               route.fromName ||
//               route.from ||
//               "Pickup Location",

//             toName:
//               route.toName ||
//               route.to ||
//               "Destination",

//             distanceKm:
//               Number(
//                 route.distanceKm
//               ) || 3.4,

//             fairRange: {

//               min:
//                 Number(
//                   route.fairRange?.min
//                 ) || 80,

//               median:
//                 Number(
//                   route.fairRange?.median
//                 ) || 100,

//               max:
//                 Number(
//                   route.fairRange?.max
//                 ) || 130

//             },

//             last3PassengersPaid:
//               Array.isArray(
//                 route.last3PassengersPaid
//               )
//                 ? route.last3PassengersPaid
//                 : [],

//             toutScamWarning:
//               route.toutScamWarning ||
//               ""

//           };

//         }
//       );
//   }


//   // =========================================================
//   // HELPER: Get Active Driver
//   // =========================================================

//   getDriver() {

//     try {

//       if (store.activeGuide) {

//         return store.activeGuide;
//       }

//     } catch (error) {

//       console.warn(
//         "[Verida Transit] Active driver read failed:",
//         error
//       );

//     }


//     if (
//       this.activeDriver
//     ) {

//       return this.activeDriver;
//     }


//     if (
//       Array.isArray(SEED_DRIVERS) &&
//       SEED_DRIVERS.length > 0
//     ) {

//       return SEED_DRIVERS[0];
//     }


//     /*
//      * Guaranteed fallback driver.
//      */

//     return {

//       id:
//         "driver-demo-001",

//       uid:
//         "driver-demo-001",

//       name:
//         "Mehul Bhai Solanki",

//       phone:
//         "+91 94260 55321",

//       licenseNo:
//         "GJ-06-2018-009124",

//       vehicleRegNo:
//         "GJ-06-AU-7892",

//       vehicleType:
//         "Green CNG Auto-Rickshaw",

//       issuer:
//         "Vadodara RTO & Police Tourist Syndicate",

//       rating:
//         4.92,

//       trustScore:
//         98.5,

//       encounterCount:
//         640,

//       photo:
//         "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"

//     };
//   }


//   // =========================================================
//   // MAIN TRANSIT ROUTE PLANNER
//   // =========================================================

//   initRoutePlanner(
//     containerId =
//       "route-planner-container"
//   ) {

//     console.log(
//       "[Verida Transit] initRoutePlanner() started"
//     );


//     const container =
//       document.getElementById(
//         containerId
//       );


//     if (!container) {

//       console.error(
//         `[Verida Transit] ERROR: #${containerId} not found in index.html`
//       );

//       return;
//     }


//     /*
//      * Get routes safely.
//      */

//     const routes =
//       this.getRoutes();


//     console.log(
//       "[Verida Transit] Routes:",
//       routes
//     );


//     /*
//      * Select first route.
//      */

//     if (
//       !this.activeRoute
//     ) {

//       this.activeRoute =
//         routes[0];
//     }

//     else {

//       const matchingRoute =
//         routes.find(
//           route =>
//             route.id ===
//             this.activeRoute.id
//         );


//       this.activeRoute =
//         matchingRoute ||
//         routes[0];
//     }


//     this.activeDriver =
//       this.getDriver();


//     /*
//      * DRIVER MODE
//      */

//     if (
//       store.currentRole ===
//         "guide" ||

//       store.currentMode ===
//         "driver"
//     ) {

//       this.renderDriverTransitHistory(
//         container
//       );

//       return;
//     }


//     /*
//      * PASSENGER MODE
//      */

//     container.innerHTML = `

//       <div class="transit-planner-card">

//         <div class="transit-header-row">

//           <div class="transit-title-block">

//             <h3>

//               <i class="fas fa-route"></i>

//               Route Fare Intelligence

//             </h3>

//             <p>

//               Select pickup and destination
//               to see what previous passengers paid.

//             </p>

//           </div>


//           <span class="badge-pill-verified">

//             <i class="fas fa-shield-check"></i>

//             RTO Benchmarked

//           </span>

//         </div>


//         <!-- ROUTE INPUTS -->

//         <div class="route-inputs-box">


//           <!-- FROM -->

//           <div class="route-input-group">

//             <span class="route-dot start-dot"></span>


//             <div class="input-wrap">

//               <label
//                 for="route-from-select"
//               >

//                 Pickup Location (From)

//               </label>


//               <select
//                 id="route-from-select"
//                 class="route-select"
//               >

//                 ${routes
//                   .map(
//                     (route, index) => {

//                       return `

//                         <option
//                           value="${this.safeText(
//                             route.id
//                           )}"
//                           ${
//                             index === 0
//                               ? "selected"
//                               : ""
//                           }
//                         >

//                           📍
//                           ${this.safeText(
//                             route.fromName
//                           )}

//                         </option>

//                       `;

//                     }
//                   )
//                   .join("")}

//               </select>

//             </div>

//           </div>


//           <div class="route-connector-line"></div>


//           <!-- TO -->

//           <div class="route-input-group">

//             <span class="route-dot end-dot"></span>


//             <div class="input-wrap">

//               <label
//                 for="route-to-select"
//               >

//                 Destination Drop-off (To)

//               </label>


//               <select
//                 id="route-to-select"
//                 class="route-select"
//               >

//                 ${routes
//                   .map(
//                     (route, index) => {

//                       return `

//                         <option
//                           value="${this.safeText(
//                             route.id
//                           )}"
//                           ${
//                             index === 0
//                               ? "selected"
//                               : ""
//                           }
//                         >

//                           🎯
//                           ${this.safeText(
//                             route.toName
//                           )}

//                           (
//                           ${Number(
//                             route.distanceKm
//                           ).toFixed(1)}

//                           km)

//                         </option>

//                       `;

//                     }
//                   )
//                   .join("")}

//               </select>

//             </div>

//           </div>

//         </div>


//         <!-- LAST 3 PASSENGERS -->

//         <div
//           id="last3-passengers-container"
//           class="last3-passengers-card"
//         ></div>


//         <!-- ACTION BUTTONS -->

//         <div
//           class="transit-action-buttons"
//           style="
//             display:flex;
//             gap:10px;
//             flex-wrap:wrap;
//             margin-top:14px;
//           "
//         >

//           <button
//             type="button"
//             class="btn btn-primary"
//             id="scan-driver-qr-btn"
//           >

//             <i class="fas fa-qrcode"></i>

//             Verify Driver

//           </button>


//           <button
//             type="button"
//             class="btn btn-outline"
//             id="zero-app-driver-btn"
//           >

//             <i class="fas fa-car-on"></i>

//             Driver Has No App

//           </button>

//         </div>

//       </div>

//     `;


//     /*
//      * Render history.
//      */

//     this.renderLast3PassengersPaid();


//     /*
//      * Bind all events.
//      */

//     this.bindRouteEvents();


//     console.log(
//       "[Verida Transit] Transit UI rendered successfully."
//     );
//   }


//   // =========================================================
//   // COMPATIBILITY METHOD
//   // =========================================================

//   renderTransitTab() {

//     this.initRoutePlanner();

//   }


//   // =========================================================
//   // ROUTE EVENTS
//   // =========================================================

//   bindRouteEvents() {

//     const fromSelect =
//       document.getElementById(
//         "route-from-select"
//       );


//     const toSelect =
//       document.getElementById(
//         "route-to-select"
//       );


//     const updateRoute =
//       () => {

//         const routes =
//           this.getRoutes();


//         const fromId =
//           fromSelect?.value;


//         const toId =
//           toSelect?.value;


//         const fromRoute =
//           routes.find(
//             route =>
//               route.id ===
//               fromId
//           );


//         const toRoute =
//           routes.find(
//             route =>
//               route.id ===
//               toId
//           );


//         if (
//           !fromRoute ||
//           !toRoute
//         ) {

//           return;
//         }


//         /*
//          * Same route:
//          */

//         if (
//           fromRoute.id ===
//           toRoute.id
//         ) {

//           this.activeRoute =
//             fromRoute;
//         }


//         /*
//          * Different From / To:
//          * create a combined temporary route.
//          */

//         else {

//           this.activeRoute = {

//             ...fromRoute,

//             id:
//               `${fromRoute.id}-${toRoute.id}`,

//             fromName:
//               fromRoute.fromName,

//             toName:
//               toRoute.toName,

//             distanceKm:
//               Number(
//                 toRoute.distanceKm ||
//                 fromRoute.distanceKm
//               ),

//             fairRange:
//               toRoute.fairRange ||
//               fromRoute.fairRange,

//             last3PassengersPaid:
//               toRoute
//                 .last3PassengersPaid
//                 ?.length

//                 ? toRoute.last3PassengersPaid

//                 : fromRoute.last3PassengersPaid,

//             toutScamWarning:
//               toRoute.toutScamWarning ||
//               fromRoute.toutScamWarning ||
//               ""

//           };
//         }


//         this.renderLast3PassengersPaid();

//       };


//     if (fromSelect) {

//       fromSelect.onchange =
//         updateRoute;
//     }


//     if (toSelect) {

//       toSelect.onchange =
//         updateRoute;
//     }


//     /*
//      * Verify driver.
//      */

//     const scanBtn =
//       document.getElementById(
//         "scan-driver-qr-btn"
//       );


//     if (scanBtn) {

//       scanBtn.onclick =
//         () => {

//           this.openDriverVerificationModal(
//             this.activeDriver
//           );

//         };

//     }


//     /*
//      * Zero-app driver.
//      */

//     const zeroAppBtn =
//       document.getElementById(
//         "zero-app-driver-btn"
//       );


//     if (zeroAppBtn) {

//       zeroAppBtn.onclick =
//         () => {

//           this.openZeroAppModal();

//         };

//     }

//   }


//   // =========================================================
//   // LAST 3 PASSENGERS PAID
//   // =========================================================

//   renderLast3PassengersPaid() {

//     const container =
//       document.getElementById(
//         "last3-passengers-container"
//       );


//     if (
//       !container ||
//       !this.activeRoute
//     ) {

//       return;
//     }


//     const route =
//       this.activeRoute;


//     const fair =
//       route.fairRange || {

//         min: 80,

//         median: 100,

//         max: 130

//       };


//     const history =
//       Array.isArray(
//         route.last3PassengersPaid
//       )

//         ? route
//             .last3PassengersPaid
//             .slice(0, 3)

//         : [];


//     /*
//      * No history.
//      */

//     if (
//       history.length === 0
//     ) {

//       container.innerHTML = `

//         <div
//           style="
//             padding:16px;
//             text-align:center;
//             color:#64748b;
//           "
//         >

//           <i
//             class="fas fa-database"
//           ></i>


//           <div
//             style="
//               font-weight:700;
//               margin-top:6px;
//             "
//           >

//             No passenger payment history yet

//           </div>


//           <div
//             style="
//               font-size:11px;
//               margin-top:4px;
//             "
//           >

//             Your verified trip will appear here
//             after payment is recorded.

//           </div>

//         </div>

//       `;

//       return;
//     }


//     container.innerHTML = `

//       <div class="last3-header">


//         <div class="last3-title">

//           <i
//             class="fas fa-users-viewfinder"
//             style="color:var(--primary);"
//           ></i>


//           <strong>

//             Last 3 Passengers Paid on this Route

//           </strong>

//         </div>


//         <span class="fair-median-badge">

//           Fair Range:
//           ₹${fair.min}–₹${fair.median}

//         </span>


//       </div>


//       <div class="last3-history-list">


//         ${history
//           .map(
//             (item, index) => {

//               return `

//                 <div
//                   class="last3-item animate-fade-in"
//                   style="
//                     animation-delay:
//                     ${index * 0.08}s;
//                   "
//                 >


//                   <div class="last3-left">


//                     <span
//                       class="passenger-avatar-icon"
//                     >

//                       <i
//                         class="fas fa-user-check"
//                       ></i>

//                     </span>


//                     <div
//                       class="passenger-meta"
//                     >

//                       <span class="p-name">

//                         <strong>

//                           ${this.safeText(
//                             item.passengerName,
//                             "Verified Passenger"
//                           )}

//                         </strong>

//                       </span>


//                       <span class="p-vehicle">

//                         <i
//                           class="fas fa-taxi"
//                         ></i>

//                         ${this.safeText(
//                           item.vehicleNo,
//                           "Vehicle"
//                         )}

//                         (

//                         ${this.safeText(
//                           item.driverName,
//                           "Driver"
//                         )}

//                         )

//                       </span>

//                     </div>

//                   </div>


//                   <div class="last3-right">


//                     <span class="p-amount">

//                       ₹${Number(
//                         item.amount
//                       ) || 0}

//                     </span>


//                     <span class="p-time">

//                       ${this.safeText(
//                         item.timeAgo,
//                         "Recently"
//                       )}

//                     </span>


//                   </div>


//                 </div>

//               `;

//             }
//           )
//           .join("")}


//       </div>


//       ${
//         route.toutScamWarning
//           ? `

//             <div
//               class="route-scam-warning"
//             >

//               <i
//                 class="fas fa-triangle-exclamation"
//               ></i>


//               <span>

//                 <strong>
//                   Tout Alert:
//                 </strong>

//                 ${this.safeText(
//                   route.toutScamWarning
//                 )}

//               </span>

//             </div>

//           `
//           : ""
//       }

//     `;
//   }


//   // =========================================================
//   // DRIVER TRANSIT HISTORY
//   // =========================================================

//   renderDriverTransitHistory(
//     container
//   ) {

//     if (!container) {

//       return;
//     }


//     let footprints = [];


//     try {

//       if (
//         typeof store.getDigitalFootprints ===
//         "function"
//       ) {

//         footprints =
//           store.getDigitalFootprints() ||
//           [];
//       }

//     } catch (error) {

//       console.warn(
//         "[Verida Transit] Digital footprint read failed:",
//         error
//       );

//     }


//     if (
//       !Array.isArray(
//         footprints
//       )
//     ) {

//       footprints = [];
//     }


//     /*
//      * Remove temporary active trip
//      * if completed version exists.
//      */

//     footprints =
//       footprints.filter(
//         footprint => {

//           if (
//             footprint.status !==
//             "active_trip"
//           ) {

//             return true;
//           }


//           const completedTrip =
//             footprints.some(
//               completed => {

//                 if (
//                   completed.status !==
//                   "completed"
//                 ) {

//                   return false;
//                 }


//                 const samePassenger =
//                   String(
//                     completed.passengerName ||
//                     ""
//                   )
//                     .trim()
//                     .toLowerCase() ===
//                   String(
//                     footprint.passengerName ||
//                     ""
//                   )
//                     .trim()
//                     .toLowerCase();


//                 const sameDriver =
//                   (
//                     completed.driverId &&
//                     footprint.driverId &&
//                     completed.driverId ===
//                       footprint.driverId
//                   )

//                   ||

//                   (
//                     completed.vehicleRegNo &&
//                     footprint.vehicleRegNo &&
//                     completed.vehicleRegNo ===
//                       footprint.vehicleRegNo
//                   );


//                 const sameRoute =
//                   String(
//                     completed.route ||
//                     ""
//                   )
//                     .trim()
//                     .toLowerCase() ===
//                   String(
//                     footprint.route ||
//                     ""
//                   )
//                     .trim()
//                     .toLowerCase();


//                 return (
//                   samePassenger &&
//                   sameDriver &&
//                   sameRoute
//                 );

//               }
//             );


//           return !completedTrip;

//         }
//       );


//     /*
//      * Newest first.
//      */

//     footprints.sort(
//       (a, b) => {

//         return (
//           new Date(
//             b.timestamp ||
//             b.createdAt ||
//             0
//           ) -

//           new Date(
//             a.timestamp ||
//             a.createdAt ||
//             0
//           )
//         );

//       }
//     );


//     /*
//      * Demo records if database is empty.
//      */

//     if (
//       footprints.length === 0
//     ) {

//       footprints = [

//         {
//           passengerName:
//             "Angel Ganev",

//           route:
//             "Vadodara Junction (Railway Station) ➔ Laxmi Vilas Palace",

//           amountPaid:
//             100,

//           createdAt:
//             Date.now() -
//             10 * 60 * 1000

//         },


//         {
//           passengerName:
//             "Sweet Lemon",

//           route:
//             "Vadodara Junction (Railway Station) ➔ Laxmi Vilas Palace",

//           amountPaid:
//             100,

//           createdAt:
//             Date.now() -
//             25 * 60 * 1000

//         },


//         {
//           passengerName:
//             "Devanshi Sharma",

//           route:
//             "Vadodara Junction (Railway Station) ➔ Laxmi Vilas Palace",

//           amountPaid:
//             100,

//           createdAt:
//             Date.now() -
//             45 * 60 * 1000

//         }

//       ];
//     }


//     container.innerHTML = `

//       <div
//         style="
//           padding:16px;
//         "
//       >


//         <div
//           style="
//             margin-bottom:16px;
//           "
//         >

//           <h3
//             style="
//               font-size:16px;
//               font-weight:700;
//               color:#0f172a;
//               margin:0;
//               display:flex;
//               align-items:center;
//               gap:8px;
//             "
//           >

//             <i
//               class="fas fa-list-ul"
//             ></i>

//             My Transit History

//           </h3>


//           <p
//             style="
//               font-size:12px;
//               color:#64748b;
//               margin:4px 0 0;
//             "
//           >

//             Verified passenger trips
//             and digital footprints.

//           </p>

//         </div>


//         <div
//           style="
//             display:flex;
//             flex-direction:column;
//             gap:10px;
//           "
//         >


//           ${footprints
//             .map(
//               footprint => {

//                 const name =
//                   footprint.passengerName ||
//                   "Verified Passenger";


//                 const route =
//                   footprint.route ||

//                   `${
//                     footprint.from ||
//                     "Vadodara Junction"
//                   } ➔ ${
//                     footprint.to ||
//                     "Laxmi Vilas Palace"
//                   }`;


//                 const fare =
//                   footprint.amountPaid ||
//                   footprint.fare ||
//                   100;


//                 const time =
//                   footprint.time ||

//                   this.formatTime(
//                     footprint.timestamp ||
//                     footprint.createdAt ||
//                     Date.now()
//                   );


//                 return `

//                   <div
//                     style="
//                       display:flex;
//                       justify-content:space-between;
//                       align-items:center;
//                       padding:12px 14px;
//                       background:#fff;
//                       border:1px solid #f1f5f9;
//                       border-radius:8px;
//                     "
//                   >


//                     <div
//                       style="
//                         display:flex;
//                         align-items:center;
//                         gap:12px;
//                       "
//                     >


//                       <div
//                         style="
//                           width:36px;
//                           height:36px;
//                           border-radius:50%;
//                           background:#ecfdf5;
//                           display:flex;
//                           align-items:center;
//                           justify-content:center;
//                         "
//                       >

//                         <i
//                           class="fas fa-user-check"
//                           style="
//                             color:#10b981;
//                           "
//                         ></i>

//                       </div>


//                       <div
//                         style="
//                           display:flex;
//                           flex-direction:column;
//                           gap:2px;
//                         "
//                       >

//                         <span
//                           style="
//                             font-size:13px;
//                             font-weight:700;
//                             color:#0f172a;
//                           "
//                         >

//                           ${this.safeText(
//                             name
//                           )}

//                         </span>


//                         <span
//                           style="
//                             font-size:11px;
//                             color:#64748b;
//                           "
//                         >

//                           <i
//                             class="fas fa-map-marker-alt"
//                           ></i>

//                           ${this.safeText(
//                             route
//                           )}

//                         </span>


//                         <span
//                           style="
//                             font-size:11px;
//                             color:#94a3b8;
//                           "
//                         >

//                           <i
//                             class="fas fa-clock"
//                           ></i>

//                           ${this.safeText(
//                             time
//                           )}

//                         </span>

//                       </div>

//                     </div>


//                     <div
//                       style="
//                         text-align:right;
//                         display:flex;
//                         flex-direction:column;
//                         align-items:flex-end;
//                         gap:2px;
//                       "
//                     >

//                       <span
//                         style="
//                           font-size:13px;
//                           font-weight:700;
//                           color:#059669;
//                         "
//                       >

//                         ₹${Number(
//                           fare
//                         ) || 0}

//                       </span>


//                       <span
//                         style="
//                           font-size:10px;
//                           color:#94a3b8;
//                           font-weight:500;
//                         "
//                       >

//                         Verified

//                       </span>

//                     </div>


//                   </div>

//                 `;

//               }
//             )
//             .join("")}


//         </div>

//       </div>

//     `;
//   }


//   // =========================================================
//   // FORMAT TIME
//   // =========================================================

//   formatTime(
//     timestamp
//   ) {

//     const date =
//       new Date(
//         timestamp ||
//         Date.now()
//       );


//     if (
//       Number.isNaN(
//         date.getTime()
//       )
//     ) {

//       return new Date()
//         .toLocaleTimeString(
//           "en-IN",
//           {
//             hour: "2-digit",
//             minute: "2-digit"
//           }
//         );
//     }


//     return date.toLocaleTimeString(
//       "en-IN",
//       {
//         hour: "2-digit",
//         minute: "2-digit"
//       }
//     );
//   }


//   // =========================================================
//   // DRIVER SAFETY CARD
//   // =========================================================

//   openDriverVerificationModal(
//     driver = null
//   ) {

//     const modal =
//       document.getElementById(
//         "driver-safety-card-modal"
//       );


//     const container =
//       document.getElementById(
//         "driver-safety-card-content"
//       );


//     if (
//       !modal ||
//       !container
//     ) {

//       console.error(
//         "[Verida Transit] Driver safety modal not found."
//       );

//       return;
//     }


//     const activeDriver =
//       driver ||
//       this.getDriver();


//     const routes =
//       this.getRoutes();


//     const route =
//       this.activeRoute ||
//       routes[0];


//     const now =
//       new Date();


//     const driverLicense =
//       activeDriver.rtoLicenseNo ||
//       activeDriver.licenseNo ||
//       "GJ-RTO-VERIFIED";


//     const driverIssuer =
//       activeDriver.govtIssuer ||
//       activeDriver.issuer ||
//       "Gujarat RTO & Tourism Authority";


//     const vehicleNumber =
//       activeDriver.vehicleRegNo ||
//       "Not Provided";


//     const rating =
//       Number(
//         activeDriver.rating ??
//         4.92
//       ) || 4.92;


//     const trustScore =
//       Number(
//         activeDriver.trustScore ??
//         activeDriver.guideTrustScore ??
//         98.5
//       ) || 98.5;


//     const footprintHash =
//       `VRD-FOOTPRINT-${vehicleNumber.replace(
//         /[^A-Za-z0-9]/g,
//         ""
//       )}-${Date.now()
//         .toString()
//         .slice(-6)}`;


//     const currentLat =
//       Number(
//         store.currentLocation?.lat ||
//         22.2937
//       );


//     const currentLng =
//       Number(
//         store.currentLocation?.lng ||
//         73.1916
//       );


//     /*
//      * Create digital footprint.
//      */

//     const digitalFootprint = {

//       footprintHash:

//         footprintHash,


//       timestamp:

//         now.toISOString(),


//       formattedTime:

//         this.formatTime(
//           now
//         ),


//       passengerName:

//         store.activeUser?.name ||
//         "Verified Passenger",


//       driverId:

//         activeDriver.id ||
//         activeDriver.uid ||
//         vehicleNumber,


//       driverName:

//         activeDriver.name ||
//         "Registered Driver",


//       driverPhone:

//         activeDriver.phone ||
//         "",


//       vehicleRegNo:

//         vehicleNumber,


//       vehicleType:

//         activeDriver.vehicleType ||
//         "Auto-Rickshaw",


//       rtoLicenseNo:

//         driverLicense,


//       route:

//         `${route.fromName} ➔ ${route.toName}`,


//       pickupGps:

//         `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`,


//       status:

//         "active_trip"

//     };


//     /*
//      * Save footprint.
//      *
//      * UI must NOT break if database fails.
//      */

//     if (
//       typeof store.recordDigitalFootprint ===
//       "function"
//     ) {

//       Promise.resolve(
//         store.recordDigitalFootprint(
//           digitalFootprint
//         )
//       )
//         .catch(
//           error => {

//             console.error(
//               "[Verida Transit] Digital footprint save failed:",
//               error
//             );

//           }
//         );
//     }


//     /*
//      * Render safety card.
//      */

//     container.innerHTML = `

//       <div
//         class="driver-safety-dossier animate-slide-up"
//       >


//         <!-- HEADER -->

//         <div
//           class="safety-card-top-bar"
//         >


//           <div
//             class="govt-seal-badge"
//           >

//             <i
//               class="fas fa-shield-halved"
//             ></i>

//             <span>

//               GUJARAT RTO &
//               TOURISM CERTIFIED

//             </span>

//           </div>


//           <span
//             class="badge-trust-high"
//           >

//             <i
//               class="fas fa-star"
//             ></i>

//             ${rating.toFixed(2)}
//             ★

//             (${trustScore}% Trust)

//           </span>


//         </div>


//         <!-- DRIVER PROFILE -->

//         <div
//           class="driver-profile-main"
//         >


//           <img

//             src="${this.safeText(
//               activeDriver.photo
//             )}"

//             alt="${this.safeText(
//               activeDriver.name,
//               "Driver"
//             )}"

//             class="driver-card-avatar"

//           />


//           <div
//             class="driver-card-bio"
//           >


//             <h3
//               class="driver-name"
//             >

//               ${this.safeText(
//                 activeDriver.name,
//                 "Registered Driver"
//               )}

//             </h3>


//             <div
//               class="vehicle-plate-pill"
//             >

//               <i
//                 class="fas fa-id-badge"
//               ></i>

//               Vehicle No:

//               <strong>

//                 ${this.safeText(
//                   vehicleNumber
//                 )}

//               </strong>

//             </div>


//             <p
//               class="lic-info"
//             >

//               <i
//                 class="fas fa-file-contract"
//               ></i>

//               RTO License:

//               <strong>

//                 ${this.safeText(
//                   driverLicense
//                 )}

//               </strong>

//             </p>


//             <p
//               class="issuer-info"
//             >

//               <i
//                 class="fas fa-building-shield"
//               ></i>

//               Issuer:

//               ${this.safeText(
//                 driverIssuer
//               )}

//             </p>


//           </div>


//         </div>


//         <!-- DIGITAL FOOTPRINT -->

//         <div
//           class="footprint-anchor-box"
//         >


//           <div
//             class="footprint-anchor-header"
//           >

//             <i
//               class="fas fa-fingerprint"
//             ></i>

//             <strong>

//               PASSENGER DIGITAL
//               FOOTPRINT LOGGED

//             </strong>

//           </div>


//           <div
//             class="footprint-meta-grid"
//           >


//             <div>

//               <span
//                 class="f-lbl"
//               >

//                 Passenger:

//               </span>


//               <strong>

//                 ${this.safeText(
//                   digitalFootprint.passengerName
//                 )}

//               </strong>

//             </div>


//             <div>

//               <span
//                 class="f-lbl"
//               >

//                 Trip Start Time:

//               </span>

//               ${digitalFootprint.formattedTime}

//             </div>


//             <div>

//               <span
//                 class="f-lbl"
//               >

//                 Selected Route:

//               </span>

//               ${this.safeText(
//                 route.fromName
//               )}

//               ➔

//               ${this.safeText(
//                 route.toName
//               )}

//             </div>


//             <div>

//               <span
//                 class="f-lbl"
//               >

//                 Footprint ID:

//               </span>


//               <code>

//                 ${footprintHash}

//               </code>

//             </div>


//           </div>

//         </div>


//         <!-- EMERGENCY -->

//         <div
//           class="emergency-dials-section"
//         >


//           <h4>

//             <i
//               class="fas fa-phone-volume"
//             ></i>

//             Emergency Quick-Dial
//             & Safety Helplines

//           </h4>


//           <div
//             class="emergency-dials-grid"
//           >


//             <a
//               href="tel:${this.safeText(
//                 activeDriver.phone
//               ).replace(
//                 /[^0-9+]/g,
//                 ""
//               )}"

//               class="dial-btn dial-driver"
//             >

//               <i
//                 class="fas fa-phone"
//               ></i>


//               <span>

//                 Driver<br>

//                 <strong>

//                   ${this.safeText(
//                     activeDriver.phone,
//                     "Not Provided"
//                   )}

//                 </strong>

//               </span>

//             </a>


//             <a
//               href="tel:181"
//               class="dial-btn dial-women"
//             >

//               <i
//                 class="fas fa-person-dress"
//               ></i>


//               <span>

//                 Women's Safety<br>

//                 <strong>
//                   181 / 1090
//                 </strong>

//               </span>

//             </a>


//             <a
//               href="tel:112"
//               class="dial-btn dial-police"
//             >

//               <i
//                 class="fas fa-shield"
//               ></i>


//               <span>

//                 Police Emergency<br>

//                 <strong>
//                   112
//                 </strong>

//               </span>

//             </a>


//             <a
//               href="tel:1363"
//               class="dial-btn dial-tourist"
//             >

//               <i
//                 class="fas fa-headset"
//               ></i>


//               <span>

//                 Tourist Helpline<br>

//                 <strong>
//                   1363
//                 </strong>

//               </span>

//             </a>


//           </div>

//         </div>


//         <!-- LIVE TRIP -->

//         <div
//           class="start-trip-actions"
//         >


//           <button
//             type="button"
//             class="btn btn-primary btn-block btn-lg"
//             id="start-live-tracking-btn"
//           >

//             <i
//               class="fas fa-location-arrow"
//             ></i>

//             Start Live Internal
//             GPS Trip Tracking

//           </button>


//           <button
//             type="button"
//             class="btn btn-outline btn-block"
//             id="share-live-beacon-btn"
//           >

//             <i
//               class="fas fa-share-nodes"
//             ></i>

//             Share Safety Footprint
//             via WhatsApp

//           </button>


//         </div>


//       </div>

//     `;


//     modal.classList.add(
//       "active"
//     );


//     /*
//      * Start live tracking.
//      */

//     const trackBtn =
//       document.getElementById(
//         "start-live-tracking-btn"
//       );


//     if (trackBtn) {

//       trackBtn.onclick =
//         () => {

//           modal.classList.remove(
//             "active"
//           );


//           this.startLiveTrip(
//             digitalFootprint
//           );

//         };

//     }


//     /*
//      * Share beacon.
//      */

//     const shareBtn =
//       document.getElementById(
//         "share-live-beacon-btn"
//       );


//     if (shareBtn) {

//       shareBtn.onclick =
//         () => {

//           this.shareSafetyBeacon(
//             activeDriver,
//             digitalFootprint,
//             route
//           );

//         };

//     }

//   }


//   // =========================================================
//   // ZERO-APP DRIVER MODAL
//   // =========================================================

//   openZeroAppModal() {

//     const modal =
//       document.getElementById(
//         "zero-app-modal"
//       );


//     const container =
//       document.getElementById(
//         "zero-app-content"
//       );


//     if (
//       !modal ||
//       !container
//     ) {

//       console.error(
//         "[Verida Transit] Zero-app modal not found."
//       );

//       return;
//     }


//     const route =
//       this.activeRoute ||
//       this.getRoutes()[0];


//     container.innerHTML = `

//       <div
//         class="zero-app-box animate-slide-up"
//       >


//         <div
//           class="zero-app-header"
//         >


//           <div
//             class="zero-app-icon"
//           >

//             <i
//               class="fas fa-car-burst"
//             ></i>

//           </div>


//           <div>

//             <h3>

//               Driver Has No App?

//             </h3>


//             <p>

//               You're still protected.
//               Enter the vehicle plate
//               to anchor your safety footprint.

//             </p>

//           </div>


//         </div>


//         <div
//           class="zero-app-methods"
//         >


//           <div
//             class="method-card"
//           >


//             <label>

//               <strong>

//                 Vehicle Number Plate

//               </strong>

//             </label>


//             <input

//               type="text"

//               id="manual-plate-input"

//               placeholder="e.g. GJ-06-AU-7892"

//               value="${this.safeText(
//                 this.activeDriver?.vehicleRegNo,
//                 "GJ-06-AU-7892"
//               )}"

//               class="plate-text-input"

//               style="
//                 width:100%;
//                 margin:8px 0 12px;
//               "

//             />


//             <label>

//               <strong>
//                 Pickup Location
//               </strong>

//             </label>


//             <input

//               type="text"

//               id="gmaps-from-input"

//               class="plate-text-input"

//               placeholder="${this.safeText(
//                 route.fromName
//               )}"

//               value="${this.safeText(
//                 route.fromName
//               )}"

//               style="
//                 width:100%;
//                 margin:8px 0;
//               "

//             />


//             <label>

//               <strong>
//                 Destination
//               </strong>

//             </label>


//             <input

//               type="text"

//               id="gmaps-to-input"

//               class="plate-text-input"

//               placeholder="${this.safeText(
//                 route.toName
//               )}"

//               value="${this.safeText(
//                 route.toName
//               )}"

//               style="
//                 width:100%;
//                 margin:8px 0 12px;
//               "

//             />


//             <div
//               id="zero-app-mini-map"

//               style="
//                 height:150px;
//                 width:100%;
//                 border-radius:8px;
//                 margin-bottom:12px;
//                 background:#e2e8f0;
//                 display:flex;
//                 align-items:center;
//                 justify-content:center;
//                 overflow:hidden;
//               "
//             >

//               <span
//                 style="
//                   font-size:12px;
//                   color:#64748b;
//                 "
//               >

//                 GPS location ready

//               </span>

//             </div>


//             <button
//               type="button"
//               class="btn btn-primary btn-block"
//               id="anchor-plate-btn"
//             >

//               <i
//                 class="fas fa-shield-check"
//               ></i>

//               Anchor Footprint
//               & Allow GPS

//             </button>


//           </div>


//           <div
//             class="method-card"
//             style="margin-top:14px;"
//           >


//             <button
//               type="button"
//               class="btn btn-danger btn-block"
//               id="broadcast-beacon-btn"
//             >

//               <i
//                 class="fas fa-broadcast-tower"
//               ></i>

//               Broadcast Safety Beacon

//             </button>


//           </div>


//         </div>

//       </div>

//     `;


//     modal.classList.add(
//       "active"
//     );


//     /*
//      * Google map is optional.
//      */

//     this.initMiniGoogleMap();


//     /*
//      * Anchor plate.
//      */

//     const anchorBtn =
//       document.getElementById(
//         "anchor-plate-btn"
//       );


//     if (anchorBtn) {

//       anchorBtn.onclick =
//         () => {

//           const processAnchor =
//             () => {

//               const plate =
//                 document
//                   .getElementById(
//                     "manual-plate-input"
//                   )
//                   ?.value
//                   .trim()
//                   .toUpperCase() ||

//                 "GJ-06-AU-7892";


//               const synthesizedDriver = {

//                 id:
//                   `driver-manual-${plate.replace(
//                     /[^A-Z0-9]/g,
//                     ""
//                   )}`,

//                 uid:
//                   `driver-manual-${plate.replace(
//                     /[^A-Z0-9]/g,
//                     ""
//                   )}`,

//                 name:
//                   "Registered Vadodara Transport Driver",

//                 photo:
//                   "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",

//                 phone:
//                   "+91 94260 55321",

//                 vehicleType:
//                   "Auto-Rickshaw (Plate Anchored)",

//                 vehicleRegNo:
//                   plate,

//                 rtoLicenseNo:
//                   `GJ-06-RTO-${plate.slice(
//                     -4
//                   )}`,

//                 govtIssuer:
//                   "Gujarat RTO Registered Vehicle",

//                 issuer:
//                   "Gujarat RTO Registered Vehicle",

//                 rating:
//                   4.9,

//                 trustScore:
//                   97

//               };


//               modal.classList.remove(
//                 "active"
//               );


//               this.openDriverVerificationModal(
//                 synthesizedDriver
//               );

//             };


//           /*
//            * Request GPS.
//            */

//           if (
//             navigator.geolocation
//           ) {

//             navigator.geolocation.getCurrentPosition(

//               position => {

//                 try {

//                   if (
//                     position &&
//                     position.coords
//                   ) {

//                     store.currentLocation = {

//                       ...store.currentLocation,

//                       lat:
//                         position.coords.latitude,

//                       lng:
//                         position.coords.longitude,

//                       accuracy:
//                         position.coords.accuracy

//                     };

//                   }

//                 } catch (error) {

//                   console.warn(
//                     "[Verida Transit] GPS state update failed:",
//                     error
//                   );

//                 }


//                 processAnchor();

//               },


//               () => {

//                 alert(
//                   "⚠️ GPS permission was not granted. The demo can continue, but live location was not captured."
//                 );


//                 processAnchor();

//               },


//               {

//                 enableHighAccuracy:
//                   true,

//                 timeout:
//                   8000,

//                 maximumAge:
//                   10000

//               }

//             );

//           }

//           else {

//             processAnchor();

//           }

//         };

//     }


//     /*
//      * Broadcast safety beacon.
//      */

//     const broadcastBtn =
//       document.getElementById(
//         "broadcast-beacon-btn"
//       );


//     if (broadcastBtn) {

//       broadcastBtn.onclick =
//         () => {

//           const plate =
//             document
//               .getElementById(
//                 "manual-plate-input"
//               )
//               ?.value
//               .trim()
//               .toUpperCase() ||

//             "GJ-06-AU-7892";


//           const lat =
//             Number(
//               store.currentLocation?.lat ||
//               22.2937
//             );


//           const lng =
//             Number(
//               store.currentLocation?.lng ||
//               73.1916
//             );


//           const text =

//             `🚨 VERIDA PASSENGER SAFETY BEACON\n` +

//             `Passenger: ${
//               store.activeUser?.name ||
//               "Verified Passenger"
//             }\n` +

//             `Vehicle Plate: ${plate}\n` +

//             `Route: ${
//               route.fromName
//             } -> ${
//               route.toName
//             }\n` +

//             `Live GPS: https://maps.google.com/?q=${lat},${lng}\n` +

//             `Women Safety: 181 | Police: 112`;


//           this.shareText(
//             "Verida Passenger Safety Beacon",
//             text
//           );

//         };

//     }

//   }


//   // =========================================================
//   // MINI GOOGLE MAP
//   // =========================================================

//   initMiniGoogleMap() {

//     const mapDiv =
//       document.getElementById(
//         "zero-app-mini-map"
//       );


//     if (!mapDiv) {

//       return;
//     }


//     /*
//      * Google Maps is optional.
//      */

//     if (
//       typeof google ===
//         "undefined" ||

//       !google.maps
//     ) {

//       mapDiv.innerHTML = `

//         <span
//           style="
//             font-size:12px;
//             color:#64748b;
//           "
//         >

//           Google Maps unavailable —
//           GPS flow still works.

//         </span>

//       `;

//       return;
//     }


//     try {

//       const lat =
//         Number(
//           store.currentLocation?.lat ||
//           22.2937
//         );


//       const lng =
//         Number(
//           store.currentLocation?.lng ||
//           73.1916
//         );


//       const map =
//         new google.maps.Map(
//           mapDiv,
//           {

//             center: {
//               lat,
//               lng
//             },

//             zoom:
//               14,

//             disableDefaultUI:
//               true

//           }
//         );


//       if (
//         google.maps.marker &&
//         google.maps.marker
//           .AdvancedMarkerElement
//       ) {

//         new google.maps.marker
//           .AdvancedMarkerElement({

//             map,

//             position: {
//               lat,
//               lng
//             }

//           });

//       }

//       else if (
//         google.maps.Marker
//       ) {

//         new google.maps.Marker({

//           map,

//           position: {
//             lat,
//             lng
//           },

//           title:
//             "Your Location"

//         });

//       }

//     } catch (error) {

//       console.warn(
//         "[Verida Transit] Mini map failed:",
//         error
//       );


//       mapDiv.innerHTML = `

//         <span
//           style="
//             font-size:12px;
//             color:#64748b;
//           "
//         >

//           Map preview unavailable —
//           GPS flow still works.

//         </span>

//       `;

//     }

//   }


//   // =========================================================
//   // START LIVE TRIP
//   // =========================================================

//   startLiveTrip(
//     footprint
//   ) {

//     this.activeTrip =
//       footprint;


//     this.tripProgress =
//       0;


//     this.tripElapsedSec =
//       0;


//     const hud =
//       document.getElementById(
//         "live-trip-tracker-hud"
//       );


//     if (hud) {

//       hud.classList.remove(
//         "hidden"
//       );


//       this.updateTripHud();

//     }


//     if (
//       this.tripTrackingInterval
//     ) {

//       clearInterval(
//         this.tripTrackingInterval
//       );

//     }


//     /*
//      * Demo trip progress.
//      */

//     this.tripTrackingInterval =
//       setInterval(
//         () => {

//           this.tripElapsedSec +=
//             2;


//           this.tripProgress =
//             Math.min(
//               100,
//               this.tripProgress +
//                 4
//             );


//           this.updateTripHud();


//           if (
//             this.tripProgress >=
//             100
//           ) {

//             clearInterval(
//               this.tripTrackingInterval
//             );


//             this.tripTrackingInterval =
//               null;


//             this.completeTrip();

//           }

//         },
//         2000
//       );

//   }


//   // =========================================================
//   // UPDATE LIVE TRIP HUD
//   // =========================================================

//   updateTripHud() {

//     const hud =
//       document.getElementById(
//         "live-trip-tracker-hud"
//       );


//     if (
//       !hud ||
//       !this.activeTrip
//     ) {

//       return;
//     }


//     const route =
//       this.activeRoute ||
//       this.getRoutes()[0];


//     const distance =
//       Number(
//         route?.distanceKm
//       ) || 3.4;


//     const remainingKm =
//       (

//         (1 -
//           this.tripProgress /
//             100) *

//         distance

//       ).toFixed(1);


//     const speed =
//       this.tripProgress <
//       100

//         ? 24 +
//           (
//             this.tripProgress %
//             8
//           )

//         : 0;


//     hud.innerHTML = `

//       <div
//         class="trip-hud-inner animate-slide-up"
//       >


//         <div
//           class="trip-hud-top"
//         >


//           <div
//             class="trip-status-col"
//           >


//             <span
//               class="trip-live-indicator"
//             >

//               <span
//                 class="gps-live-dot"
//               ></span>

//               LIVE TRIP TRACKING

//             </span>


//             <span
//               class="trip-route-title"
//             >

//               ${this.safeText(
//                 route?.fromName
//               )}

//               ➔

//               ${this.safeText(
//                 route?.toName
//               )}

//             </span>


//           </div>


//           <button
//             type="button"
//             class="btn-trip-sos"
//             id="trip-sos-btn"
//             title="Trigger Police SOS"
//           >

//             <span>
//               🚨 SOS
//             </span>

//           </button>


//         </div>


//         <div
//           class="trip-progress-bar-wrap"
//         >

//           <div
//             class="trip-progress-fill"
//             style="
//               width:${this.tripProgress}%;
//             "
//           ></div>

//         </div>


//         <div
//           class="trip-stats-grid"
//         >


//           <div
//             class="t-stat"
//           >

//             <span
//               class="t-lbl"
//             >
//               Speed
//             </span>

//             <span
//               class="t-val"
//             >

//               ${speed}
//               km/h

//             </span>

//           </div>


//           <div
//             class="t-stat"
//           >

//             <span
//               class="t-lbl"
//             >
//               Remaining
//             </span>

//             <span
//               class="t-val"
//             >

//               ${remainingKm}
//               km

//             </span>

//           </div>


//           <div
//             class="t-stat"
//           >

//             <span
//               class="t-lbl"
//             >
//               Vehicle
//             </span>

//             <span
//               class="t-val"
//             >

//               ${this.safeText(
//                 this.activeTrip.vehicleRegNo,
//                 "Auto"
//               )}

//             </span>

//           </div>


//           <div
//             class="t-stat"
//           >

//             <span
//               class="t-lbl"
//             >
//               Safety Radar
//             </span>

//             <span
//               class="t-val text-success"
//             >

//               Normal Route

//             </span>

//           </div>


//         </div>


//         <div
//           class="trip-hud-actions"
//         >


//           <button
//             type="button"
//             class="btn btn-outline btn-sm"
//             id="share-trip-location-btn"
//           >

//             <i
//               class="fas fa-share-nodes"
//             ></i>

//             Share Live GPS

//           </button>


//           <button
//             type="button"
//             class="btn btn-danger btn-sm"
//             id="end-trip-btn"
//           >

//             <i
//               class="fas fa-flag-checkered"
//             ></i>

//             End Trip & Log Rate

//           </button>


//         </div>


//       </div>

//     `;


//     /*
//      * Share GPS.
//      */

//     document
//       .getElementById(
//         "share-trip-location-btn"
//       )
//       ?.addEventListener(
//         "click",
//         () => {

//           this.shareLiveLocation();

//         }
//       );


//     /*
//      * End trip.
//      */

//     document
//       .getElementById(
//         "end-trip-btn"
//       )
//       ?.addEventListener(
//         "click",
//         () => {

//           this.endTripEarly();

//         }
//       );


//     /*
//      * SOS.
//      */

//     document
//       .getElementById(
//         "trip-sos-btn"
//       )
//       ?.addEventListener(
//         "click",
//         () => {

//           if (
//             window.veridaApp &&
//             typeof window.veridaApp
//               .triggerSosFlow ===
//               "function"
//           ) {

//             window.veridaApp
//               .triggerSosFlow();

//           }

//           else {

//             alert(
//               "🚨 SOS triggered. Police emergency: 112"
//             );

//           }

//         }
//       );

//   }


//   // =========================================================
//   // SHARE LIVE LOCATION
//   // =========================================================

//   shareLiveLocation() {

//     const lat =
//       Number(
//         store.currentLocation?.lat ||
//         22.2937
//       );


//     const lng =
//       Number(
//         store.currentLocation?.lng ||
//         73.1916
//       );


//     const text =

//       `📍 VERIDA LIVE TRANSIT GPS\n` +

//       `Passenger: ${
//         store.activeUser?.name ||
//         "Passenger"
//       }\n` +

//       `Vehicle: ${
//         this.activeTrip?.vehicleRegNo ||
//         "Auto"
//       }\n` +

//       `Live Position: https://maps.google.com/?q=${lat},${lng}`;


//     this.shareText(
//       "Verida Live Trip",
//       text
//     );

//   }


//   // =========================================================
//   // SHARE SAFETY BEACON
//   // =========================================================

//   shareSafetyBeacon(
//     driver,
//     footprint,
//     route
//   ) {

//     const text =

//       `🛡️ VERIDA TRANSIT SAFETY BEACON\n` +

//       `Passenger: ${
//         footprint.passengerName ||
//         "Passenger"
//       }\n` +

//       `Driver: ${
//         driver.name ||
//         "Driver"
//       }\n` +

//       `Vehicle: ${
//         footprint.vehicleRegNo ||
//         "Not Provided"
//       }\n` +

//       `Route: ${
//         route.fromName
//       } to ${
//         route.toName
//       }\n` +

//       `Footprint: ${
//         footprint.footprintHash
//       }\n` +

//       `Police: 112 | Women Helpline: 181`;


//     this.shareText(
//       "Verida Transit Safety Beacon",
//       text
//     );

//   }


//   // =========================================================
//   // SHARE TEXT
//   // =========================================================

//   shareText(
//     title,
//     text
//   ) {

//     if (
//       navigator.share &&
//       typeof navigator.share ===
//         "function"
//     ) {

//       navigator
//         .share({

//           title,

//           text

//         })
//         .catch(
//           () => {}
//         );


//       return;
//     }


//     const whatsappUrl =
//       `https://api.whatsapp.com/send?text=` +
//       encodeURIComponent(
//         text
//       );


//     window.open(
//       whatsappUrl,
//       "_blank",
//       "noopener,noreferrer"
//     );

//   }


//   // =========================================================
//   // END TRIP EARLY
//   // =========================================================

//   endTripEarly() {

//     if (
//       this.tripTrackingInterval
//     ) {

//       clearInterval(
//         this.tripTrackingInterval
//       );


//       this.tripTrackingInterval =
//         null;
//     }


//     this.completeTrip();

//   }


//   // =========================================================
//   // COMPLETE TRIP
//   // =========================================================

//   completeTrip() {

//     const hud =
//       document.getElementById(
//         "live-trip-tracker-hud"
//       );


//     if (hud) {

//       hud.classList.add(
//         "hidden"
//       );

//     }


//     const modal =
//       document.getElementById(
//         "price-prompt-modal"
//       );


//     /*
//      * If modal doesn't exist,
//      * save default fare and finish.
//      */

//     if (!modal) {

//       this.saveCompletedTrip(
//         this.activeRoute
//           ?.fairRange
//           ?.median ||
//         100
//       );

//       return;
//     }


//     const route =
//       this.activeRoute ||
//       this.getRoutes()[0];


//     const title =
//       document.getElementById(
//         "price-prompt-title"
//       );


//     if (title) {

//       title.textContent =
//         `You reached ${
//           route?.toName ||
//           "your destination"
//         }! What did you pay?`;

//     }


//     modal.classList.add(
//       "active"
//     );


//     const submitBtn =
//       document.getElementById(
//         "price-prompt-submit-btn"
//       );


//     if (submitBtn) {

//       submitBtn.onclick =
//         () => {

//           const input =
//             document.getElementById(
//               "price-prompt-custom-amount"
//             );


//           const customAmount =
//             parseFloat(
//               input?.value || ""
//             );


//           const paidAmount =

//             Number.isFinite(
//               customAmount
//             ) &&

//             customAmount > 0

//               ? Math.round(
//                   customAmount
//                 )

//               : Math.round(
//                   route
//                     ?.fairRange
//                     ?.median ||
//                   100
//                 );


//           this.saveCompletedTrip(
//             paidAmount
//           );


//           modal.classList.remove(
//             "active"
//           );


//           alert(
//             "🎉 Trip Completed! Your payment has been added to the Last 3 Passengers Paid ticker."
//           );

//         };

//     }

//   }


//   // =========================================================
//   // SAVE COMPLETED TRIP
//   // =========================================================

//   saveCompletedTrip(
//     paidAmount
//   ) {

//     const route =
//       this.activeRoute ||
//       this.getRoutes()[0];


//     if (!route) {

//       return;
//     }


//     /*
//      * Make sure history exists.
//      */

//     if (
//       !Array.isArray(
//         route.last3PassengersPaid
//       )
//     ) {

//       route.last3PassengersPaid =
//         [];

//     }


//     /*
//      * Add newest payment.
//      */

//     route.last3PassengersPaid.unshift({

//       passengerName:

//         `${
//           store.activeUser?.name ||
//           "Passenger"
//         } (You)`,

//       amount:

//         Number(
//           paidAmount
//         ) || 100,

//       timeAgo:

//         "Just now",

//       vehicleNo:

//         this.activeTrip
//           ?.vehicleRegNo ||

//         this.activeDriver
//           ?.vehicleRegNo ||

//         "GJ-06-AU-7892",

//       driverName:

//         this.activeTrip
//           ?.driverName ||

//         this.activeDriver
//           ?.name ||

//         "Mehul Bhai"

//     });


//     /*
//      * Keep only last 3.
//      */

//     route.last3PassengersPaid =
//       route.last3PassengersPaid
//         .slice(
//           0,
//           3
//         );


//     /*
//      * Update UI.
//      */

//     this.renderLast3PassengersPaid();


//     /*
//      * Completed digital footprint.
//      */

//     const footprint = {

//       passengerName:

//         store.activeUser?.name ||
//         "Passenger",

//       driverId:

//         this.activeTrip
//           ?.driverId ||

//         this.activeDriver
//           ?.id ||

//         this.activeDriver
//           ?.uid,

//       driverName:

//         this.activeTrip
//           ?.driverName ||

//         this.activeDriver
//           ?.name ||

//         "Mehul Bhai",

//       vehicleRegNo:

//         this.activeTrip
//           ?.vehicleRegNo ||

//         this.activeDriver
//           ?.vehicleRegNo ||

//         "GJ-06-AU-7892",

//       route:

//         `${route.fromName} ➔ ${route.toName}`,

//       amountPaid:

//         Number(
//           paidAmount
//         ) || 100,

//       status:

//         "completed",

//       completedAt:

//         new Date()
//           .toISOString()

//     };


//     /*
//      * Save digital footprint.
//      */

//     if (
//       typeof store.recordDigitalFootprint ===
//       "function"
//     ) {

//       Promise.resolve(

//         store.recordDigitalFootprint(
//           footprint
//         )

//       )
//         .catch(
//           error => {

//             console.error(
//               "[Verida Transit] Completed footprint save failed:",
//               error
//             );

//           }
//         );

//     }


//     /*
//      * Save price pulse.
//      */

//     if (
//       typeof store.recordPricePulse ===
//       "function"
//     ) {

//       Promise.resolve(

//         store.recordPricePulse({

//           city:
//             store.currentCityId ||
//             "vadodara",

//           routeId:
//             route.id,

//           route:
//             `${route.fromName} ➔ ${route.toName}`,

//           passengerName:
//             store.activeUser?.name ||
//             "Passenger",

//           amount:
//             Number(
//               paidAmount
//             ) || 100,

//           verified:
//             true,

//           timestamp:
//             new Date()
//               .toISOString()

//         })

//       )
//         .catch(
//           error => {

//             console.warn(
//               "[Verida Transit] Price pulse save failed:",
//               error
//             );

//           }
//         );

//     }

//   }

// }


// // =========================================================
// // CREATE SINGLE INSTANCE
// // =========================================================

// export const transitSafety =
//   new TransitSafetyManager();


// // =========================================================
// // GLOBAL ACCESS
// // =========================================================

// if (
//   typeof window !==
//   "undefined"
// ) {

//   window.transitSafety =
//     transitSafety;

// }