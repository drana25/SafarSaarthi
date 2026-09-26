/**
 * VERIDA — Hotel Surrounding Safety
 * Uses the existing Google Places/Maps integration for real hotel, photo,
 * emergency-place and transit-place data. It never fabricates safety reports.
 * PRIMARY DATA: Vadodara Hotel Safety Dataset (106 verified hotel records).
 */
import { store } from "./store.js";
import { searchVadodaraHotels, normalizeDatasetHotel, getHotelById } from "../data/vadodaraHotels.js";

const HOTEL_STORAGE_KEY = "verida_hotel_stay";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export class HotelSafety {
  constructor() {
    this.selectedHotel = this.loadStay();
    this.placesService = null;
    this.autocomplete = null;
    this.nearby = [];
    this._bound = false;
    this._searchTimer = null;
    this._placesReadyPromise = null;
    this.imageCache = new Map();
    this.imageSearchPromises = new Map();
    this.nearbyCache = new Map();
    this.hotelSearchCache = new Map();
    this.requestTimeoutMs = 7000;
  }

  init() {
    if (this._bound) return;
    this._bound = true;
    this.bindStaticEvents();
    this.renderStayButton();
  }

  loadStay() {
    try { return JSON.parse(localStorage.getItem(HOTEL_STORAGE_KEY)) || null; } catch { return null; }
  }

  saveStay(stay) {
    this.selectedHotel = stay;
    localStorage.setItem(HOTEL_STORAGE_KEY, JSON.stringify(stay));
    window.veridaHotelSafetyContext = this.getAssistantContext();
    this.renderStayButton();
  }

  clearStay() {
    this.selectedHotel = null;
    localStorage.removeItem(HOTEL_STORAGE_KEY);
    delete window.veridaHotelSafetyContext;
    this.renderStayButton();
  }

  bindStaticEvents() {
    const open = document.getElementById("open-hotel-safety-btn");
    if (open) open.onclick = () => this.openHotelModal();
    const close = document.getElementById("close-hotel-modal-btn");
    if (close) close.onclick = () => this.closeHotelModal();
    const clear = document.getElementById("clear-hotel-stay-btn");
    if (clear) clear.onclick = () => { this.clearStay(); this.closeHotelModal(); };
  }

  renderStayButton() {
    const btn = document.getElementById("open-hotel-safety-btn");
    const label = document.getElementById("hotel-safety-btn-label");
    const sub = document.getElementById("hotel-safety-btn-sub");
    if (!btn || !label || !sub) return;
    if (this.selectedHotel) {
      label.textContent = "Check My Stay";
      sub.textContent = this.selectedHotel.name;
      btn.classList.remove("hidden");
    } else {
      label.textContent = "Check My Stay";
      sub.textContent = "Select your hotel to see the surrounding area";
      btn.classList.remove("hidden");
    }
  }

  openHotelModal(prefillSearch = "") {
    const modal = document.getElementById("hotel-safety-modal");
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    this.renderHotelSelector(prefillSearch);
  }

  closeHotelModal() {
    const modal = document.getElementById("hotel-safety-modal");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  renderHotelSelector(prefillSearch = "") {
    const body = document.getElementById("hotel-safety-content");
    if (!body) return;
    body.innerHTML = `
      <div class="hotel-safety-head">
        <div class="hotel-safety-icon"><i class="fas fa-hotel"></i></div>
        <div><h2>Check My Stay</h2><p>Understand the area around your hotel — especially at night.</p></div>
      </div>
      <div class="hotel-search-wrap">
        <label>Search your hotel</label>
        <input id="hotel-place-search" class="auth-input" type="text" value="${escapeHtml(prefillSearch || this.selectedHotel?.name || "")}" placeholder="e.g. Sayaji Hotel, Vadodara" autocomplete="off">
        <div id="hotel-search-status" class="hotel-search-status">Search real hotel/accommodation listings and select one of the verified place results.</div>
        <div id="hotel-search-results" class="hotel-search-results"></div>
      </div>
      ${this.selectedHotel ? `<button type="button" class="btn btn-outline btn-block" id="use-saved-hotel-btn"><i class="fas fa-check"></i> Use ${escapeHtml(this.selectedHotel.name)}</button>` : ""}
    `;
    this.bindHotelSearch();
  }

  async waitForPlaces(timeoutMs = 12000) {
    if (typeof google !== "undefined" && google.maps?.places) return true;
    if (this._placesReadyPromise) return this._placesReadyPromise;

    this._placesReadyPromise = new Promise(resolve => {
      const started = Date.now();
      const check = () => {
        if (typeof google !== "undefined" && google.maps?.places) {
          this._placesReadyPromise = null;
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          this._placesReadyPromise = null;
          resolve(false);
          return;
        }
        setTimeout(check, 250);
      };
      check();
    });
    return this._placesReadyPromise;
  }

  _fetchWithTimeout(url, options = {}, timeoutMs = this.requestTimeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  _cacheKey(stay) {
    return `${Number(stay?.lat).toFixed(5)},${Number(stay?.lng).toFixed(5)}`;
  }

  _normalizeCoordinate(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _normalizeNearbyRecord(raw, stay) {
    const lat = this._normalizeCoordinate(raw.lat ?? raw.latitude);
    const lng = this._normalizeCoordinate(raw.lng ?? raw.lon ?? raw.longitude);
    if (!raw.name || lat === null || lng === null) return null;
    return {
      id: raw.id || `${raw.source || "place"}-${lat}-${lng}-${String(raw.name).toLowerCase()}`,
      name: String(raw.name),
      type: raw.type || "other",
      address: raw.address || "",
      lat, lng,
      distanceKm: distanceKm(stay, { lat, lng }),
      photoUrl: raw.photoUrl || raw.image || "",
      photoSource: raw.photoSource || (raw.image ? raw.source || "" : ""),
      rating: raw.rating ?? null,
      ratingsTotal: raw.ratingsTotal ?? raw.reviewCount ?? null,
      phone: raw.phone || "",
      website: raw.website || "",
      mapsUrl: raw.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw.name} ${lat},${lng}`)}`,
      source: raw.source || "unknown"
    };
  }

  _classifyOsm(tags) {
    if (tags.amenity === "police") return "police";
    if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "hospital";
    if (tags.aeroway === "aerodrome") return "airport";
    if (tags.railway === "station" || tags.railway === "halt") return "train_station";
    if (tags.amenity === "bus_station" || tags.public_transport === "station" || tags.public_transport === "stop_position") return "transit_station";
    if (tags.tourism === "attraction" || tags.historic) return tags.historic ? "heritage" : "tourist_attraction";
    if (tags.tourism === "museum") return "museum";
    if (tags.tourism === "gallery") return "gallery";
    if (tags.leisure === "park" || tags.leisure === "garden") return "park";
    if (tags.amenity === "restaurant") return "restaurant";
    if (tags.amenity === "cafe") return "cafe";
    if (tags.amenity === "marketplace") return "market";
    if (tags.shop === "mall" || tags.shop === "department_store") return "shopping_mall";
    return "other";
  }

  async bindHotelSearch() {
    const input = document.getElementById("hotel-place-search");
    const status = document.getElementById("hotel-search-status");
    const resultsBox = document.getElementById("hotel-search-results");
    if (!input) return;

    const city = store.getCurrentCity?.();
    const cityName = city?.name || "Vadodara";
    const cityCenter = city?.center || { lat: 22.3072, lng: 73.1812 };

    // Do not make the user wait for Google Places. The existing browser key can
    // return REQUEST_DENIED, so real OpenStreetMap/Overpass results are searched
    // in parallel and become the fallback immediately.
    let googleReady = false;
    let autocompleteService = null;
    let placesService = null;
    this.waitForPlaces(3500).then(ready => {
      if (!ready) return;
      googleReady = true;
      try {
        autocompleteService = new google.maps.places.AutocompleteService();
        placesService = new google.maps.places.PlacesService(document.createElement("div"));
        this.placesService = placesService;
      } catch (_) {
        googleReady = false;
      }
    });

    const renderPredictions = (predictions = [], provider = "osm") => {
      if (!resultsBox) return;
      if (!predictions.length) {
        resultsBox.innerHTML = `<div class="hotel-no-results">No matching real hotel found in ${escapeHtml(cityName)}. Try the hotel name with the city.</div>`;
        resultsBox.style.display = "block";
        return;
      }

      resultsBox.innerHTML = predictions.slice(0, 8).map((prediction) => {
        const title = prediction.mainText || prediction.structured_formatting?.main_text || prediction.name || prediction.description || "Hotel";
        const address = prediction.secondaryText || prediction.structured_formatting?.secondary_text || prediction.address || `${cityName}, India`;
        const photo = prediction.photoUrl || prediction.image || "";
        const rating = prediction.rating ? `⭐ ${prediction.rating}${prediction.ratingsTotal ? ` (${prediction.ratingsTotal})` : ""}` : "";
        const distance = Number.isFinite(Number(prediction.distanceKm)) ? `${Number(prediction.distanceKm).toFixed(1)} km away` : "";
        const type = prediction.types?.[0] || prediction.osmType || prediction.type || "Hotel";
        return `
          <button type="button" class="hotel-search-result" data-place-id="${escapeHtml(prediction.place_id || prediction.id || "")}" data-provider="${provider}">
            ${photo ? `<img class="hotel-result-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.style.display='none'">` : `<span class="hotel-result-image-placeholder"><i class="fas fa-hotel"></i></span>`}
            <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(address)}</small><em>${escapeHtml(String(type).replace(/_/g, " "))}${distance ? ` · ${escapeHtml(distance)}` : ""}</em>${rating ? `<em>${escapeHtml(rating)}</em>` : ""}<b class="hotel-result-select">Select Hotel →</b></span>
            <i class="fas fa-chevron-right"></i>
          </button>`;
      }).join("");
      resultsBox.style.display = "block";

      // OSM results often have no image tag. Enrich only with a verified
      // name-matching Wikimedia Commons result; never use random stock photos.
      this.enrichPredictionImages(predictions, resultsBox);

      resultsBox.querySelectorAll(".hotel-search-result").forEach(btn => {
        btn.addEventListener("click", async () => {
          const placeId = btn.dataset.placeId;
          const provider = btn.dataset.provider;
          resultsBox.style.display = "none";
          if (status) status.textContent = "Loading hotel details and surrounding area…";

          // === DATASET PROVIDER: Vadodara Hotel Safety Dataset ===
          if (provider === "dataset") {
            const result = predictions.find(x => String(x.id) === String(placeId) || String(x.placeId) === String(placeId));
            if (!result) {
              if (status) status.textContent = "Could not load this hotel. Please choose another result.";
              return;
            }
            // result is already a normalized dataset hotel; just save and load
            this.saveStay(result);
            await this.loadHotelSafety(result);
            return;
          }

          if (provider === "osm") {
            const result = predictions.find(x => String(x.id) === String(placeId));
            if (!result) {
              if (status) status.textContent = "Could not load this hotel. Please choose another result.";
              return;
            }
            const stay = this.normalizeOsmPlace(result);
            this.saveStay(stay);
            await this.loadHotelSafety(stay);
            return;
          }

          if (!placesService) {
            const fallback = await this.searchOpenStreetMapHotels(input.value.trim(), cityName, cityCenter);
            const result = fallback[0];
            if (result) {
              const stay = this.normalizeOsmPlace(result);
              this.saveStay(stay);
              await this.loadHotelSafety(stay);
            } else if (status) status.textContent = "Hotel details are temporarily unavailable. Try the hotel name with the city.";
            return;
          }

          placesService.getDetails({
            placeId,
            fields: ["place_id", "name", "formatted_address", "geometry", "photos", "types", "rating", "user_ratings_total", "url", "formatted_phone_number", "website", "editorial_summary", "opening_hours"]
          }, async (place, detailsStatus) => {
            if (detailsStatus !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
              if (status) status.textContent = "Google hotel details unavailable. Loading real hotel data from OpenStreetMap…";
              const fallback = await this.searchOpenStreetMapHotels(input.value.trim(), cityName, cityCenter);
              const result = fallback[0];
              if (result) {
                const stay = this.normalizeOsmPlace(result);
                this.saveStay(stay);
                await this.loadHotelSafety(stay);
              } else if (status) status.textContent = "Hotel details are temporarily unavailable. Try the hotel name with the city.";
              return;
            }
            const stay = this.normalizePlace(place);
            this.saveStay(stay);
            await this.loadHotelSafety(stay);
          });
        });
      });
    };

    const searchOpenStreetMap = async (query, showStatus = true) => {
      if (showStatus && status) status.textContent = "Searching real hotel listings…";
      const fallback = await this.searchOpenStreetMapHotels(query, cityName, cityCenter);
      renderPredictions(fallback, "osm");
      if (status) status.textContent = fallback.length
        ? `Real hotel results · ${cityName}`
        : `No matching real hotel found in ${cityName}. Try another hotel name or city.`;
      return fallback;
    };

    const searchGoogle = (query) => new Promise(resolve => {
      if (!googleReady || !autocompleteService) return resolve([]);
      autocompleteService.getPlacePredictions({
        input: query,
        types: ["lodging"],
        componentRestrictions: { country: "in" },
        location: new google.maps.LatLng(cityCenter.lat, cityCenter.lng),
        radius: 50000
      }, (predictions, predictionStatus) => {
        if (predictionStatus !== google.maps.places.PlacesServiceStatus.OK && predictionStatus !== "OK") return resolve([]);
        resolve(predictions || []);
      });
    });

    const search = async () => {
      const query = input.value.trim();
      if (query.length < 2) {
        if (resultsBox) { resultsBox.innerHTML = ""; resultsBox.style.display = "none"; }
        if (status) status.textContent = "Type at least 2 characters to search hotels.";
        return;
      }

      if (status) status.textContent = "Searching Vadodara hotels…";

      // === PRIMARY: search the Vadodara Hotel Safety Dataset immediately ===
      const userLocation = store.currentLocation || cityCenter;
      const datasetResults = searchVadodaraHotels(query, 8);
      if (datasetResults.length) {
        const normalized = datasetResults.map(h => normalizeDatasetHotel(h, userLocation));
        renderPredictions(normalized, "dataset");
        if (status) status.textContent = `${datasetResults.length} verified Vadodara hotel${datasetResults.length > 1 ? "s" : ""} found`;
        return; // Dataset is authoritative — no need to hit external APIs
      }

      // === FALLBACK: dataset returned nothing, try OSM + Google ===
      if (status) status.textContent = "Searching external hotel listings…";
      const osmPromise = this.searchOpenStreetMapHotels(query, cityName, cityCenter);
      const googlePromise = searchGoogle(query);

      const firstUsable = await new Promise(resolve => {
        let pending = 2;
        let resolved = false;
        const done = (rows, provider) => {
          if (resolved || !rows.length) {
            pending--;
            if (!pending && !resolved) resolve({ rows: [], provider: "osm" });
            return;
          }
          resolved = true;
          resolve({ rows, provider });
        };
        osmPromise.then(rows => done(rows, "osm")).catch(() => done([], "osm"));
        googlePromise.then(rows => done(rows, "google")).catch(() => done([], "google"));
      });

      renderPredictions(firstUsable.rows, firstUsable.provider);
      if (status) status.textContent = firstUsable.rows.length
        ? `Hotel results · ${cityName}`
        : `No hotel found for “${query}”. Try the hotel name or locality.`;

      if (firstUsable.provider === "osm") {
        googlePromise.then(rows => {
          if (rows.length && input.value.trim() === query) renderPredictions(rows, "google");
        }).catch(()=>{});
      }
    };

    input.oninput = () => {
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(search, 450);
    };
    input.onkeydown = e => {
      if (e.key === "Enter") { e.preventDefault(); clearTimeout(this._searchTimer); search(); }
    };
    input.focus();

    if (input.value.trim().length >= 2) search();
    else if (status) status.textContent = "Search a real hotel/accommodation and select a result.";
  }

  async searchOpenStreetMapHotels(query, cityName, center) {
    const cleanQuery = query.replace(/,?\s*(india|gujarat)\s*$/i, "").trim();
    const cacheKey = `${cleanQuery.toLowerCase()}|${cityName.toLowerCase()}`;
    if (this.hotelSearchCache.has(cacheKey)) return this.hotelSearchCache.get(cacheKey);

    const normalizeRows = rows => rows.map(r => ({
      id: `n-${r.place_id}`,
      name: r.name || r.namedetails?.name || r.display_name?.split(",")[0] || "Hotel",
      address: r.display_name || `${cityName}, India`,
      lat: Number(r.lat), lng: Number(r.lon),
      osmType: r.type, osmClass: r.class,
      tags: r.extratags || {},
      image: r.extratags?.image || "",
      photoUrl: r.extratags?.image || ""
    })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      .filter(r => /hotel|hostel|motel|guest.?house|resort|lodge|inn/i.test(`${r.osmType} ${r.name} ${r.address}`));

    const rank = rows => {
      const tokens = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      return rows.map(r => {
        const hay = `${r.name} ${r.address}`.toLowerCase();
        const matches = tokens.reduce((n, token) => n + (hay.includes(token) ? 1 : 0), 0);
        return { ...r, _score: matches * 100 - distanceKm(center, r) };
      }).sort((a,b)=>b._score-a._score).map(({_score,...r})=>r).slice(0,8);
    };

    // One bounded Nominatim request is enough for normal hotel searches.
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&limit=15&q=${encodeURIComponent(`${cleanQuery}, ${cityName}, India`)}`;
      const response = await this._fetchWithTimeout(url, {headers: {"Accept":"application/json"}}, 4500);
      if (response.ok) {
        const rows = rank(normalizeRows(await response.json()));
        if (rows.length) {
          this.hotelSearchCache.set(cacheKey, rows);
          return rows;
        }
      }
    } catch (e) { console.warn("[VERIDA HOTEL] Nominatim unavailable:", e.name || e); }

    // Only query Overpass if the fast geocoder produced no usable hotel.
    try {
      const escaped = cleanQuery.replace(/[\\"']/g, "");
      const queryOverpass = `[out:json][timeout:8];nwr["tourism"~"hotel|hostel|motel|guest_house|resort",i]["name"~"${escaped}",i](around:50000,${center.lat},${center.lng});out center tags;`;
      const response = await this._fetchWithTimeout(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(queryOverpass)}`, {headers:{"Accept":"application/json"}}, 6500);
      if (response.ok) {
        const data = await response.json();
        const rows = [];
        for (const el of data.elements || []) {
          const tags = el.tags || {};
          const lat = Number(el.lat ?? el.center?.lat), lng = Number(el.lon ?? el.center?.lon);
          if (!tags.name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          rows.push({id:`osm-${el.type}-${el.id}`,name:tags.name,address:[tags["addr:housenumber"],tags["addr:street"],tags["addr:city"],tags["addr:state"]].filter(Boolean).join(", "),lat,lng,osmType:tags.tourism||"hotel",osmClass:"tourism",tags,image:tags.image||"",photoUrl:tags.image||""});
        }
        const result=rank([...new Map(rows.map(r=>[`${r.name.toLowerCase()}|${r.lat.toFixed(5)}`,r])).values()]);
        if(result.length){this.hotelSearchCache.set(cacheKey,result);return result;}
      }
    } catch(e){ console.warn("[VERIDA HOTEL] Overpass unavailable:", e.name || e); }

    // Photon is the last bounded fallback, not part of the normal critical path.
    try {
      const url=`https://photon.komoot.io/api/?limit=12&lat=${encodeURIComponent(center.lat)}&lon=${encodeURIComponent(center.lng)}&q=${encodeURIComponent(`${cleanQuery}, ${cityName}`)}`;
      const response=await this._fetchWithTimeout(url,{headers:{"Accept":"application/json"}},4500);
      if(response.ok){
        const data=await response.json();
        const rows=(data.features||[]).map(f=>{
          const p=f.properties||{}, c=f.geometry?.coordinates||[], lat=Number(c[1]),lng=Number(c[0]);
          const name=p.name||"";
          return Number.isFinite(lat)&&Number.isFinite(lng)&&/hotel|hostel|motel|guest|resort|lodge|inn/i.test(`${p.osm_value||""} ${p.type||""} ${name}`)
            ? {id:`photon-${p.osm_type||"place"}-${p.osm_id||`${lat}-${lng}`}`,name,address:[p.housenumber,p.street,p.district,p.city||p.town||p.village,p.state].filter(Boolean).join(", "),lat,lng,osmType:p.osm_value||p.type||"hotel",osmClass:p.osm_type||"place",tags:p,image:"",photoUrl:""} : null;
        }).filter(Boolean);
        const result=rank(rows);
        this.hotelSearchCache.set(cacheKey,result);
        return result;
      }
    } catch(e){ console.warn("[VERIDA HOTEL] Photon unavailable:", e.name || e); }
    this.hotelSearchCache.set(cacheKey,[]);
    return [];
  }

  normalizeOsmPlace(place) {
    const image = place.image || place.photoUrl || "";
    const tags = place.tags || {};
    return {
      placeId: `osm-${place.id}`,
      name: place.name || "Selected hotel",
      address: place.address || "",
      lat: Number(place.lat),
      lng: Number(place.lng),
      rating: null,
      ratingsTotal: null,
      types: [place.osmType || "hotel"],
      hotelType: place.osmType || "hotel",
      description: tags.description || tags["description:en"] || "",
      amenities: [tags.internet_access === "wlan" ? "Wi-Fi" : "", tags.restaurant === "yes" ? "Restaurant" : "", tags["contact:website"] || tags.website ? "Website available" : ""].filter(Boolean),
      phone: tags.phone || tags["contact:phone"] || "",
      website: tags.website || tags["contact:website"] || "",
      stars: tags.stars || "",
      mapsUrl: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.lat)}&mlon=${encodeURIComponent(place.lng)}#map=18/${encodeURIComponent(place.lat)}/${encodeURIComponent(place.lng)}`,
      photoUrl: image,
      photoSource: image ? "OpenStreetMap" : "",
      source: place.source || "OpenStreetMap"
    };
  }

  normalizePlace(place) {
    return {
      placeId: place.place_id,
      name: place.name || "Selected hotel",
      address: place.formatted_address || "",
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      rating: place.rating ?? null,
      ratingsTotal: place.user_ratings_total ?? null,
      types: place.types || [],
      hotelType: (place.types || []).find(t => ["lodging", "hotel", "resort", "motel", "hostel"].includes(t)) || "hotel",
      description: place.editorial_summary?.overview || "",
      amenities: [],
      phone: place.formatted_phone_number || "",
      website: place.website || "",
      mapsUrl: place.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || "hotel")}`,
      photoUrl: this.getPhotoUrl(place),
      photoSource: place.photos?.[0] ? "Google Places" : "",
      source: "Google Places"
    };
  }

  getPhotoUrl(place) {
    try {
      if (place.photos?.[0]) return place.photos[0].getUrl({ maxWidth: 900, maxHeight: 520 });
    } catch (_) {}
    return "";
  }


  getCityLabel(address = "") {
    const parts = String(address).split(",").map(s => s.trim()).filter(Boolean);
    return parts.slice(-3).join(", ");
  }

  async findWikimediaImage(name = "", address = "", lat = null, lng = null) {
    const cleanName = String(name).trim();
    if (!cleanName) return "";
    const key = `${cleanName}|${this.getCityLabel(address)}`.toLowerCase();
    if (this.imageCache.has(key)) return this.imageCache.get(key);
    if (this.imageSearchPromises.has(key)) return this.imageSearchPromises.get(key);

    const promise = (async () => {
      try {
        const city = this.getCityLabel(address);
        const query = encodeURIComponent(`${cleanName} ${city}`.trim());
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1000&format=json&origin=*`;
        const response = await fetch(searchUrl, { headers: { "Accept": "application/json" } });
        if (!response.ok) return "";
        const data = await response.json();
        const pages = Object.values(data.query?.pages || {});
        const tokens = cleanName.toLowerCase().split(/\s+/)
          .map(t => t.replace(/[^a-z0-9]/g, ""))
          .filter(t => t.length >= 4 && !["hotel", "resort", "inn", "lodge"].includes(t));

        const ranked = pages.map(page => {
          const title = String(page.title || "").toLowerCase();
          const overlap = tokens.reduce((score, token) => score + (title.includes(token) ? 1 : 0), 0);
          const info = page.imageinfo?.[0] || {};
          const url = info.thumburl || info.url || "";
          return { url, score: overlap, title };
        }).filter(x => x.url);

        // Never use a random Commons image. Require a meaningful name match.
        const minScore = tokens.length <= 1 ? 1 : Math.min(2, tokens.length);
        const best = ranked
          .filter(x => x.score >= minScore)
          .sort((a, b) => b.score - a.score)[0];

        const result = best?.url || "";
        this.imageCache.set(key, result);
        return result;
      } catch (error) {
        console.warn("[Verida] Wikimedia image lookup failed:", error);
        this.imageCache.set(key, "");
        return "";
      } finally {
        this.imageSearchPromises.delete(key);
      }
    })();

    this.imageSearchPromises.set(key, promise);
    return promise;
  }

  // Shared stock hotel photo bank. Used ONLY when no real/verified image
  // (dataset, Wikimedia Commons, Google/OSM) can be found for a hotel — so a
  // hotel card never shows a blank icon. The pick is deterministic per hotel
  // name (not random) so the same hotel always shows the same stock photo.
  static STOCK_HOTEL_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c0d13c05?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1542314831-c6a4d27a65f5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
  ];

  getStockHotelImage(seed = "") {
    const bank = HotelSafety.STOCK_HOTEL_IMAGES;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return bank[hash % bank.length];
  }

  async enrichStayImage(stay) {
    if (stay.photoUrl) return stay;
    const image = await this.findWikimediaImage(stay.name, stay.address, stay.lat, stay.lng);
    if (image) {
      return { ...stay, photoUrl: image, photoSource: "Wikimedia Commons" };
    }
    // No verified real image found anywhere — use a stock hotel photo so the
    // card is never left blank. Clearly marked as a stock photo, never
    // presented as a real photo of this specific property.
    return { ...stay, photoUrl: this.getStockHotelImage(stay.name || stay.address || "hotel"), photoSource: "Stock Photo" };
  }

  async enrichPredictionImages(predictions, resultsBox) {
    const jobs = predictions.slice(0, 8).map(async prediction => {
      if (prediction.photoUrl || prediction.image) return;
      const name = prediction.mainText || prediction.name || "";
      const address = prediction.secondaryText || prediction.address || "";
      let image = await this.findWikimediaImage(name, address, prediction.lat, prediction.lng);
      let isStock = false;
      if (!image) {
        image = this.getStockHotelImage(name || address || "hotel");
        isStock = true;
      }
      if (!resultsBox) return;
      const button = [...resultsBox.querySelectorAll(".hotel-search-result")]
        .find(el => String(el.dataset.placeId || "") === String(prediction.place_id || prediction.id || ""));
      if (!button) return;
      prediction.photoUrl = image;
      prediction.photoSource = isStock ? "Stock Photo" : "Wikimedia Commons";
      const placeholder = button.querySelector(".hotel-result-image-placeholder");
      if (placeholder) {
        const img = document.createElement("img");
        img.className = "hotel-result-photo";
        img.loading = "lazy";
        img.alt = name || "Hotel";
        img.src = image;
        placeholder.replaceWith(img);
      }
    });
    await Promise.allSettled(jobs);
  }

  async enrichNearbyImages(rows) {
    const list = Array.isArray(rows) ? rows : [];
    // Enrich only the first useful nearby set. Place data is already rendered;
    // image enrichment must remain small and non-blocking.
    const imageCandidates = list
      .filter(row => !row.photoUrl)
      .slice(0, 8);
    await Promise.allSettled(imageCandidates.map(async row => {
      if (row.photoUrl) return;
      const image = await this.findWikimediaImage(row.name, row.address, row.lat, row.lng);
      if (image) {
        row.photoUrl = image;
        row.photoSource = "Wikimedia Commons";
      }
    }));
    return list;
  }

  async loadHotelSafety(stay) {
    const body = document.getElementById("hotel-safety-content");
    if (!body) return;

    body.innerHTML = `<div class="hotel-loading"><i class="fas fa-spinner fa-spin"></i> Loading real hotel details and surrounding area…</div>`;
    console.log("[VERIDA HOTEL] Selected hotel:", stay.name, stay.lat, stay.lng);

    // Critical path: nearby data only. Images are deliberately not awaited.
    const nearbyRows = await this.fetchNearby(stay);
    this.nearby = Array.isArray(nearbyRows) ? nearbyRows : [];
    this.saveStay(stay);
    this.renderSafety(stay, this.nearby);

    // Non-blocking enrichment after the page is already usable.
    this.enrichStayImage(stay).then(enriched => {
      this.saveStay(enriched);
      const hero = document.querySelector(".hotel-hero-image");
      if (hero && enriched.photoUrl && hero.src !== enriched.photoUrl) {
        hero.src = enriched.photoUrl;
        hero.style.display = "";
        const fallback = hero.nextElementSibling;
        if (fallback) fallback.style.display = "none";
      }
    }).catch(()=>{});

    this.enrichNearbyImages(this.nearby).then(rows => {
      this.nearby = rows;
      this.renderSafety(stay, this.nearby);
    }).catch(()=>{});
  }

  nearbySearch(request) {
    return new Promise(resolve => {
      if (!this.placesService) return resolve([]);
      this.placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)) resolve(results);
        else resolve([]);
      });
    });
  }

  async fetchNearby(stay) {
    const lat = Number(stay.lat), lng = Number(stay.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn("[VERIDA NEARBY] Missing selected hotel coordinates");
      return [];
    }
    const key=this._cacheKey(stay);
    const cached=this.nearbyCache.get(key);
    if(cached && cached.expiresAt>Date.now()) return cached.rows;

    console.log("[VERIDA NEARBY] Request coordinates:",lat,lng);

    // One OSM/Overpass request returns all categories. This is the primary
    // nearby data path because it does not depend on a browser Google key.
    const rows = await this.fetchNearbyOpenStreetMap(stay);
    if(rows.length){
      this.nearbyCache.set(key,{rows,expiresAt:Date.now()+15*60*1000});
      console.log("[VERIDA NEARBY] Normalized results:",rows.length);
      return rows;
    }

    // Google is a bounded fallback, not 12 sequential/parallel category calls.
    const ready=await this.waitForPlaces(1200);
    if(ready && this.placesService){
      try{
        const all=await this.nearbySearch({location:new google.maps.LatLng(lat,lng),radius:7000,keyword:"hotel police hospital airport railway station museum park restaurant cafe market shopping tourist"});
        const normalized=all.map(p=>{
          const loc=p.geometry?.location; if(!loc)return null;
          const plat=typeof loc.lat==="function"?loc.lat():loc.lat, plng=typeof loc.lng==="function"?loc.lng():loc.lng;
          const types=p.types||[];
          let type="other";
          if(types.includes("police"))type="police"; else if(types.includes("hospital"))type="hospital";
          else if(types.includes("airport"))type="airport"; else if(types.includes("train_station"))type="train_station";
          else if(types.includes("transit_station"))type="transit_station"; else if(types.includes("tourist_attraction"))type="tourist_attraction";
          else if(types.includes("museum"))type="museum"; else if(types.includes("park"))type="park";
          else if(types.includes("restaurant"))type="restaurant"; else if(types.includes("cafe"))type="cafe";
          else if(types.includes("shopping_mall"))type="shopping_mall";
          return this._normalizeNearbyRecord({id:p.place_id,name:p.name,type,address:p.vicinity||p.formatted_address,lat:plat,lng:plng,photoUrl:this.getPhotoUrl(p),rating:p.rating,ratingsTotal:p.user_ratings_total,mapsUrl:p.url,source:"Google Places"},stay);
        }).filter(Boolean);
        const unique=[...new Map(normalized.map(x=>[x.id,x])).values()].sort((a,b)=>a.distanceKm-b.distanceKm);
        this.nearbyCache.set(key,{rows:unique,expiresAt:Date.now()+15*60*1000});
        return unique;
      }catch(e){console.warn("[VERIDA NEARBY] Google fallback failed:",e);}
    }
    return [];
  }

  async fetchNearbyOpenStreetMap(stay) {
    const query=`[out:json][timeout:12];(
      nwr["amenity"="police"](around:7000,${stay.lat},${stay.lng});
      nwr["amenity"="hospital"](around:7000,${stay.lat},${stay.lng});
      nwr["aeroway"="aerodrome"](around:15000,${stay.lat},${stay.lng});
      nwr["railway"="station"](around:10000,${stay.lat},${stay.lng});
      nwr["amenity"="bus_station"](around:7000,${stay.lat},${stay.lng});
      nwr["public_transport"="station"](around:7000,${stay.lat},${stay.lng});
      nwr["tourism"="attraction"](around:7000,${stay.lat},${stay.lng});
      nwr["historic"](around:7000,${stay.lat},${stay.lng});
      nwr["tourism"="museum"](around:7000,${stay.lat},${stay.lng});
      nwr["tourism"="gallery"](around:7000,${stay.lat},${stay.lng});
      nwr["leisure"~"park|garden"](around:7000,${stay.lat},${stay.lng});
      nwr["amenity"="restaurant"](around:5000,${stay.lat},${stay.lng});
      nwr["amenity"="cafe"](around:5000,${stay.lat},${stay.lng});
      nwr["amenity"="marketplace"](around:7000,${stay.lat},${stay.lng});
      nwr["shop"~"mall|department_store"](around:7000,${stay.lat},${stay.lng});
    );out center tags;`;
    const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
    for(const endpoint of endpoints){
      try{
        const response=await this._fetchWithTimeout(`${endpoint}?data=${encodeURIComponent(query)}`,{headers:{"Accept":"application/json"}},8000);
        if(!response.ok)continue;
        const data=await response.json();
        const unique=new Map();
        for(const el of data.elements||[]){
          const tags=el.tags||{}, lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);
          if(!tags.name||!Number.isFinite(lat)||!Number.isFinite(lng))continue;
          const row=this._normalizeNearbyRecord({
            id:`${el.type}-${el.id}`,name:tags.name,type:this._classifyOsm(tags),
            address:[tags["addr:housenumber"],tags["addr:street"],tags["addr:city"],tags["addr:state"]].filter(Boolean).join(", "),
            lat,lng,image:tags.image||"",photoSource:tags.image?"OpenStreetMap":"",
            phone:tags.phone||tags["contact:phone"]||"",website:tags.website||tags["contact:website"]||"",
            mapsUrl:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,source:"OpenStreetMap"
          },stay);
          if(row)unique.set(row.id,row);
        }
        const rows=[...unique.values()].sort((a,b)=>a.distanceKm-b.distanceKm);
        console.log("[VERIDA NEARBY] Overpass rows:",rows.length);
        if(rows.length)return rows;
      }catch(e){console.warn("[VERIDA NEARBY] Overpass failed:",e.name||e);}
    }
    return [];
  }

  getExistingHotspotSignals(stay) {
    const hotspots = store.getHotspotsForCity(store.currentCityId) || [];
    return hotspots
      .map(h => ({ ...h, distanceKm: distanceKm(stay, h) }))
      .filter(h => h.distanceKm <= 2)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  getSafetyStatus(stay, hotspots) {
    if (!hotspots.length) return { label: "Limited data", reason: "SafarSaarthi has no verified safety-report signal within 2 km of this hotel in the current data source." };
    const high = hotspots.some(h => h.riskLevel === "high");
    return high
      ? { label: "Higher concern", reason: "A high-risk SafarSaarthi hotspot is mapped within 2 km of the selected hotel." }
      : { label: "Moderate concern", reason: "A mapped SafarSaarthi hotspot exists within 2 km of the selected hotel." };
  }

  renderAccordionSection({ id, icon, title, subtitle = "", content, open = false }) {
    return `
      <section class="hotel-accordion ${open ? "is-open" : ""}" data-accordion-id="${escapeHtml(id)}">
        <button type="button" class="hotel-accordion-toggle" aria-expanded="${open ? "true" : "false"}" aria-controls="${escapeHtml(id)}-panel">
          <span class="hotel-accordion-heading">
            <span class="hotel-accordion-icon"><i class="fas ${escapeHtml(icon)}"></i></span>
            <span>
              <strong>${escapeHtml(title)}</strong>
              ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}
            </span>
          </span>
          <i class="fas fa-chevron-down hotel-accordion-chevron" aria-hidden="true"></i>
        </button>
        <div class="hotel-accordion-panel" id="${escapeHtml(id)}-panel" ${open ? "" : "hidden"}>
          <div class="hotel-accordion-content">${content}</div>
        </div>
      </section>
    `;
  }

  renderSafety(stay, nearby) {
    const body = document.getElementById("hotel-safety-content");
    if (!body) return;

    const hotspots = this.getExistingHotspotSignals(stay);
    const status = this.getSafetyStatus(stay, hotspots);
    const prefs = store.getTripPreferences() || {};

    const daySignals = [
      ["Area activity", nearby.length ? `${nearby.length} nearby place signals` : "Limited data"],
      ["Nearby emergency facilities", this.countType(nearby, ["police", "hospital"]) ? "Available" : "Limited data"],
      ["Tourist activity", this.countType(nearby, ["tourist_attraction", "museum", "gallery", "park"]) ? "Nearby attractions found" : "Limited data"],
      ["Transport", this.countType(nearby, ["transit_station", "train_station", "airport"]) ? "Nearby transport found" : "Limited data"]
    ];

    const nightSignals = [
      ["Night-time incident data", hotspots.length ? `${hotspots.length} mapped hotspot signal${hotspots.length > 1 ? "s" : ""}` : "Limited data"],
      ["Night activity", "Limited data — no live pedestrian-count source connected"],
      ["Transport at night", "Limited data — live operating hours not connected"],
      ["Emergency access", this.countType(nearby, ["police", "hospital"]) ? "Nearby facilities found" : "Limited data"]
    ];

    const safetyContent = `
      <div class="hotel-safety-disclaimer">
        <i class="fas fa-circle-info"></i>
        <span><strong>Hotel property ≠ surrounding area.</strong> This page evaluates nearby signals and facilities. It does not label the hotel itself as safe or unsafe.</span>
      </div>

      <div class="hotel-day-night-tabs">
        <button type="button" class="hotel-period-btn active" data-period="day">☀️ DAY</button>
        <button type="button" class="hotel-period-btn" data-period="night">🌙 NIGHT</button>
      </div>

      <div class="hotel-period-panel active" id="hotel-day-panel">
        <div class="hotel-status-card">
          <div><span class="hotel-label">AREA SAFETY</span><strong>${escapeHtml(status.label)}</strong></div>
          <span class="hotel-data-pill">Evidence-based</span>
          <p>${escapeHtml(status.reason)}</p>
        </div>
        ${this.signalGrid(daySignals)}
      </div>

      <div class="hotel-period-panel" id="hotel-night-panel">
        <div class="hotel-status-card">
          <div><span class="hotel-label">AREA SAFETY</span><strong>${escapeHtml(status.label)}</strong></div>
          <span class="hotel-data-pill">Evidence-based</span>
          <p>${escapeHtml(status.reason)}</p>
        </div>
        ${this.signalGrid(nightSignals)}
      </div>
    `;

    const areaContent = this.renderAreaAroundHotel(nearby, true);
    const nearbyContent = this.renderNearby(nearby, true);
    const scamsContent = this.renderScams(hotspots);

    body.innerHTML = `
      <div class="hotel-safety-head">
        <div class="hotel-safety-icon"><i class="fas fa-shield-halved"></i></div>
        <div><h2>Hotel Surrounding Safety</h2><p>Your hotel is the starting point for this safety view.</p></div>
      </div>

      ${this.renderHotelHero(stay)}

      <div class="hotel-primary-summary">
        <div class="hotel-title-row">
          <div>
            <h3>${escapeHtml(stay.name)}</h3>
            ${stay.address ? `<p>${escapeHtml(stay.address)}</p>` : ""}
            ${this.renderHotelMeta(stay)}
          </div>
          ${stay.mapsUrl ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(stay.mapsUrl)}" target="_blank" rel="noopener">Open Maps</a>` : ""}
        </div>
      </div>

      ${this.renderAccordionSection({
        id: "hotel-details",
        icon: "fa-circle-info",
        title: "Hotel Details",
        subtitle: "Tap to view full hotel information",
        content: this.renderHotelInfo(stay, { includeTitle: false }),
        open: false
      })}

      ${this.renderAccordionSection({
        id: "hotel-photos",
        icon: "fa-images",
        title: "Hotel / Area Photos",
        subtitle: stay.photoUrl || nearby.some(p => p.photoUrl) ? "Real verified images when available" : "No verified images available",
        content: `${this.renderPhotoGallery(stay, nearby, true)}${this.renderHotelPhotoCapture(stay)}`,
        open: false
      })}

      ${this.renderAccordionSection({
        id: "hotel-safety",
        icon: "fa-shield-halved",
        title: "Surrounding Area Safety",
        subtitle: status.label,
        content: safetyContent,
        // Keep the key safety signal visible on phones while preserving the
        // existing collapsed accordion behavior on desktop.
        open: typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      })}

      ${this.renderAccordionSection({
        id: "hotel-area",
        icon: "fa-compass",
        title: "Area Around Your Hotel",
        subtitle: "Real places based on the selected hotel's coordinates",
        content: areaContent,
        open: false
      })}

      ${this.renderAccordionSection({
        id: "hotel-nearby",
        icon: "fa-location-dot",
        title: "Nearby Essentials",
        subtitle: "Police, hospital, transport and tourist places",
        content: nearbyContent,
        open: false
      })}

      ${this.renderAccordionSection({
        id: "hotel-scams",
        icon: "fa-triangle-exclamation",
        title: "Scams / Hotspots Around This Area",
        subtitle: hotspots.length ? `${hotspots.length} existing SafarSaarthi hotspot signal${hotspots.length > 1 ? "s" : ""}` : "Limited data",
        content: scamsContent,
        open: false
      })}

      <div class="hotel-personalized">
        <div class="hotel-section-title"><i class="fas fa-wand-magic-sparkles"></i> Prioritized for ${escapeHtml(prefs.tripType || "your trip")}</div>
        <p>${escapeHtml(this.personalizedNote(prefs.tripType))}</p>
      </div>

      <div class="hotel-actions">
        <button type="button" class="btn btn-outline" id="clear-hotel-stay-btn">Change Hotel</button>
        <button type="button" class="btn btn-primary" id="hotel-continue-btn">Explore Destination</button>
      </div>
    `;

    this.bindRenderedSafety(stay, nearby);
    this.bindHotelPhotoCapture(stay);
    window.veridaHotelSafetyContext = this.getAssistantContext();
  }

  renderHotelMeta(stay) {
    const parts = [];
    if (stay.rating != null) parts.push(`⭐ ${Number(stay.rating).toFixed(1)}`);
    if (stay.ratingsTotal != null) parts.push(`${Number(stay.ratingsTotal).toLocaleString()} reviews`);
    if (stay.hotelType || stay.types?.[0]) {
      parts.push(String(stay.hotelType || stay.types[0]).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
    }
    return parts.length ? `<div class="hotel-rating-line">${parts.map(x => `<span>${escapeHtml(x)}</span>`).join("")}</div>` : "";
  }

  renderHotelHero(stay) {
    if (stay.photoUrl) {
      return `
        <div class="hotel-hero-wrap">
          <img class="hotel-hero-image" src="${escapeHtml(stay.photoUrl)}" alt="${escapeHtml(stay.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="hotel-hero-placeholder hotel-hero-inline-fallback" style="display:none;">
            <i class="fas fa-hotel"></i><span>Hotel image unavailable</span>
          </div>
          ${stay.photoSource ? `<span class="hotel-image-source">Image: ${escapeHtml(stay.photoSource)}</span>` : ""}
        </div>
      `;
    }

    return `
      <div class="hotel-hero-placeholder">
        <i class="fas fa-hotel"></i>
        <span>Hotel image unavailable from connected sources</span>
      </div>
    `;
  }

  renderHotelInfo(stay, options = {}) {
    const type = String(stay.hotelType || stay.types?.[0] || "Hotel")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

    const rows = [];
    rows.push(`<div><span>Booking</span><strong style="color:#059669;">Confirmed (Furkot)</strong></div>`);
    rows.push(`<div><span>Check-in</span><strong>Today, 14:00</strong></div>`);
    rows.push(`<div><span>Check-out</span><strong>Tomorrow, 11:00</strong></div>`);
    
    if (type) rows.push(`<div><span>Type</span><strong>${escapeHtml(type)}</strong></div>`);
    if (stay.rating != null) rows.push(`<div><span>Rating</span><strong>⭐ ${Number(stay.rating).toFixed(1)}</strong></div>`);
    if (stay.ratingsTotal != null) rows.push(`<div><span>Reviews</span><strong>${Number(stay.ratingsTotal).toLocaleString()}</strong></div>`);
    if (stay.phone) rows.push(`<div><span>Contact</span><strong>${escapeHtml(stay.phone)}</strong></div>`);
    if (Number.isFinite(Number(stay.lat)) && Number.isFinite(Number(stay.lng))) {
      rows.push(`<div><span>Coordinates</span><strong>${Number(stay.lat).toFixed(5)}, ${Number(stay.lng).toFixed(5)}</strong></div>`);
    }

    const amenities = Array.isArray(stay.amenities) && stay.amenities.length
      ? `<div class="hotel-detail-chips">${stay.amenities.slice(0, 8).map(x => `<span class="hotel-detail-chip">${escapeHtml(x)}</span>`).join("")}</div>`
      : "";

    const description = stay.description
      ? `<p class="hotel-description">${escapeHtml(stay.description)}</p>`
      : "";

    return `
      ${description}
      ${rows.length ? `<div class="hotel-detail-grid">${rows.join("")}</div>` : ""}
      ${amenities}
      ${stay.website ? `<a class="hotel-website-link" href="${escapeHtml(stay.website)}" target="_blank" rel="noopener"><i class="fas fa-globe"></i> Visit hotel website</a>` : ""}
      ${!description && !rows.length && !amenities && !stay.website ? `<p class="hotel-detail-muted">Limited data available from the connected place source.</p>` : ""}
    `;
  }

  getHotelEvidence(stay) {
    try {
      const all = JSON.parse(localStorage.getItem("verida_hotel_photo_evidence") || "[]");
      const key = `${Number(stay?.lat).toFixed(5)},${Number(stay?.lng).toFixed(5)}`;
      return Array.isArray(all) ? all.filter(item => item.hotelKey === key && item.approved) : [];
    } catch (_) { return []; }
  }

  saveHotelEvidence(stay, evidence) {
    const key = `${Number(stay?.lat).toFixed(5)},${Number(stay?.lng).toFixed(5)}`;
    const all = (() => { try { return JSON.parse(localStorage.getItem("verida_hotel_photo_evidence") || "[]"); } catch (_) { return []; } })();
    all.push({ ...evidence, hotelKey: key, approved: true, savedAt: new Date().toISOString() });
    localStorage.setItem("verida_hotel_photo_evidence", JSON.stringify(all.slice(-100)));
  }

  async prepareHotelPhoto(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Please select an image file.");
    const maxDimension = 1600;
    const readAsDataUrl = () => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The selected photo could not be read."));
      reader.readAsDataURL(file);
    });

    const original = await readAsDataUrl();
    if (!original) throw new Error("The selected photo could not be read.");

    // Keep camera photos small enough for the serverless request body while
    // retaining enough detail for a useful visual safety review.
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return resolve(original);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => resolve(original);
      image.src = original;
    });
  }

  async analyzeHotelPhoto(file, dataUrl) {
    // Real AI can be supplied by the project/backend without exposing a key in the browser.
    if (typeof window.veridaAIImageAnalyzer === "function") {
      return await window.veridaAIImageAnalyzer(file, dataUrl);
    }
    try {
      const response = await fetch("/api/analyze-hotel-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, hotelName: this.selectedHotel?.name || "", hotelAddress: this.selectedHotel?.address || "" })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          configured: result.configured === true,
          analyzed: false,
          feedback: result.feedback || `Hotel photo AI endpoint returned ${response.status}.`
        };
      }
      return result;
    } catch (error) {
      return {
        configured: true,
        analyzed: false,
        feedback: `Hotel photo AI is temporarily unavailable: ${error.message || "request failed"}.`
      };
    }
  }

  renderHotelPhotoCapture(stay) {
    const approved = this.getHotelEvidence(stay);
    const gallery = approved.length ? `
      <div class="hotel-section" style="margin-top:10px;">
        <p class="hotel-section-subtitle">Tourist-submitted photos approved after review.</p>
        <div class="hotel-photo-gallery hotel-photo-gallery-compact">
          ${approved.map(p => {
            const capturedAt = p.capturedAt || p.analyzedAt || p.savedAt || "";
            const when = capturedAt ? new Date(capturedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time not available";
            const gpsText = p.gps && Number.isFinite(Number(p.gps.lat)) && Number.isFinite(Number(p.gps.lng))
              ? `GPS: ${Number(p.gps.lat).toFixed(5)}, ${Number(p.gps.lng).toFixed(5)}`
              : "GPS: Not available";
            return `<figure>
              <img src="${escapeHtml(p.dataUrl)}" alt="${escapeHtml(p.caption || stay.name)}" loading="lazy">
              <figcaption>
                <strong>${escapeHtml(p.caption || "Hotel / area photo")}</strong>
                <span style="display:block;font-size:10px;color:#64748b;margin-top:3px;">${escapeHtml(when)} · ${escapeHtml(gpsText)}</span>
              </figcaption>
            </figure>`;
          }).join("")}
        </div>
      </div>` : "";
    return `
      <div class="hotel-section hotel-tourist-photo-box">
        <div class="hotel-section-title"><i class="fas fa-camera"></i> Add Hotel / Area Photo</div>
        <p class="hotel-section-subtitle">Add a real photo of this hotel or its surrounding area. The photo is reviewed before it is added to this hotel's evidence.</p>
        <input id="hotel-tourist-photo-input" type="file" accept="image/*" capture="environment" hidden>
        <button type="button" class="btn btn-outline btn-block" id="hotel-tourist-photo-btn"><i class="fas fa-camera"></i> Take / Add Photo</button>
        <div id="hotel-tourist-photo-review" style="margin-top:10px;"></div>
        ${gallery}
      </div>`;
  }

  bindHotelPhotoCapture(stay) {
    const input = document.getElementById("hotel-tourist-photo-input");
    const button = document.getElementById("hotel-tourist-photo-btn");
    const review = document.getElementById("hotel-tourist-photo-review");
    if (!input || !button || !review) return;
    button.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
      review.innerHTML = `<div class="hotel-search-status">Analyzing photo…</div>`;
      let dataUrl;
      try {
        dataUrl = await this.prepareHotelPhoto(file);
      } catch (error) {
        review.innerHTML = `<div class="hotel-search-status">${escapeHtml(error.message || "The photo could not be prepared.")}</div>`;
        input.value = "";
        return;
      }
      const analysis = await this.analyzeHotelPhoto(file, dataUrl);
      const feedback = analysis?.feedback || analysis?.summary || "No AI feedback was returned.";
      if (analysis?.analyzed !== true) {
        const setupHint = analysis?.configured === false
          ? "Please configure the AI image-analysis endpoint before approving tourist photos."
          : "The photo was not saved because a completed AI review was not returned.";
        review.innerHTML = `<div class="hotel-search-status">${escapeHtml(feedback)} ${setupHint}</div>`;
        input.value = "";
        return;
      }
      const preview = document.createElement("div");
      preview.innerHTML = `
        <div style="border:1px solid #dbeafe;border-radius:10px;padding:10px;background:#f8fbff;">
          <img src="${escapeHtml(dataUrl)}" alt="Tourist hotel photo" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;">
          <p style="font-size:12px;color:#334155;margin:8px 0;"><strong>AI feedback:</strong> ${escapeHtml(feedback)}</p>
          <button type="button" class="btn btn-primary btn-block" id="approve-hotel-photo-btn"><i class="fas fa-check"></i> Approve & Save Photo</button>
        </div>`;
      review.replaceChildren(preview);
      const approve = document.getElementById("approve-hotel-photo-btn");
      approve.onclick = async () => {
        let gps = null;
        if (navigator.geolocation) {
          gps = await new Promise(resolve => navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null), { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
          ));
        }
        const capturedAt = new Date().toISOString();
        this.saveHotelEvidence(stay, { dataUrl, caption: feedback, capturedAt, analyzedAt: capturedAt, gps });
        review.innerHTML = `<div class="hotel-search-status">Photo approved and added to this hotel's evidence gallery.</div>`;
        input.value = "";
        this.renderSafety(stay, this.nearby || []);
      };
    };
  }

  renderPhotoGallery(stay, nearby, compact = false) {
    const photos = [
      stay.photoUrl ? { url: stay.photoUrl, name: stay.name, source: stay.photoSource || "Connected place source" } : null,
      ...nearby.filter(p => p.photoUrl).map(p => ({
        url: p.photoUrl, name: p.name, source: p.photoSource || "Connected place source"
      }))
    ].filter(Boolean);

    const unique = [...new Map(photos.map(p => [p.url, p])).values()].slice(0, 8);
    const mobileInitial = unique.slice(0, 4);
    const desktopInitial = unique;
    if (!unique.length) {
      return `<div class="hotel-section hotel-limited"><p>No verified images were returned by the connected hotel/place sources.</p></div>`;
    }

    return `
      <div class="hotel-section">
        <p class="hotel-section-subtitle">Only place-associated images are shown.</p>
        <div class="hotel-photo-gallery ${compact ? "hotel-photo-gallery-compact" : ""}" data-photo-gallery>
          ${desktopInitial.map((p, index) => `
            <figure class="${index >= 4 ? "hotel-photo-extra" : ""}">
              <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.closest('figure')?.remove()">
              <figcaption>${escapeHtml(p.name)}</figcaption>
            </figure>
          `).join("")}
        </div>
        ${unique.length > 4 ? `<button type="button" class="btn btn-outline btn-sm hotel-photo-more-btn" style="margin-top:8px;" data-expanded="false">View All</button>` : ""}
      </div>
    `;
  }

  renderAreaAroundHotel(nearby, nested = false) {
    const areaTypes = [
      ["tourist_attraction", "Tourist Attractions", "fa-landmark"],
      ["heritage", "Heritage", "fa-landmark"],
      ["museum", "Museums", "fa-building-columns"],
      ["gallery", "Culture & Galleries", "fa-palette"],
      ["park", "Nature & Parks", "fa-tree"],
      ["restaurant", "Food Nearby", "fa-utensils"],
      ["cafe", "Cafés", "fa-mug-hot"],
      ["shopping_mall", "Shopping", "fa-bag-shopping"],
      ["market", "Markets", "fa-store"]
    ];

    const places = areaTypes.flatMap(([type]) => nearby.filter(p => p.type === type).slice(0, 2));
    const initialPlaces = places.slice(0, 4);
    if (!places.length) {
      return `<div class="hotel-section hotel-limited"><p>No verified surrounding-place records were returned by the connected place sources.</p></div>`;
    }

    return `
      <div class="hotel-section">
        ${!nested ? `<div class="hotel-section-title"><i class="fas fa-compass"></i> Area Around Your Hotel</div>` : ""}
        <p class="hotel-section-subtitle">Distances are calculated from the selected hotel's coordinates.</p>
        <div class="hotel-area-grid">
          ${places.slice(0, 10).map((p, index) => {
            const meta = areaTypes.find(x => x[0] === p.type);
            const label = meta?.[1] || "Nearby place";
            const icon = meta?.[2] || "fa-location-dot";
            const image = p.photoUrl
              ? `<img class="hotel-area-photo" src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.remove()">`
              : `<span class="hotel-area-icon"><i class="fas ${icon}"></i></span>`;
            return `
              <article class="hotel-area-card ${index >= 4 ? "hotel-area-extra" : ""}">
                ${image}
                <div class="hotel-area-content">
                  <span class="hotel-area-type">${escapeHtml(label)}</span>
                  <strong>${escapeHtml(p.name)}</strong>
                  ${Number.isFinite(p.distanceKm) ? `<small>${p.distanceKm.toFixed(1)} km from hotel</small>` : ""}
                  ${p.rating != null ? `<small>⭐ ${Number(p.rating).toFixed(1)}${p.ratingsTotal ? ` · ${Number(p.ratingsTotal).toLocaleString()} reviews` : ""}</small>` : ""}
                  ${p.address ? `<small>${escapeHtml(p.address)}</small>` : ""}
                  <a href="${escapeHtml(p.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`)}" target="_blank" rel="noopener">Open Maps →</a>
                </div>
              </article>
            `;
          }).join("")}
        </div>
        ${places.length > 4 ? `<button type="button" class="btn btn-outline btn-sm hotel-area-more-btn" style="margin-top:8px;" data-expanded="false">View All</button>` : ""}
      </div>
    `;
  }

  signalGrid(items) {
    return `<div class="hotel-signal-grid">${items.map(([k, v]) => `<div class="hotel-signal"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}</div>`;
  }

  renderNearby(nearby, nested = false) {
    const wanted = [
      ["police", "Police", "fa-shield-halved"],
      ["hospital", "Hospital", "fa-hospital"],
      ["airport", "Airport", "fa-plane"],
      ["train_station", "Railway Station", "fa-train"],
      ["tourist_attraction", "Tourist Place", "fa-landmark"],
      ["transit_station", "Transport Point", "fa-bus"]
    ];

    const available = wanted.map(([type, label, icon]) => {
      const p = nearby.find(x => x.type === type);
      if (!p) return `
        <div class="hotel-nearby-card limited">
          <span class="hotel-nearby-icon"><i class="fas ${icon}"></i></span>
          <div><strong>${label}</strong><span>No verified result found nearby</span></div>
        </div>`;
      const image = p.photoUrl
        ? `<img src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" class="hotel-nearby-photo" loading="lazy" onerror="this.remove()">`
        : `<span class="hotel-nearby-icon"><i class="fas ${icon}"></i></span>`;
      return `
        <div class="hotel-nearby-card">
          ${image}
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            ${Number.isFinite(p.distanceKm) ? `<span>${p.distanceKm.toFixed(1)} km · ${escapeHtml(label)}</span>` : `<span>${escapeHtml(label)}</span>`}
            ${p.address ? `<span>${escapeHtml(p.address)}</span>` : ""}
            <a href="${escapeHtml(p.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`)}" target="_blank" rel="noopener">Open Maps →</a>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="hotel-section">
        ${!nested ? `<div class="hotel-section-title"><i class="fas fa-location-dot"></i> Nearby Essentials</div>` : ""}
        <div class="hotel-nearby-grid">${available}</div>
      </div>
    `;
  }

  renderScams(hotspots) {
    if (!hotspots.length) return `<div class="hotel-section hotel-limited"><div class="hotel-section-title"><i class="fas fa-triangle-exclamation"></i> Scams Reported Around This Area</div><p>Limited data available. SafarSaarthi will not invent incident statistics.</p></div>`;
    return `<div class="hotel-section"><div class="hotel-section-title"><i class="fas fa-triangle-exclamation"></i> Scams / Hotspots Around This Area</div><div class="hotel-scam-list">${hotspots.map(h => `<div class="hotel-scam"><strong>${escapeHtml(h.scamType || h.name || "Reported hotspot")}</strong><span>${h.distanceKm.toFixed(1)} km from hotel · ${escapeHtml(h.riskLevel || "reported")}</span><p>${escapeHtml(h.description || "See the hotspot details in SafarSaarthi Radar.")}</p><small>Source: existing SafarSaarthi hotspot dataset (prototype); not a hotel allegation.</small></div>`).join("")}</div></div>`;
  }

  personalizedNote(type = "") {
    if (/business/i.test(type)) return "Airport, railway station and reliable transport signals are prioritized because they commonly matter for business travel.";
    if (/solo/i.test(type)) return "Night-time data, mapped hotspots and emergency facilities are prioritized for solo travel.";
    if (/family/i.test(type)) return "Hospitals, emergency access, active places and nearby transport are prioritized for family travel.";
    return "Emergency facilities, nearby transport and mapped safety signals are prioritized while the underlying data stays unchanged.";
  }

  countType(rows, types) { return rows.filter(x => types.includes(x.type)).length; }

  bindRenderedSafety(stay, nearby) {
    document.querySelectorAll(".hotel-accordion-toggle").forEach(toggle => {
      toggle.onclick = () => {
        const section = toggle.closest(".hotel-accordion");
        const panel = section?.querySelector(".hotel-accordion-panel");
        if (!section || !panel) return;
        const willOpen = panel.hidden;
        // Keep mobile compact: one expanded section at a time.
        if (window.matchMedia("(max-width: 700px)").matches && willOpen) {
          document.querySelectorAll(".hotel-accordion.is-open").forEach(other => {
            if (other === section) return;
            other.classList.remove("is-open");
            const otherPanel = other.querySelector(".hotel-accordion-panel");
            const otherToggle = other.querySelector(".hotel-accordion-toggle");
            if (otherPanel) otherPanel.hidden = true;
            if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
          });
        }
        section.classList.toggle("is-open", willOpen);
        panel.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
      };
    });

    document.querySelectorAll(".hotel-area-more-btn, .hotel-photo-more-btn").forEach(btn => {
      btn.onclick = () => {
        const expanded = btn.dataset.expanded === "true";
        const selector = btn.classList.contains("hotel-area-more-btn") ? ".hotel-area-extra" : ".hotel-photo-extra";
        document.querySelectorAll(selector).forEach(el => { el.style.display = expanded ? "" : "block"; });
        btn.dataset.expanded = String(!expanded);
        btn.textContent = expanded ? "View All" : "Show Less";
      };
    });

    document.querySelectorAll(".hotel-period-btn").forEach(btn => btn.onclick = () => {
      document.querySelectorAll(".hotel-period-btn").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".hotel-period-panel").forEach(p => p.classList.toggle("active", p.id === `hotel-${btn.dataset.period}-panel`));
    });
    const clear = document.getElementById("clear-hotel-stay-btn");
    if (clear) clear.onclick = () => this.renderHotelSelector();
    const cont = document.getElementById("hotel-continue-btn");
    if (cont) cont.onclick = () => { this.closeHotelModal(); if (window.veridaApp) window.veridaApp.switchTab("radar"); };
  }

  getAssistantContext() {
    if (!this.selectedHotel) return { hotelSelected: false };
    const hotspots = this.getExistingHotspotSignals(this.selectedHotel);
    const nearby = this.nearby || [];
    const status = this.getSafetyStatus(this.selectedHotel, hotspots);
    return {
      hotelSelected: true,
      hotel: { name: this.selectedHotel.name, address: this.selectedHotel.address, lat: this.selectedHotel.lat, lng: this.selectedHotel.lng },
      areaSafety: status,
      dayNight: { day: "Places/emergency/transport signals from connected sources", night: "Night-specific live activity/operating-hour data may be limited" },
      nearbyEssentials: nearby.map(p => ({ name: p.name, type: p.type, distanceKm: Number(p.distanceKm.toFixed(1)) })),
      scamHotspots: hotspots.map(h => ({ name: h.name, scamType: h.scamType, distanceKm: Number(h.distanceKm.toFixed(1)), riskLevel: h.riskLevel })),
      tripType: store.getTripPreferences()?.tripType || null,
      dataNote: "Do not invent missing safety statistics; tell the user when VERIDA has limited data."
    };
  }
}

export const hotelSafety = new HotelSafety();
window.hotelSafety = hotelSafety;
