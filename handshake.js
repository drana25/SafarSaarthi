/**
 * SafarSaarthi — Digital Handshake & QR Verification
 * Real-time dynamic rotating QR generation and GPS-proximity verification.
 */

import { store } from "./store.js";

export class DigitalHandshake {
  constructor() {
    this.html5QrCode = null;
    this.qrRotationInterval = null;
    this.countdownTimer = null;
    this.currentQrToken = null;
    this.qrValidityDuration = 15;
    this.secondsRemaining = 15;
    this.isScanning = false;
  }

  // --- GPS Haversine Distance Calculation ---
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // --- Guide Side: Dynamic Rotating QR Code ---
  startGuideQrRotation(
    containerId = "guide-qr-canvas",
    countdownElementId = "qr-countdown-badge"
  ) {
    this.stopGuideQrRotation();

    const generateFreshToken = () => {
      const guide = store.activeGuide;
      const loc = store.currentLocation;

      if (!guide || !loc) {
        console.error("[SafarSaarthi QR] Driver/location not available.");
        return;
      }

      const driverId = guide.id || guide.uid;

      if (!driverId) {
        console.error("[SafarSaarthi QR] Driver ID missing.");
        return;
      }

      const now = Date.now();
      const expiresAt = now + 15000;

      const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

      this.currentQrToken = {
        veridaProtocol: "1.0",
        type: "HANDSHAKE_AUTH",
        guideId: driverId,
        city: store.currentCityId,
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        timestamp: now,
        expiresAt,
        nonce
      };

      // Compact QR payload
      const qrText = [
        "VRD1",
        driverId,
        now,
        expiresAt,
        nonce
      ].join("|");

      console.log("[SafarSaarthi QR] New token:", this.currentQrToken);
      console.log("[SafarSaarthi QR] QR payload:", qrText);

      this.renderQrCode(containerId, qrText);

      this.secondsRemaining = 15;
      this.updateCountdownBadge(countdownElementId);
    };

    generateFreshToken();

    this.countdownTimer = setInterval(() => {
      this.secondsRemaining--;

      if (this.secondsRemaining <= 0) {
        generateFreshToken();
      } else {
        this.updateCountdownBadge(countdownElementId);
      }
    }, 1000);
  }

  stopGuideQrRotation() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.qrRotationInterval) clearInterval(this.qrRotationInterval);
    this.countdownTimer = null;
    this.qrRotationInterval = null;
  }

  updateCountdownBadge(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = `Token refreshes in ${this.secondsRemaining}s`;
    }
  }

  renderQrCode(containerId, payloadString) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("[SafarSaarthi QR] Container not found:", containerId);
      return;
    }

    container.innerHTML = "";

    if (typeof QRCode === "undefined") {
      console.error("[SafarSaarthi QR] QRCode library is not loaded.");
      return;
    }

    new QRCode(container, {
      text: payloadString,
      width: 220,
      height: 220,
      colorDark: "#000b09",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L
    });
  }

  // --- Traveler Side: Scanner & Verification ---
  async startTravelerScanner(
    readerElementId = "qr-reader",
    onScanSuccess,
    onScanError
  ) {
    if (this.isScanning) return;

    if (typeof Html5Qrcode === "undefined") {
      console.warn("[SafarSaarthi Handshake] Html5Qrcode library not loaded yet.");
      return;
    }

    try {
      this.html5QrCode = new Html5Qrcode(readerElementId);
      this.isScanning = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          this.processScannedPayload(decodedText, onScanSuccess);
        },
        (errorMessage) => {
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      );
    } catch (err) {
      console.warn("[SafarSaarthi Scanner] Camera start exception or permission denied:", err);
      this.isScanning = false;
      alert("📷 Camera access is needed to scan a driver's QR code. Please allow camera permission and try again.");
    }
  }

  async stopTravelerScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.warn("[SafarSaarthi Scanner] Stop error:", err);
      }
      this.isScanning = false;
    }
  }

  async getDriverProfile(driverId) {
    return store.getDriverById(driverId);
  }

  // --- Process decoded QR ---
  async processScannedPayload(decodedText, callback = null) {
    console.log("[SafarSaarthi QR] Scanned:", decodedText);

    let payload = null;

    if (typeof decodedText === "string") {
      const parts = decodedText.trim().split("|");

      if (parts.length === 5 && parts[0] === "VRD1") {
        payload = {
          veridaProtocol: "1.0",
          type: "HANDSHAKE_AUTH",
          guideId: parts[1],
          timestamp: Number(parts[2]),
          expiresAt: Number(parts[3]),
          nonce: parts[4]
        };
      } else {
        try {
          payload = JSON.parse(decodedText);
        } catch (error) {
          console.error("[SafarSaarthi QR] Invalid QR:", error);
          alert("Invalid SafarSaarthi QR code.");
          return null;
        }
      }
    } else if (typeof decodedText === "object") {
      payload = decodedText;
    } else {
      alert("Invalid SafarSaarthi QR code.");
      return null;
    }

    if (!payload.guideId) {
      alert("Driver ID is missing from QR.");
      return null;
    }

    if (payload.expiresAt) {
      const expiresAt = Number(payload.expiresAt);
      if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        alert("⚠️ QR code expired.\nPlease scan the driver's new QR.");
        return null;
      }
    }

    console.log("[SafarSaarthi QR] Fetching driver:", payload.guideId);

    const driverProfile = await this.getDriverProfile(payload.guideId);

    if (!driverProfile) {
      alert("Driver profile not found in SafarSaarthi database.");
      return null;
    }

    console.log("[SafarSaarthi DB] Driver found:", driverProfile);

    const travelerLocation = store.currentLocation || {};
    const travelerLat = Number(travelerLocation.lat);
    const travelerLng = Number(travelerLocation.lng);
    const driverLat = Number(payload.lat || driverProfile.lat || travelerLat);
    const driverLng = Number(payload.lng || driverProfile.lng || travelerLng);

    let distanceMeters = 0;

    if (
      Number.isFinite(travelerLat) &&
      Number.isFinite(travelerLng) &&
      Number.isFinite(driverLat) &&
      Number.isFinite(driverLng)
    ) {
      distanceMeters = this.calculateDistance(
        travelerLat,
        travelerLng,
        driverLat,
        driverLng
      );
    }

    const proximityValid = distanceMeters <= 500 || store.isSimulatedGps === true;

    if (!proximityValid) {
      alert(
        `⚠️ Proximity verification failed.\n\n` +
        `Driver distance: ${distanceMeters}m\n` +
        `Maximum allowed: 500m`
      );
      return null;
    }

    const handshakeData = {
      travelerId: store.activeUser?.uid || store.activeUser?.id || null,
      guideId: driverProfile.id,
      guideName: driverProfile.name,
      guidePhone: driverProfile.phone,
      guidePhoto: driverProfile.photo,
      guideVehicleRegNo: driverProfile.vehicle_reg_no || driverProfile.vehicleRegNo,
      guideVehicleType: driverProfile.vehicle_type || driverProfile.vehicleType,
      guideVehicleModel: driverProfile.vehicle_model || driverProfile.vehicleModel,
      guideRtoLicenseNo: driverProfile.rto_license_no || driverProfile.licenseNo,
      guideBadgeNo: driverProfile.badge_no || driverProfile.badgeNo,
      guideRating: Number(driverProfile.rating) || 0,
      guideTrustScore: Number(driverProfile.trust_score || driverProfile.trustIndex) || 98,
      guideEncounterCount: Number(driverProfile.total_trips || driverProfile.verifiedEncounters) || 0,
      guideGovtIssuer: driverProfile.govt_issuer || driverProfile.issuer,
      guideLanguages: driverProfile.languages,
      guideEmergencyNumbers: driverProfile.emergency_numbers,
      travelerName: store.activeUser?.name || "Verified Traveler",
      monumentName: travelerLocation.name || "Current Location",
      city: payload.city || store.currentCityId || driverProfile.city,
      lat: travelerLat,
      lng: travelerLng,
      distanceMeters: distanceMeters,
      timestamp: Date.now(),
      tokenHash: payload.nonce || `0x${Date.now()}`
    };

    console.log("[SafarSaarthi] Saving handshake:", handshakeData);

    let savedRecord;
    try {
      savedRecord = await store.recordHandshake(handshakeData);
    } catch (error) {
      console.warn("[SafarSaarthi DB] Handshake save local fallback:", error);
      savedRecord = handshakeData;
    }

    const result = {
      ...savedRecord,
      guideId: driverProfile.id,
      guideName: driverProfile.name,
      guidePhone: driverProfile.phone,
      guidePhoto: driverProfile.photo,
      guideVehicleRegNo: driverProfile.vehicle_reg_no || driverProfile.vehicleRegNo,
      guideVehicleType: driverProfile.vehicle_type || driverProfile.vehicleType,
      guideVehicleModel: driverProfile.vehicle_model || driverProfile.vehicleModel,
      guideRtoLicenseNo: driverProfile.rto_license_no || driverProfile.licenseNo,
      guideLicenseNo: driverProfile.rto_license_no || driverProfile.licenseNo,
      guideBadgeNo: driverProfile.badge_no || driverProfile.badgeNo,
      guideRating: Number(driverProfile.rating) || 4.9,
      guideTrustScore: Number(driverProfile.trust_score || driverProfile.trustIndex) || 98,
      guideEncounterCount: Number(driverProfile.total_trips || driverProfile.verifiedEncounters) || 0,
      guideGovtIssuer: driverProfile.govt_issuer || driverProfile.issuer,
      guideLanguages: driverProfile.languages,
      guideEmergencyNumbers: driverProfile.emergency_numbers,
      travelerId: store.activeUser?.uid,
      travelerName: store.activeUser?.name,
      distanceMeters: distanceMeters,
      tokenHash: payload.nonce || `0x${Date.now()}`,
      qrNonce: payload.nonce || `0x${Date.now()}`
    };

    this.lastScannedDriver = driverProfile;
    this.lastScannedPayload = payload;

    console.log("[SafarSaarthi] VERIFIED DRIVER:", driverProfile.name, driverProfile.id);
    console.log("[SafarSaarthi] Handshake successful:", result);

    if (typeof callback === "function") {
      callback(result);
    }

    return result;
  }

  // --- Instant simulator for live demo ---
  simulateLiveHandshake(callback) {
    const guide = store.activeGuide;

    const token = {
      guideId: guide.id || guide.uid,
      name: guide.name,
      phone: guide.phone,
      photo: guide.photo,
      licenseNo: guide.licenseNo,
      rtoLicenseNo: guide.rtoLicenseNo || guide.licenseNo,
      issuer: guide.issuer,
      govtIssuer: guide.govtIssuer || guide.issuer,
      category: guide.category,
      vehicleRegNo: guide.vehicleRegNo,
      vehicleType: guide.vehicleType,
      aadharNo: guide.aadharNo,
      rating: guide.rating,
      trustScore: guide.trustScore,
      encounterCount: guide.encounterCount,
      city: store.currentCityId,
      lat: store.currentLocation.lat,
      lng: store.currentLocation.lng,
      timestamp: Date.now()
    };

    return this.processScannedPayload(token, callback);
  }
}

export const digitalHandshake = new DigitalHandshake();