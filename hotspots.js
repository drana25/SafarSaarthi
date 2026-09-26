/**
 * Verida — Scam Hotspot Radar & Geofencing Module (Feature #5)
 * Leaflet Interactive Map + Complete Places Directory + Proactive Geofence Alerts ("Waze for Touts")
 */

import { store } from "./store.js";
import { digitalHandshake } from "./handshake.js";

export class HotspotRadar {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.hotspotCircles = [];
    this.monumentMarkers = [];
    this.activeAlertHotspot = null;
    this.activeCategoryFilter = "all";
    this.searchQuery = "";
    this.showAllLocations = false;
  }

  // --- Initialize Google Map ---
  initMap(containerId = "hotspot-map") {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof google === "undefined" || !google.maps) {
       console.warn("[Hotspots] Google Maps API not loaded. Map rendering skipped.");
       container.innerHTML = `<div style="padding:20px;text-align:center;color:#64748b;">Interactive Map is temporarily unavailable.</div>`;
       this.renderHotspotsDirectory();
       return;
    }

    const city = store.getCurrentCity();
    const loc = store.currentLocation;

    try {
      this.map = new google.maps.Map(container, {
        center: { lat: loc.lat, lng: loc.lng },
        zoom: city.zoom || 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] }
        ]
      });

      this.renderMapLayers();
      this.renderHotspotsDirectory();
      this.checkGeofenceProximity();
    } catch (e) {
      console.warn("[Verida Map Init Warning]:", e);
    }
  }

  // Render monuments, hotspots, and user pin
  renderMapLayers() {
    if (!this.map || typeof google === "undefined" || !google.maps) return;

    // Clear existing layers
    this.hotspotCircles.forEach(c => c.setMap(null));
    this.monumentMarkers.forEach(m => m.setMap(null));
    if (this.userMarker) this.userMarker.setMap(null);
    this.hotspotCircles = [];
    this.monumentMarkers = [];

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);
    const userLoc = store.currentLocation;
    
    const infoWindow = new google.maps.InfoWindow();

    // 1. Hotspot Danger Circles
    hotspots.forEach(spot => {
      const circleColor = spot.riskLevel === "high" ? "#ef4444" : "#f59e0b";
      const circle = new google.maps.Circle({
        strokeColor: circleColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: circleColor,
        fillOpacity: 0.25,
        map: this.map,
        center: { lat: spot.lat, lng: spot.lng },
        radius: spot.radius || 200
      });

      google.maps.event.addListener(circle, "click", (e) => {
        infoWindow.setContent(`
          <div class="hotspot-popup" style="max-width: 240px; font-family: inherit;">
            <h4 style="color: ${circleColor}; margin: 0 0 4px 0; font-size: 13px;">
              <i class="fas fa-exclamation-triangle"></i> ${spot.name}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #1e293b;">
              🚨 ${spot.scamType}
            </p>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">
              ${spot.description}
            </p>
            <div style="font-size: 11px; color: #047857; background: #ecfdf5; padding: 4px 8px; border-radius: 4px; border-left: 3px solid #059669;">
              <i class="fas fa-shield-alt"></i> <strong>Safe Action:</strong> ${spot.proactiveAdvice}
            </div>
          </div>
        `);
        infoWindow.setPosition(e.latLng);
        infoWindow.open(this.map);
      });

      this.hotspotCircles.push(circle);
    });

    // 2. Verified Monument Markers
    monuments.forEach(mon => {
      const marker = new google.maps.Marker({
        position: { lat: mon.lat, lng: mon.lng },
        map: this.map,
        title: mon.name
      });
      
      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div class="monument-popup" style="max-width: 240px; font-family: inherit;">
            <h4 style="margin: 0 0 4px 0; color: #0f172a; font-size: 13px;">${mon.name}</h4>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${mon.category}</span>
            <p style="margin: 6px 0; font-size: 11px; color: #475569; line-height: 1.4;">${mon.highlights}</p>
          </div>
        `);
        infoWindow.open(this.map, marker);
      });

      this.monumentMarkers.push(marker);
    });

    // 3. User Location Marker
    this.userMarker = new google.maps.Marker({
      position: { lat: userLoc.lat, lng: userLoc.lng },
      map: this.map,
      title: "Your Live GPS Pin",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    });
  }

  // --- Render Image-First Horizontal Carousel Browse Layout ---
  renderHotspotsDirectory(containerId = "hotspots-directory-list") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);
    const userLoc = store.currentLocation;

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.geometry) {
        const p1 = new google.maps.LatLng(lat1, lng1);
        const p2 = new google.maps.LatLng(lat2, lng2);
        return google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000;
      }
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const prefs = store.getTripPreferences();

    // Build unified list with scores and distances
    const unifiedList = [
      ...hotspots.map(h => {
        const distKm = calculateDistance(userLoc.lat, userLoc.lng, h.lat, h.lng);
        const itemObj = { ...h, isHotspot: true, category: 'Scam Hotspot', distKm };
        const scoreRes = store.calculatePlaceScore(itemObj, userLoc);
        return { ...itemObj, totalScore: scoreRes.totalScore, explanation: scoreRes.explanation };
      }),
      ...monuments.map(m => {
        const distKm = calculateDistance(userLoc.lat, userLoc.lng, m.lat, m.lng);
        const itemObj = { ...m, isHotspot: false, category: m.category, distKm };
        const scoreRes = store.calculatePlaceScore(itemObj, userLoc);
        return { ...itemObj, totalScore: scoreRes.totalScore, explanation: scoreRes.explanation };
      })
    ];

    // ---- Filter by active category and search query ----
    let filtered = unifiedList;
    if (this.activeCategoryFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (this.activeCategoryFilter === 'scam') return item.isHotspot;
        return (item.category || '').toLowerCase().includes(this.activeCategoryFilter.toLowerCase());
      });
    }
    if (this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.highlights || '').toLowerCase().includes(q) ||
        (item.scamType || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding:24px;text-align:center;color:#64748b;"><i class="fas fa-search" style="font-size:24px;margin-bottom:8px;display:block;"></i><p>No locations match your search. Try a different keyword.</p></div>`;
      return;
    }

    // ---- If filtering/searching: show flat carousel (single row) ----
    const isFiltering = this.activeCategoryFilter !== 'all' || this.searchQuery.trim().length > 0;
    if (isFiltering) {
      const label = this.searchQuery.trim()
        ? `Results for "${this.searchQuery.trim()}"`
        : `${this.activeCategoryFilter === 'scam' ? '🚨 Tout Hotspots' : `🏷️ ${this.activeCategoryFilter}`}`;
      filtered.sort((a, b) => prefs && prefs.tripType ? b.totalScore - a.totalScore : a.distKm - b.distKm);
      container.innerHTML = this._buildSection(label, filtered, prefs);
      return;
    }

    // ---- Default "All" view: personalised sections ----
    const sortedByScore = [...unifiedList].filter(i => !i.isHotspot).sort((a, b) => b.totalScore - a.totalScore);
    const sortedByDist  = [...unifiedList].filter(i => !i.isHotspot).sort((a, b) => a.distKm - b.distKm);
    const scamItems     = unifiedList.filter(i => i.isHotspot).sort((a, b) => a.distKm - b.distKm);

    let html = '';

    // Section 1: Recommended for you (personalised) OR Nearby (no prefs)
    if (prefs && prefs.tripType && sortedByScore.length > 0) {
      html += this._buildSection(
        `✨ Recommended for Your ${prefs.tripType.charAt(0).toUpperCase()+prefs.tripType.slice(1)} Trip`,
        sortedByScore.slice(0, 8),
        prefs,
        true
      );
    } else if (sortedByDist.length > 0) {
      html += this._buildSection('📍 Nearby Landmarks', sortedByDist.slice(0, 8), prefs, true);
    }

    // Section 2: Nearby Landmarks (only if section 1 was personalised and there are more places)
    if (prefs && prefs.tripType && sortedByDist.length > 0) {
      html += this._buildSection('📍 Nearest to You', sortedByDist.slice(0, 8), prefs, true);
    }

    // Section 3: Scam & Tout Warnings
    if (scamItems.length > 0) {
      html += this._buildSection('🚨 Scam & Tout Warnings', scamItems, prefs, true);
    }

    container.innerHTML = html || '<div style="padding:24px;text-align:center;color:#64748b;">No places available.</div>';
  }

  // Build a horizontal scrolling section with a heading
  _buildSection(title, items, prefs, horizontal = true) {
    const cards = items.map(item => {
      const heroImg = item.imageUrl || (item.isHotspot
        ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
        : 'https://images.unsplash.com/photo-1599818817294-822830fce37d?w=400');
      const distText = typeof item.distKm === 'number' ? `${item.distKm.toFixed(1)} km` : 'Near you';
      const ratingText = item.rating ? `★ ${item.rating.toFixed(1)}` : 'Verified';
      // "Matches your ... preference" badge intentionally removed from the
      // compact card — only name, rating and short description show here.
      // The full details (opened on click) are unaffected.
      const matchBadge = '';

      if (item.isHotspot) {
        return `
          <div class="airbnb-place-card scam-card" onclick="hotspotRadar.openPlaceDetailsModal('${item.id}')" role="button" tabindex="0">
            <div class="airbnb-card-media-wrap">
              <img src="${heroImg}" alt="${item.name}" class="airbnb-card-img" loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'">
              <span class="airbnb-floating-badge high-risk"><i class="fas fa-shield-virus"></i> ${item.riskLevel === 'high' ? 'High Risk' : 'Tout Alert'}</span>
              <span class="airbnb-floating-dist">${distText}</span>
            </div>
            <div class="airbnb-card-body">
              <div class="airbnb-card-top-row">
                <h4 class="airbnb-card-title">${item.name}</h4>
              </div>
              <p class="airbnb-card-sub">${item.scamType || 'Scam Warning Zone'}</p>
            </div>
          </div>`;
      } else {
        return `
          <div class="airbnb-place-card landmark-card" onclick="hotspotRadar.openPlaceDetailsModal('${item.id}')" role="button" tabindex="0">
            <div class="airbnb-card-media-wrap">
              <img src="${heroImg}" alt="${item.name}" class="airbnb-card-img" loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1599818817294-822830fce37d?w=400'">
              <span class="airbnb-floating-badge verified-zone"><i class="fas fa-landmark"></i> ${item.category || 'Landmark'}</span>
              <span class="airbnb-floating-dist">${distText}</span>
            </div>
            <div class="airbnb-card-body">
              <div class="airbnb-card-top-row">
                <h4 class="airbnb-card-title">${item.name}</h4>
                <span class="airbnb-rating-pill">${ratingText}</span>
              </div>
              <p class="airbnb-card-sub">${item.highlights || item.description || 'Verified tourist landmark'}</p>
              ${matchBadge}
            </div>
          </div>`;
      }
    }).join('');

    return `
      <div class="hs-browse-section">
        <h4 class="hs-browse-section-title">${title}</h4>
        <div class="hs-browse-row${horizontal ? ' hs-browse-row--scroll' : ''}">
          ${cards}
        </div>
      </div>`;
  }

  toggleAllLocations() {
    this.showAllLocations = !this.showAllLocations;
    this.renderHotspotsDirectory();
  }

  openPlaceDetailsModal(placeId) {
    const cityId = store.currentCityId;
    const hotspots = store.getHotspotsForCity(cityId);
    const monuments = store.getMonumentsForCity(cityId);
    const all = [...hotspots, ...monuments];
    // FIX: Do NOT fall back to monuments[0] — find the actual clicked place only
    const place = all.find(p => p.id === placeId);
    if (!place) {
      console.warn("[Verida] openPlaceDetailsModal: place not found for id:", placeId);
      return;
    }

    const userLoc = store.currentLocation;
    const scoreRes = store.calculatePlaceScore(place, userLoc);

    // Pan map to this location (safe to call even if map not loaded)
    this.flyAndSelect(place.id, place.lat, place.lng, place.name);

    // --- Create or reuse modal element ---
    let modal = document.getElementById("place-details-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "place-details-modal";
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    // --- Safe distance string ---
    const distStr = (typeof place.distKm === "number")
      ? `${place.distKm.toFixed(1)} km away`
      : "";

    // --- Real safety data OR null ---
    const safety = place.areaSafety || null;

    // --- Real scam alerts from data OR empty array ---
    const scamAlerts = Array.isArray(place.scamAlerts)
      ? place.scamAlerts
      : (place.scamType ? [{
          title: place.scamType,
          category: "Area Warning",
          description: place.description || "",
          reported_count: place.recentReportCount || null,
          last_reported: null,
          source: "Verida Scam Hotspot Data — PROTOTYPE DATA",
          verified: true,
          recommended_action: place.proactiveAdvice || null,
          isDemoData: true
        }] : []);

    // --- Hero Image ---
    const imgSrc = place.imageUrl || '';
    const imgAlt = place.imageAlt || place.name;
    const heroImageHtml = imgSrc ? `
      <div class="pdm-hero-img-wrap">
        <img src="${imgSrc}" alt="${imgAlt}" class="pdm-hero-img" loading="eager" decoding="async" referrerpolicy="no-referrer"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="pdm-hero-img-fallback">
          <i class="fas fa-image"></i>
          <span>Image unavailable</span>
        </div>
        ${place.imageAlt ? `<div class="pdm-demo-tag">DEMO DATA</div>` : ''}
      </div>
    ` : `
      <div class="pdm-hero-placeholder">
        <i class="fas fa-${place.isHotspot ? 'shield-virus' : 'landmark'}"></i>
        <span>${place.category || "Location"}</span>
      </div>
    `;

    // --- Short safety status (quick glance) ---
    const safetyStatusHtml = place.isHotspot
      ? `<div class="pdm-safety-pill pdm-safety-pill--warn"><i class="fas fa-triangle-exclamation"></i> ${place.riskLevel === 'high' ? 'High Risk Zone' : 'Tout Alert Zone'} — ${place.scamType || 'Caution advised'}</div>`
      : (safety
          ? `<div class="pdm-safety-pill pdm-safety-pill--ok"><i class="fas fa-shield-check"></i> Area info available · ${safety.daytime_activity || 'See details'}</div>`
          : `<div class="pdm-safety-pill pdm-safety-pill--neutral"><i class="fas fa-circle-info"></i> ${place.highlights ? place.highlights.substring(0,80) + (place.highlights.length > 80 ? '…' : '') : 'Verified landmark'}</div>`);

    // --- Short fair-rate summary ---
    const hasFairRate = place.fairRates && Object.keys(place.fairRates).length > 0;
    const fairRateQuickHtml = hasFairRate
      ? `<div class="pdm-fair-rate-pill"><i class="fas fa-coins"></i> ${Object.entries(place.fairRates).slice(0,1).map(([t,r]) => `${t}: ₹${r.min}–₹${r.median}`).join('')}</div>`
      : '';

    // --- Recommendation banner (compact) ---
    const recBannerHtml = scoreRes.explanation ? `
      <div class="pdm-rec-banner">
        <i class="fas fa-sparkles"></i>
        <span>${scoreRes.explanation}</span>
        <span class="pdm-rec-score">Score: ${scoreRes.totalScore}/110</span>
      </div>
    ` : '';

    // --- Helper: build HTML5 accordion (details/summary) ---
    const buildAccordion = (id, icon, title, colorClass, contentHtml) => `
      <details class="pdm-accordion ${colorClass}" id="acc-${id}">
        <summary class="pdm-accordion-summary">
          <span class="pdm-accordion-icon"><i class="${icon}"></i></span>
          <span class="pdm-accordion-title">${title}</span>
          <i class="fas fa-chevron-down pdm-accordion-chevron"></i>
        </summary>
        <div class="pdm-accordion-content">
          ${contentHtml}
        </div>
      </details>`;

    // --- About/Property content ---
    const ratingHtml = (typeof place.rating === "number")
      ? `<span class="pdm-detail-badge pdm-badge-gold">⭐ ${place.rating.toFixed(1)} / 5</span>`
      : `<span class="pdm-detail-badge pdm-badge-muted">Rating unavailable</span>`;
    const descHtml = place.description || place.highlights || '';
    const amenitiesHtml = Array.isArray(place.amenities) && place.amenities.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">${
          place.amenities.map(a => `<span style="font-size:11px;background:#fff;border:1px solid #cbd5e1;padding:3px 8px;border-radius:100px;color:#475569;">✓ ${a}</span>`).join("")
        }</div>`
      : '';
    const openingHtml = place.openingHours
      ? `<div style="margin-top:8px;font-size:12px;color:#0369a1;"><i class="fas fa-clock"></i> <strong>Opening:</strong> ${place.openingHours}</div>`
      : '';
    const priceLevelHtml = place.priceLevel
      ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">💰 <strong>Price:</strong> ${place.priceLevel}</div>`
      : '';

    const aboutContent = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
        ${ratingHtml}
        ${priceLevelHtml}
      </div>
      ${descHtml ? `<p style="font-size:12px;color:#334155;line-height:1.6;margin-bottom:8px;">${descHtml}</p>` : ''}
      ${openingHtml}
      ${amenitiesHtml}
    `;

    // --- Day/Night Safety content ---
    const daytimeContent = place.dayInfo ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#1e293b;margin-top:8px;">
        ${place.dayInfo.activity ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #fde68a;">☀️ Daytime: <strong>${place.dayInfo.activity}</strong></div>` : ''}
        ${place.dayInfo.pedestrian ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #fde68a;">🚶 Pedestrian: <strong>${place.dayInfo.pedestrian}</strong></div>` : ''}
        ${place.dayInfo.transport ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #fde68a;">🚕 Transport: <strong>${place.dayInfo.transport}</strong></div>` : ''}
      </div>
      ${place.dayInfo.notes ? `<p style="font-size:11px;color:#78350f;margin-top:8px;line-height:1.5;background:#fef3c7;padding:8px;border-radius:6px;">${place.dayInfo.notes}</p>` : ''}
    ` : `<p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:8px;">☀️ Daytime information unavailable.</p>`;

    const nightContent = place.nightInfo ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#1e293b;margin-top:8px;">
        ${place.nightInfo.activity ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #ddd6fe;">🌙 Night: <strong>${place.nightInfo.activity}</strong></div>` : ''}
        ${place.nightInfo.street_lighting ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #ddd6fe;">💡 Lighting: <strong>${place.nightInfo.street_lighting}</strong></div>` : ''}
        ${place.nightInfo.pedestrian ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #ddd6fe;">🚶 Pedestrian: <strong>${place.nightInfo.pedestrian}</strong></div>` : ''}
        ${place.nightInfo.transport ? `<div style="background:#fff;padding:7px 10px;border-radius:6px;border:1px solid #ddd6fe;">🚕 Transport: <strong>${place.nightInfo.transport}</strong></div>` : ''}
      </div>
      ${place.nightInfo.notes ? `<p style="font-size:11px;color:#4c1d95;margin-top:8px;line-height:1.5;background:#ede9fe;padding:8px;border-radius:6px;">${place.nightInfo.notes}</p>` : ''}
    ` : `<p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:8px;">🌙 Nighttime information unavailable.</p>`;

    const safetyContent = safety ? `
      <p style="font-size:11px;color:#0284c7;margin-bottom:10px;">Area condition data — distinct from place/property rating:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#1e293b;">
        ${safety.daytime_activity ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">☀️ Daytime: <strong>${safety.daytime_activity}</strong></div>` : ''}
        ${safety.nighttime_activity ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">🌙 Night: <strong>${safety.nighttime_activity}</strong></div>` : ''}
        ${safety.street_lighting ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">💡 Lighting: <strong>${safety.street_lighting}</strong></div>` : ''}
        ${safety.pedestrian_activity ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">🚶 Pedestrian: <strong>${safety.pedestrian_activity}</strong></div>` : ''}
        ${safety.transport_availability ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">🚕 Transport: <strong>${safety.transport_availability}</strong></div>` : ''}
        ${safety.emergency_access ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">🚑 Emergency: <strong>${safety.emergency_access}</strong></div>` : ''}
        ${(typeof safety.reported_incidents === "number") ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">🚨 Incidents: <strong>${safety.reported_incidents}</strong></div>` : ''}
        ${safety.last_updated ? `<div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e0f2fe;">📅 Updated: <strong>${safety.last_updated}</strong></div>` : ''}
      </div>
      ${safety.source ? `<p style="font-size:10px;color:#64748b;margin-top:8px;">Source: ${safety.source}</p>` : ''}
      ${daytimeContent}
      <div style="margin-top:4px;">${nightContent}</div>
    ` : `
      <p style="font-size:12px;color:#94a3b8;text-align:center;">🛡️ Safety information unavailable for this area.</p>
      ${daytimeContent}
      <div style="margin-top:4px;">${nightContent}</div>
    `;

    // --- Scam section content ---
    let scamContent;
    if (scamAlerts.length > 0) {
      scamContent = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <p style="font-size:11px;color:#881337;margin:0;">${scamAlerts.length} reported alert(s) in this area</p>
          <span style="font-size:10px;background:#ffe4e6;color:#9f1239;padding:2px 6px;border-radius:4px;font-weight:700;">PROTOTYPE DATA</span>
        </div>
        ${scamAlerts.map(alert => `
          <div style="background:#fff;border:1px solid #ffe4e6;border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-weight:700;color:#9f1239;font-size:13px;margin-bottom:4px;">• ${alert.title}</div>
            ${alert.category ? `<div style="font-size:10px;background:#ffe4e6;color:#9f1239;padding:2px 7px;border-radius:4px;display:inline-block;font-weight:600;margin-bottom:6px;">${alert.category}</div>` : ''}
            <p style="color:#475569;margin:4px 0;font-size:12px;line-height:1.5;">${alert.description}</p>
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;font-size:11px;color:#64748b;margin-top:6px;gap:4px;">
              ${alert.reported_count ? `<span>Reports: <strong>${alert.reported_count}</strong></span>` : ''}
              ${alert.last_reported ? `<span>Last: <strong>${alert.last_reported}</strong></span>` : ''}
              <span>Status: <strong style="color:${alert.verified ? '#047857' : '#d97706'};">${alert.verified ? '✓ Verified' : 'Unverified'}</strong></span>
            </div>
            ${alert.source ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px;">Source: ${alert.source}</div>` : ''}
            ${alert.recommended_action ? `
              <div style="margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px;font-size:12px;color:#065f46;">
                <strong>✅ What to do:</strong> ${alert.recommended_action}
              </div>` : ''}
          </div>
        `).join("")}
      `;
    } else {
      scamContent = `<p style="font-size:12px;color:#64748b;text-align:center;"><i class="fas fa-circle-check" style="color:#059669;"></i> No reported scam information for this area.</p>`;
    }

    // --- Fair Rate content ---
    let fairRateContent;
    if (hasFairRate) {
      fairRateContent = `
        ${Object.entries(place.fairRates).map(([type, rate]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:9px 12px;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:12px;font-weight:600;color:#374151;">${type}</span>
            <span style="font-size:13px;font-weight:800;color:#047857;">₹${rate.min}–₹${rate.median} <span style="font-size:11px;font-weight:400;color:#64748b;">(${rate.unit || 'per trip'})</span></span>
          </div>
        `).join("")}
        <p style="font-size:10px;color:#64748b;margin-top:6px;">Crowd-sourced benchmarks from verified Verida passengers. Max rates may vary with demand.</p>
      `;
    } else {
      fairRateContent = `<p style="font-size:12px;color:#94a3b8;text-align:center;">💰 Price information unavailable.</p>`;
    }

    // --- Reviews placeholder ---
    const reviewsContent = `
      <p style="font-size:12px;color:#64748b;line-height:1.6;">Reviews for this place are shown in the full Verida passenger ledger. Use <strong>Check Fair Rate</strong> below to access route-specific pricing and recent passenger records.</p>
    `;

    // === Build compact modal HTML ===
    modal.innerHTML = `
      <div class="modal-card pdm-modal-card" id="place-details-inner" onclick="event.stopPropagation()">
        <button type="button" class="modal-close-btn" id="place-details-close-btn" style="z-index:10;"><i class="fas fa-times"></i></button>

        ${heroImageHtml}

        <!-- Compact Header -->
        <div class="pdm-header">
          <div class="pdm-category-badge">
            <i class="fas fa-map-pin"></i> ${place.category || "Location"}
          </div>
          <h2 class="pdm-place-name">${place.name}</h2>
          <div class="pdm-meta-row">
            ${typeof place.rating === 'number' ? `<span class="pdm-rating">⭐ ${place.rating.toFixed(1)}</span>` : ''}
            ${distStr ? `<span class="pdm-dist">📍 ${distStr}</span>` : ''}
            ${place.locationDesc ? `<span class="pdm-location-desc">· ${place.locationDesc}</span>` : ''}
          </div>
          ${safetyStatusHtml}
          ${fairRateQuickHtml}
          ${recBannerHtml}
        </div>

        <!-- View Map Button -->
        <div class="pdm-map-trigger-row">
          <button type="button" class="pdm-view-map-btn" id="place-details-view-map-btn">
            <i class="fas fa-map-location-dot"></i> View Map
          </button>
        </div>

        <!-- Inline map — hidden by default, opens on View Map click -->
        <div id="place-details-map-wrap" style="display:none;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h4 style="font-size:13px;font-weight:800;color:#0f172a;margin:0;"><i class="fas fa-map"></i> ${place.name}</h4>
            <button type="button" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:12px;" id="place-details-map-close-btn"><i class="fas fa-times"></i> Close</button>
          </div>
          <div id="place-details-map" style="width:100%;height:240px;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;background:#f1f5f9;"></div>
          <p style="font-size:10px;color:#94a3b8;margin-top:6px;text-align:center;">Map centered on this place. Use Get Directions for route navigation.</p>
        </div>

        <!-- Expandable Accordions -->
        <div class="pdm-accordions">
          ${buildAccordion('about', 'fas fa-building', 'About This Place', 'pdm-acc-blue', aboutContent)}
          ${buildAccordion('safety', 'fas fa-shield-halved', 'Safety Information', 'pdm-acc-green', safetyContent)}
          ${buildAccordion('scam', 'fas fa-triangle-exclamation', 'Scam Awareness', 'pdm-acc-red', scamContent)}
          ${buildAccordion('fairrate', 'fas fa-coins', 'Fair Rate & Pricing', 'pdm-acc-emerald', fairRateContent)}
          ${buildAccordion('reviews', 'fas fa-star', 'Reviews & Ledger', 'pdm-acc-amber', reviewsContent)}
        </div>

        <!-- Action Buttons -->
        <div class="pdm-actions">
          <button type="button" class="btn btn-outline" style="flex:1;min-width:90px;" id="place-details-close-action">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button type="button" class="btn btn-primary" style="flex:2;min-width:130px;"
            onclick="document.getElementById('place-details-modal').classList.remove('active');document.body.style.overflow='';if(window.veridaApp)veridaApp.switchTab('transit');">
            <i class="fas fa-route"></i> Check Fair Rate
          </button>
        </div>
      </div>
    `;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) this._closePlaceDetailsModal();
    };

    // Close button
    const closeBtn = modal.querySelector("#place-details-close-btn");
    if (closeBtn) closeBtn.onclick = () => this._closePlaceDetailsModal();
    const closeAction = modal.querySelector("#place-details-close-action");
    if (closeAction) closeAction.onclick = () => this._closePlaceDetailsModal();

    // View Map button — centers map ON THE SELECTED PLACE inside VERIDA
    const viewMapBtn = modal.querySelector("#place-details-view-map-btn");
    if (viewMapBtn) {
      viewMapBtn.onclick = () => {
        const mapWrap = document.getElementById("place-details-map-wrap");
        if (!mapWrap) return;
        const alreadyVisible = mapWrap.style.display !== 'none';
        if (alreadyVisible) {
          mapWrap.style.display = 'none';
          viewMapBtn.innerHTML = '<i class="fas fa-map-location-dot"></i> View Map';
          return;
        }
        mapWrap.style.display = 'block';
        viewMapBtn.innerHTML = '<i class="fas fa-map-location-dot"></i> Hide Map';
        mapWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        const mapEl = document.getElementById('place-details-map');
        if (!mapEl || mapEl.dataset.mapInited === 'true') return;
        mapEl.dataset.mapInited = 'true';

        if (typeof google === 'undefined' || !google.maps) {
          mapEl.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;color:#64748b;gap:8px;padding:16px;text-align:center;">
            <i class="fas fa-map-location-dot" style="font-size:28px;"></i>
            <span style="font-size:12px;">Map unavailable. <a href="https://maps.google.com/?q=${place.lat},${place.lng}" target="_blank" style="color:var(--primary);">Open in Google Maps</a></span>
          </div>`;
          return;
        }

        // Center map ON THE SELECTED PLACE
        const placeMap = new google.maps.Map(mapEl, {
          center: { lat: place.lat, lng: place.lng },
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
        });

        // Place marker (primary — destination)
        new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map: placeMap,
          title: place.name,
          animation: google.maps.Animation.DROP
        });

        // User location marker (blue dot)
        new google.maps.Marker({
          position: { lat: userLoc.lat, lng: userLoc.lng },
          map: placeMap,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2
          }
        });
      };
    }

    // Close inline map
    const mapCloseBtn = modal.querySelector("#place-details-map-close-btn");
    if (mapCloseBtn) {
      mapCloseBtn.onclick = () => {
        const mapWrap = document.getElementById("place-details-map-wrap");
        if (mapWrap) mapWrap.style.display = 'none';
        const vmBtn = document.getElementById("place-details-view-map-btn");
        if (vmBtn) vmBtn.innerHTML = '<i class="fas fa-map-location-dot"></i> View Map';
      };
    }

    // Get Directions — route map between user and place
    const directionsBtn = modal.querySelector("#place-details-directions-btn");
    if (directionsBtn) {
      directionsBtn.onclick = () => {
        const mapWrap = document.getElementById("place-details-map-wrap");
        if (!mapWrap) return;
        if (mapWrap.style.display !== 'none') { mapWrap.style.display = 'none'; return; }
        mapWrap.style.display = 'block';
        mapWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const mapEl = document.getElementById('place-details-map');
        if (!mapEl || mapEl.dataset.mapInited === 'true') return;
        mapEl.dataset.mapInited = 'true';

        if (typeof google === 'undefined' || !google.maps) {
          mapEl.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;color:#64748b;gap:8px;">
            <i class="fas fa-map-location-dot" style="font-size:28px;"></i>
            <span style="font-size:12px;">Map unavailable. <a href="https://maps.google.com/?q=${place.lat},${place.lng}" target="_blank" style="color:var(--primary);">Open in Google Maps</a></span>
          </div>`;
          return;
        }

        const midLat = (userLoc.lat + place.lat) / 2;
        const midLng = (userLoc.lng + place.lng) / 2;
        const miniMap = new google.maps.Map(mapEl, {
          center: { lat: midLat, lng: midLng },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
        });
        new google.maps.Marker({
          position: { lat: userLoc.lat, lng: userLoc.lng },
          map: miniMap,
          title: 'Your Location',
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
        });
        new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map: miniMap,
          title: place.name
        });
        new google.maps.Polyline({
          path: [{ lat: userLoc.lat, lng: userLoc.lng }, { lat: place.lat, lng: place.lng }],
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: miniMap
        });
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: userLoc.lat, lng: userLoc.lng });
        bounds.extend({ lat: place.lat, lng: place.lng });
        miniMap.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
      };
    }

    // ESC key close
    this._placeDetailsEscHandler = (e) => {
      if (e.key === "Escape") this._closePlaceDetailsModal();
    };
    document.addEventListener("keydown", this._placeDetailsEscHandler);
  }

  _closePlaceDetailsModal() {
    const modal = document.getElementById("place-details-modal");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
    if (this._placeDetailsEscHandler) {
      document.removeEventListener("keydown", this._placeDetailsEscHandler);
      this._placeDetailsEscHandler = null;
    }
  }

  // --- Fly Map to Spot and Check Proximity ---
  flyAndSelect(id, lat, lng, name) {
    store.currentLocation = { lat, lng, name, accuracy: 4 };

    const locPill = document.getElementById("current-location-pill");
    if (locPill) locPill.innerHTML = `<span class="gps-live-dot"></span> ${name}`;

    if (this.map && typeof google !== "undefined") {
      this.map.panTo({ lat, lng });
      this.map.setZoom(16);
      this.renderMapLayers();
    }

    this.checkGeofenceProximity();
  }

  // --- Check Geofence Proximity & Trigger Proactive Warning ---
  checkGeofenceProximity() {
    const userLoc = store.currentLocation;
    const hotspots = store.getHotspotsForCity(store.currentCityId);
    const alertBanner = document.getElementById("hotspot-proactive-banner");

    let nearbyHotspot = null;
    let minDistance = Infinity;

    hotspots.forEach(spot => {
      const dist = digitalHandshake.calculateDistance(userLoc.lat, userLoc.lng, spot.lat, spot.lng);
      if (dist <= (spot.radius || 250) + 120) { // inside or approaching within 120m
        if (dist < minDistance) {
          minDistance = dist;
          nearbyHotspot = { ...spot, currentDistance: dist };
        }
      }
    });

    this.activeAlertHotspot = nearbyHotspot;

   /* if (alertBanner) {
      if (nearbyHotspot) {
        alertBanner.classList.remove("hidden");
        alertBanner.innerHTML = `
          <div class="alert-content">
            <div class="alert-icon-box pulse-warning"><i class="fas fa-shield-virus"></i></div>
            <div class="alert-text">
             <div class="alert-title">⚠️ Approaching Scam Hotspot: ${nearbyHotspot.name} (${minDistance}m away)</div>
              <div class="alert-desc">${nearbyHotspot.scamType}. ${nearbyHotspot.proactiveAdvice}</div>
            </div>
            <button class="alert-dismiss-btn" onclick="document.getElementById('hotspot-proactive-banner').classList.add('hidden')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
      } else {
        alertBanner.classList.add("hidden");
      }
    }*/
  }

  // Teleport user to a specific coordinate
  teleportTo(lat, lng, name) {
    this.flyAndSelect("custom", lat, lng, name);
  }
}

export const hotspotRadar = new HotspotRadar();


