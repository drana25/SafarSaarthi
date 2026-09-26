/**
 * SafarSaarthi — State Store & Data Repository
 * Coordinates reactive state, city benchmarks, handshakes, price pulses, reviews, and GPS coordinates.
 */

import { hybridStore } from "./firebase-config.js";
import {
  SEED_CITIES,
  SEED_MONUMENTS,
  SEED_HOTSPOTS,
  SEED_GUIDES,
  SEED_DRIVERS,
  SEED_ROUTES,
  SEED_PRICE_PULSES,
  SEED_HANDSHAKES,
  SEED_REVIEWS
} from "../data/seedData.js";

class Store {
  constructor() {
    this.currentCityId = "vadodara"; // Default to Vadodara
    this.currentRole = "traveler"; // 'traveler' or 'guide'
    this.currentLocation = {
      lat: 22.2937, // Laxmi Vilas Palace default
      lng: 73.1916,
      name: "Laxmi Vilas Palace, Vadodara",
      fromLocation: "",
      toLocation: "",
      accuracy: 5
    };
    this.isSimulatedGps = true;
    this.activeUser = {
      uid: "trv_devanshi_01",
      name: "Devanshi Sharma",
      phone: "+91 98765 43210",
      origin: "Tourist / Vadodara, Gujarat",
      emergencyContact: "Family (+91 98765 11223)",
      role: "traveler",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    };
    this.activeGuide = {
      uid: "driver-vad-001",
      id: "driver-vad-001",
      name: "Mehul Bhai Solanki",
      phone: "+91 94260 55321",
      licenseNo: "GJ-06-2018-009124",
      badgeNo: "VAD-AUTO-772",
      vehicleRegNo: "GJ-06-AU-7892",
      vehicleType: "Green CNG Auto-Rickshaw",
      issuer: "Vadodara RTO & Police Tourist Syndicate",
      category: "Auto-Rickshaw Transit",
      city: "vadodara",
      rating: 4.92,
      encounterCount: 640,
      specialty: "Vadodara City Transit & Gaekwad Heritage",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    };

    this.loadSavedProfiles();
    this.initSeedData();
  }

  // --- Trip Preferences & Personalized Recommendation Engine ---
  saveTripPreferences(prefs) {
    if (!this.activeUser) return;
    this.activeUser.tripPreferences = {
      tripType: prefs.tripType || "Family Trip",
      interests: prefs.interests || ["Food", "History & Culture", "Nature"],
      withChildren: prefs.withChildren || "No",
      hotelBooked: Boolean(prefs.hotelBooked),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("verida_user_profile", JSON.stringify(this.activeUser));

    // Best-effort Firestore sync (non-blocking)
    if (this.activeUser.uid) {
      hybridStore.addDocument("tripPreferences", {
        id: this.activeUser.uid,
        passengerId: this.activeUser.uid,
        ...this.activeUser.tripPreferences
      }).catch(err => console.warn("[SafarSaarthi Firestore] trip preferences sync skipped:", err));
    }
    return this.activeUser.tripPreferences;
  }

  getTripPreferences() {
    return this.activeUser?.tripPreferences || null;
  }

  calculatePlaceScore(place, userLoc) {
    const prefs = this.getTripPreferences();
    if (!prefs || !prefs.tripType) {
      return { totalScore: 50, explanation: "", matchingFactors: [] };
    }

    let tripMatchScore = 0;
    let interestScore = 0;
    let childScore = 0;
    let distanceScore = 0;
    const matchingFactors = [];

    // 1. Trip Type Match (+40 pts)
    const tripType = prefs.tripType;
    const typeMap = {
      "Family Trip": ["family", "Family", "Parks", "Zoo", "Museum", "Heritage"],
      "Business Trip": ["business", "Business", "Hotel", "Station", "Airport"],
      "Solo Trip": ["solo", "Solo", "Market", "Heritage", "Temples", "Food"],
      "Couple Trip": ["couple", "Couple", "Palace", "Gardens", "Nature", "Heritage"],
      "Friends Trip": ["friends", "Friends", "Food", "Shopping", "Day Trips", "Market"],
      "Cultural / Heritage Trip": ["cultural", "Heritage", "Monuments", "Museum", "Temples"],
      "Adventure / Nature Trip": ["adventure", "Nature", "Gardens", "Park", "Day Trips"]
    };

    const typeKeywords = typeMap[tripType] || [];
    let isTripMatch = false;
    if (place.scores && place.scores[typeKeywords[0] + "_score"] > 50) isTripMatch = true;
    if (typeKeywords.some(k => (place.category || "").toLowerCase().includes(k.toLowerCase()) || (place.typeLabel || "").toLowerCase().includes(k.toLowerCase()))) isTripMatch = true;

    if (isTripMatch) {
      tripMatchScore = 40;
      matchingFactors.push(tripType.replace(" Trip", ""));
    }

    // 2. Matching Interests (+10 pts per matching interest, max +30 cap)
    const userInterests = prefs.interests || [];
    let matchedInterestsCount = 0;
    const interestMap = {
      "Food": ["Food", "Restaurant", "Café", "Dining", "Bazaar"],
      "Shopping": ["Shopping", "Market", "Bazaar", "Textile", "Handicrafts"],
      "History & Culture": ["History", "Culture", "Heritage", "Museum", "Palace", "Mandir"],
      "Nature": ["Nature", "Gardens", "Park", "Zoo", "Lake"],
      "Entertainment": ["Entertainment", "Zoo", "Park", "Cinema", "Activities"],
      "Local Experiences": ["Local", "Walking", "Market", "Gate", "Bazaar"]
    };

    userInterests.forEach(interest => {
      const keywords = interestMap[interest] || [interest];
      let match = false;
      if (keywords.some(k => (place.category || "").toLowerCase().includes(k.toLowerCase()) || (place.highlights || "").toLowerCase().includes(k.toLowerCase()) || (place.description || "").toLowerCase().includes(k.toLowerCase()))) {
        match = true;
      }
      if (place.scores && keywords.some(k => place.scores[k.toLowerCase() + "_score"] > 50)) match = true;

      if (match) {
        matchedInterestsCount++;
        matchingFactors.push(interest);
      }
    });

    interestScore = Math.min(matchedInterestsCount * 10, 30);

    // 3. Child Friendly Match (+20 pts)
    if (prefs.withChildren === "Yes" && place.child_friendly) {
      childScore = 20;
      matchingFactors.push("Child Friendly");
    }

    // 4. Distance Proximity Score (+0 to +20 pts)
    const dist = place.distKm || 0;
    if (dist < 2) distanceScore = 20;
    else if (dist < 5) distanceScore = 15;
    else if (dist < 10) distanceScore = 10;
    else if (dist < 20) distanceScore = 5;
    else distanceScore = 0;

    const totalScore = tripMatchScore + interestScore + childScore + distanceScore;

    // Formulate explainable recommendation text
    let explanation = "";
    if (matchingFactors.length > 0) {
      explanation = `${matchingFactors.slice(0, 3).join(" • ")} Match`;
    } else if (distanceScore >= 15) {
      explanation = "Nearby Landmark";
    } else {
      explanation = "Recommended";
    }

    return { totalScore, explanation, matchingFactors };
  }

  loadSavedProfiles() {
    try {
      const savedUser = localStorage.getItem("verida_user_profile");
      if (savedUser) this.activeUser = { ...this.activeUser, ...JSON.parse(savedUser) };
      
      const savedGuide = localStorage.getItem("verida_guide_profile");
      if (savedGuide) this.activeGuide = { ...this.activeGuide, ...JSON.parse(savedGuide) };
    } catch (e) {
      console.warn("[SafarSaarthi Store] Profile load error:", e);
    }
  }

  setFromLocation(fromName, coords = null) {
    this.currentLocation.fromLocation = fromName;
    if (coords) {
      this.currentLocation.lat = coords.lat;
      this.currentLocation.lng = coords.lng;
    }
    console.log("[SafarSaarthi Store] Explicit From Location updated:", fromName);
    this._notifyLocationChange();
  }

  setToLocation(toName) {
    this.currentLocation.toLocation = toName;
    console.log("[SafarSaarthi Store] Explicit To Location updated:", toName);
    this._notifyLocationChange();
  }

  setRouteLocations(fromName, toName) {
    this.currentLocation.fromLocation = fromName;
    this.currentLocation.toLocation = toName;
    console.log(`[SafarSaarthi Store] Explicit Route set: ${fromName} ➔ ${toName}`);
    this._notifyLocationChange();
  }

  _notifyLocationChange() {
    if (typeof window !== "undefined" && window.veridaApp?.renderApp) {
      window.veridaApp.renderApp();
    }
  }

  async registerPassenger(profile) {
    const uid = profile.uid || `trv_${Date.now()}`;
    this.activeUser = {
      ...this.activeUser,
      ...profile,
      uid
    };
    localStorage.setItem("verida_user_profile", JSON.stringify(this.activeUser));

    // Mirror the profile to Firestore, keyed by Firebase Auth uid, so it can be
    // restored if the passenger logs in again from a different device/browser.
    try {
      await hybridStore.addDocument("users", { ...this.activeUser, id: uid });
    } catch (err) {
      console.warn("[SafarSaarthi Firestore] Passenger profile sync skipped:", err);
    }

    return this.activeUser;
  }

  async registerDriver(profile) {
    const existingId = profile.uid || this.activeGuide.id || this.activeGuide.uid || `driver_${Date.now()}`;
    this.activeGuide = {
      ...this.activeGuide,
      ...profile,
      uid: existingId,
      id: existingId
    };
    localStorage.setItem("verida_guide_profile", JSON.stringify(this.activeGuide));

    try {
      await hybridStore.addDocument("drivers", { ...this.activeGuide, id: existingId });
    } catch (err) {
      console.warn("[SafarSaarthi Firestore] Driver profile sync skipped:", err);
    }

    return this.activeGuide;
  }

  // Pulls a saved profile down from Firestore (used at login time when this
  // browser/device has no local copy of the profile yet).
  async fetchProfileFromFirestore(collectionName, uid) {
    return await hybridStore.getDocument(collectionName, uid);
  }

  clearPassengerSession() {
    this.activeUser = { uid: "", name: "", phone: "", origin: "", emergency: "", role: "traveler" };
    localStorage.removeItem("verida_user_profile");
  }

  clearDriverSession() {
    this.activeGuide = { uid: "", id: "", name: "", phone: "", role: "guide" };
    localStorage.removeItem("verida_guide_profile");
  }

  initSeedData(forceReset = false) {
    const existingMonuments = hybridStore.getCollection("monuments") || [];
    const existingHotspots = hybridStore.getCollection("hotspots") || [];
    const existingRoutes = hybridStore.getCollection("routes") || [];

    const monumentMap = new Map(existingMonuments.map(m => [m.id, m]));
    let needsSave = forceReset || existingMonuments.length < SEED_MONUMENTS.length || existingHotspots.length < SEED_HOTSPOTS.length || existingRoutes.length === 0;

    const updatedMonuments = SEED_MONUMENTS.map(seedMon => {
      const existing = monumentMap.get(seedMon.id);
      if (!existing) {
        needsSave = true;
        return seedMon;
      }
      return { ...existing, ...seedMon };
    });

    const hotspotMap = new Map(existingHotspots.map(h => [h.id, h]));
    const updatedHotspots = SEED_HOTSPOTS.map(seedH => {
      const existing = hotspotMap.get(seedH.id);
      if (!existing) return seedH;
      return { ...existing, ...seedH };
    });

    if (needsSave || updatedMonuments.length !== existingMonuments.length || !existingMonuments.some(m => m.id === "vad-grand-mercure") || !existingHotspots.some(h => h.imageUrl)) {
      hybridStore.saveCollection("monuments", updatedMonuments);
      hybridStore.saveCollection("hotspots", updatedHotspots);
      hybridStore.saveCollection("guides", SEED_GUIDES);
      hybridStore.saveCollection("drivers", SEED_DRIVERS);
      hybridStore.saveCollection("routes", SEED_ROUTES);
      hybridStore.saveCollection("pricePulse", SEED_PRICE_PULSES);
      hybridStore.saveCollection("handshakes", SEED_HANDSHAKES);
      hybridStore.saveCollection("reviews", SEED_REVIEWS);
      console.log("[SafarSaarthi Store] Seed data refreshed with complete place objects.");
    }
  }

  // --- City & Location Accessors ---
  getCities() {
    return SEED_CITIES;
  }

  getCurrentCity() {
    return SEED_CITIES[this.currentCityId] || SEED_CITIES.vadodara;
  }

  setCity(cityId) {
    if (SEED_CITIES[cityId]) {
      this.currentCityId = cityId;
      const city = SEED_CITIES[cityId];
      
      this.currentLocation = {
        ...this.currentLocation,
        lat: city.center.lat,
        lng: city.center.lng,
        name: `${city.name} City Center`
      };

      const cityGuides = this.getGuidesForCity(cityId);
      if (cityGuides.length > 0) {
        this.activeGuide = { ...cityGuides[0], uid: cityGuides[0].id };
      }
    }
        
    if (typeof window !== "undefined" && window.veridaApp?.renderApp) {
      window.veridaApp.renderApp();
    }
  }

  getMonumentsForCity(cityId = this.currentCityId) {
    const all = hybridStore.getCollection("monuments");
    return all.filter(m => m.city === cityId);
  }

  getHotspotsForCity(cityId = this.currentCityId) {
    const all = hybridStore.getCollection("hotspots");
    return all.filter(h => h.city === cityId);
  }

  getGuidesForCity(cityId = this.currentCityId) {
    const all = hybridStore.getCollection("guides");
    return all.filter(g => g.city === cityId);
  }

  getGuideById(guideId) {
    if (!guideId) return this.activeGuide;
    const guides = hybridStore.getCollection("guides") || [];
    const drivers = hybridStore.getCollection("drivers") || [];
    const allEntities = [...guides, ...drivers];

    const found = allEntities.find(g => 
      g.id === guideId || 
      g.uid === guideId || 
      g.licenseNo === guideId || 
      g.vehicleRegNo === guideId ||
      g.phone === guideId
    );
    if (found) return found;

    if (
      this.activeGuide && (
        this.activeGuide.id === guideId ||
        this.activeGuide.uid === guideId ||
        this.activeGuide.vehicleRegNo === guideId ||
        this.activeGuide.phone === guideId ||
        this.activeGuide.licenseNo === guideId
      )
    ) {
      return this.activeGuide;
    }

    return null;
  }

  getDriverById(driverId) {
    return this.getGuideById(driverId);
  }

  // --- Handshakes Ledger ---
  getHandshakes() {
    return hybridStore.getCollection("handshakes");
  }

  async recordHandshake(handshakeData = {}) {
    const handshakeRecord = {
      guideId: handshakeData.guideId,
      travelerId: handshakeData.travelerId,
      guideName: handshakeData.guideName,
      travelerName: handshakeData.travelerName,
      timestamp: Number(handshakeData.timestamp) || Date.now(),
      status: "verified",
      agreedPrice: handshakeData.agreedPrice ?? null,
      tokenHash: handshakeData.tokenHash ?? null,
      monumentId: handshakeData.monumentId ?? null,
      monumentName: handshakeData.monumentName ?? null,
      city: handshakeData.city ?? this.currentCityId,
      lat: Number(handshakeData.lat),
      lng: Number(handshakeData.lng),
      distanceMeters: Number(handshakeData.distanceMeters)
    };

    console.log("[SafarSaarthi] Saving handshake:", handshakeRecord);
    const saved = await hybridStore.addDocument("handshakes", handshakeRecord);
    console.log("[SafarSaarthi DB] Handshake saved:", saved);
    return saved;
  }

  hasHandshakeWithGuide(guideId, travelerId = this.activeUser.uid) {
    const handshakes = this.getHandshakes();
    if (!handshakes || handshakes.length === 0) return false;

    const targetGuide = this.getGuideById(guideId);
    const targetName = targetGuide?.name || targetGuide?.guideName || guideId;
    const targetVehicle = targetGuide?.vehicleRegNo;

    return handshakes.some(h => {
      const matchesGuide = 
        h.guideId === guideId ||
        h.guideId === targetGuide?.id ||
        h.guideId === targetGuide?.uid ||
        (targetName && h.guideName === targetName) ||
        (targetVehicle && h.vehicleRegNo === targetVehicle);

      const matchesUser = 
        h.travelerId === travelerId ||
        h.travelerId === this.activeUser.uid ||
        h.passengerName === this.activeUser.name ||
        h.travelerName === this.activeUser.name;

      return matchesGuide && matchesUser;
    });
  }

  // --- Price Pulse Engine ---
  getPricePulses(cityId = this.currentCityId) {
    const pulses = hybridStore.getCollection("pricePulse");
    if (!cityId) return pulses;
    return pulses.filter(p => p.city === cityId);
  }

  async recordPricePulse(pulseData) {
    return await hybridStore.addDocument("pricePulse", {
      ...pulseData,
      city: pulseData.city || this.currentCityId,
      createdAt: Date.now()
    });
  }

  getFairRateBenchmark(monumentId, serviceCategory = "Official Guide") {
    const monuments = hybridStore.getCollection("monuments");
    const mon = monuments.find(m => m.id === monumentId);
    if (!mon || !mon.fairRates) {
      return { min: 100, median: 250, max: 500, unit: "standard" };
    }

    for (const [key, rate] of Object.entries(mon.fairRates)) {
      if (key.toLowerCase().includes(serviceCategory.toLowerCase()) || serviceCategory.toLowerCase().includes(key.toLowerCase())) {
        return { key, ...rate };
      }
    }

    const firstKey = Object.keys(mon.fairRates)[0];
    return { key: firstKey, ...mon.fairRates[firstKey] };
  }

  // --- Proof-of-Presence Reviews ---
  getReviewsForGuide(guideId) {
    const all = hybridStore.getCollection("reviews") || [];
    if (!guideId) return all;

    const target = this.getGuideById(guideId) || this.activeGuide;
    const vehicleRegNo = target?.vehicleRegNo;
    const driverPhone = target?.phone;
    const driverName = target?.name;

    return all.filter(r => 
      r.guideId === guideId || 
      r.driverId === guideId ||
      (target?.id && (r.guideId === target.id || r.driverId === target.id)) ||
      (target?.uid && (r.guideId === target.uid || r.driverId === target.uid)) ||
      (vehicleRegNo && r.vehicleRegNo === vehicleRegNo) ||
      (driverPhone && r.driverPhone === driverPhone) ||
      (driverName && r.driverName === driverName)
    );
  }

  async recordReview(reviewData) {
    const newDoc = await hybridStore.addDocument("reviews", {
      ...reviewData,
      presenceVerified: true,
      createdAt: Date.now()
    });
    return newDoc;
  }

  async addReview(reviewData) {
    return await this.recordReview(reviewData);
  }

  // --- Transit Routes & Last 3 Passengers Paid ---
  getRoutesForCity(cityId = this.currentCityId) {
    const all = hybridStore.getCollection("routes");
    const filtered = all.filter(r => r.city === cityId);
    return filtered.length > 0 ? filtered : SEED_ROUTES.filter(r => r.city === "vadodara");
  }

  getDriversForCity(cityId = this.currentCityId) {
    const all = hybridStore.getCollection("drivers");
    const filtered = all.filter(d => d.city === cityId);
    return filtered.length > 0 ? filtered : SEED_DRIVERS;
  }

  async recordDigitalFootprint(footprintData) {
    const activeDriver = this.activeGuide || this.activeDriver;
    
    const enrichedFootprint = {
      id: `fp_${Date.now()}`,
      passengerName: footprintData.passengerName || this.activeUser.name,
      driverId: footprintData.driverId || activeDriver?.id || activeDriver?.uid,
      driverName: footprintData.driverName || activeDriver?.name,
      vehicleRegNo: footprintData.vehicleRegNo || activeDriver?.vehicleRegNo || "GJ-06-AU-7892",
      route: footprintData.route || "Vadodara Transit Route",
      amountPaid: footprintData.amountPaid || footprintData.fare || 50,
      footprintHash: footprintData.footprintHash || `0x${Math.random().toString(16).substring(2, 10)}`,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      ...footprintData
    };

    return await hybridStore.addDocument("digitalFootprints", enrichedFootprint);
  }

  getDigitalFootprints() {
    return hybridStore.getCollection("digitalFootprints") || [];
  }

  // --- Incidents & SOS ---
  async recordIncident(incidentData) {
    return await hybridStore.addDocument("incidents", {
      ...incidentData,
      timestamp: Date.now(),
      status: "forwarded_to_police"
    });
  }

  getIncidents() {
    return hybridStore.getCollection("incidents") || [];
  }
}

export const store = new Store();