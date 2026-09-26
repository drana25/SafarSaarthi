/**
 * Verida — Main Application Controller & View Router
 */

import { store } from "./store.js";
import { digitalHandshake } from "./handshake.js";
import { hotspotRadar } from "./hotspots.js";
import { reviewsManager } from "./reviews.js";
import { evidencePacketManager } from "./evidencePacket.js";
import { demoSimulator } from "./demoSimulator.js";
import { transitSafety } from "./transitSafety.js";
import { authManager } from "./authManager.js";
import { hotelSafety } from "./hotelSafety.js";
import { signOutFirebase } from "./firebase-config.js";

const VERIDA_SESSION_VERSION = "2026-09-hotel-safety-v3";
const VERIDA_AUTH_SESSION_KEY = "verida_auth_session_active";
const VERIDA_AUTH_ROLE_KEY = "verida_auth_session_role";

class App {
  constructor() {
    this.activeTab = "handshake";
    this.isInitialized = false;
    // Strict role separation: once a role is locked (post-
    // authentication), switchRole() refuses to switch away from it.
    this.roleLocked = false;
    this.lockedRole = null;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log(
      "[Verida] Initializing On-The-Spot Tourism & Transit Trust Platform..."
    );

    // Step 1: Populate city dropdown
    try {
      this.populateCityDropdown();
    } catch (e) {
      console.warn("[Verida] City dropdown error:", e);
    }

    // Step 2: Bind all event listeners
    try {
      this.bindEvents();
    } catch (e) {
      console.warn("[Verida] Event binding error:", e);
    }

    // Step 3: Load auth manager
    try {
      authManager.init();
    } catch (e) {
      console.warn("[Verida] Auth init error:", e);
    }

    // Step 4: Initialize Hotel Surrounding Safety (additive feature)
    try {
      hotelSafety.init();
    } catch (e) {
      console.warn("[Verida] Hotel safety init error:", e);
    }

    // Step 5: Sync profile names to UI
    try {
      this.syncProfileDisplayNames();
    } catch (e) {
      console.warn("[Verida] Profile sync error:", e);
    }

    // Step 6: Switch role
    try {
      this.switchRole(store.currentRole);
    } catch (e) {
      console.warn("[Verida] Role switch error:", e);
    }

    try {
      this.switchTab("transit");
    } catch (e) {
      console.warn("[Verida] Initial tab switch error:", e);
      const transitPanel = document.getElementById("tab-transit");
      if (transitPanel) transitPanel.classList.add("active");
    }

    // Step 8: Pre-render ledger
    try {
      reviewsManager.renderGuideLedger();
    } catch (e) {
      console.warn("[Verida] Ledger render error:", e);
    }

    // Step 9: Initialize map
    setTimeout(() => {
      try {
        hotspotRadar.initMap();
      } catch (e) {
        console.warn("[Verida] Map init error:", e);
      }
    }, 300);

    // Restore an existing authenticated session only after the application
    // controller and all bindings are ready. A one-time version guard clears
    // stale auth markers left by older VERIDA builds so the landing page is
    // shown on the first launch of this build instead of jumping into a
    // passenger shell unexpectedly.
    this.prepareSessionVersion();
    this.restoreAuthenticatedSession();

    // Mobile authenticated navigation. This is intentionally a single menu
    // rather than a second router, so it always uses switchTab().
    this.bindMobileAppMenu();

    // Handle browser back/forward and bfcache restores without introducing
    // a second redirect/router.
    window.addEventListener("pageshow", () => this.restoreAuthenticatedSession());
  }

  prepareSessionVersion() {
    const current = localStorage.getItem("verida_session_version");
    // Authentication is intentionally tab/session scoped. The previous build
    // kept a localStorage auth flag, which could survive logout/redeploys and
    // cause the landing page to flash before restoring Passenger Mode.
    // Keep profiles/data in localStorage, but never use a stale localStorage
    // boolean as proof of an active login.
    if (current !== VERIDA_SESSION_VERSION) {
      localStorage.removeItem("verida_user_authenticated");
      localStorage.removeItem("verida_authenticated_role");
      localStorage.setItem("verida_session_version", VERIDA_SESSION_VERSION);
      sessionStorage.removeItem(VERIDA_AUTH_SESSION_KEY);
      sessionStorage.removeItem(VERIDA_AUTH_ROLE_KEY);
      sessionStorage.setItem("verida_session_version", VERIDA_SESSION_VERSION);

      // Keep stored profile data so users do not lose their prototype data;
      // only the stale authentication marker is reset.
      store.currentRole = "traveler";
      return;
    }

    if (sessionStorage.getItem("verida_session_version") !== VERIDA_SESSION_VERSION) {
      sessionStorage.removeItem(VERIDA_AUTH_SESSION_KEY);
      sessionStorage.removeItem(VERIDA_AUTH_ROLE_KEY);
      sessionStorage.setItem("verida_session_version", VERIDA_SESSION_VERSION);
    }
  }

  applyAuthenticatedView(role, { persist = true } = {}) {
    const normalizedRole = role === "driver" ? "driver" : "passenger";
    const internalRole = normalizedRole === "driver" ? "guide" : "traveler";

    if (persist) {
      sessionStorage.setItem(VERIDA_AUTH_SESSION_KEY, "true");
      sessionStorage.setItem(VERIDA_AUTH_ROLE_KEY, normalizedRole);
      sessionStorage.setItem("verida_session_version", VERIDA_SESSION_VERSION);
      // Remove legacy persistent auth markers so an old browser state cannot
      // silently reopen Passenger Mode on a fresh visit.
      localStorage.removeItem("verida_user_authenticated");
      localStorage.removeItem("verida_authenticated_role");
    }

    const landing = document.getElementById("verida-landing-website");
    const appShell = document.getElementById("single-app-shell");

    // Use the same visibility operation every time. No timers and no
    // navigation/reload are involved.
    if (landing) {
      landing.classList.add("hidden");
      landing.style.display = "none";
    }
    if (appShell) {
      appShell.style.display = "flex";
    }

    this.switchRole(internalRole);
    this.lockRole(internalRole);
    this.updateMobileMenuProfile();

    if (normalizedRole === "passenger") {
      this.switchTab("radar");
    }

    // Deferred render so window globals are fully bound before render
    setTimeout(() => {
      try { hotspotRadar.renderHotspotsDirectory(); } catch(e) { console.warn("[Verida] hotspot render:", e); }
      if (normalizedRole !== "passenger") {
        try { transitSafety.initRoutePlanner(); } catch(e) {}
      }
    }, 80);
  }

  restoreAuthenticatedSession() {
    const isAuth = sessionStorage.getItem(VERIDA_AUTH_SESSION_KEY);
    const authedRole = sessionStorage.getItem(VERIDA_AUTH_ROLE_KEY);
    const sessionVersion = sessionStorage.getItem("verida_session_version");

    // Only restore a session explicitly created in this browser tab by a
    // successful sign-in/sign-up. A random/old localStorage value is ignored.
    if (
      isAuth !== "true" ||
      sessionVersion !== VERIDA_SESSION_VERSION ||
      !["passenger", "driver"].includes(authedRole)
    ) {
      return;
    }

    this.applyAuthenticatedView(authedRole, { persist: false });
  }

  bindMobileAppMenu() {
    const menu = document.getElementById("mobile-app-menu");
    const openBtn = document.getElementById("mobile-app-menu-btn");
    if (!menu || !openBtn) return;
    const closeMenu = () => {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
      openBtn.setAttribute("aria-expanded", "false");
    };

    openBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle("open");
      menu.setAttribute("aria-hidden", String(!isOpen));
      openBtn.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) this.updateMobileMenuProfile();
    };

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !openBtn.contains(e.target) && menu.classList.contains("open")) {
        closeMenu();
      }
    });

    menu.querySelectorAll("[data-menu-tab]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tab = btn.getAttribute("data-menu-tab");
        if (!tab) return;
        this.switchTab(tab);
        closeMenu();
      };
    });

    // Profile button in the simplified 3-item menu
    const profileBtn = document.getElementById("mobile-menu-profile-btn");
    if (profileBtn) {
      profileBtn.onclick = (e) => {
        e.preventDefault();
        this.switchTab("profile");
        closeMenu();
      };
    }

    const languageSelect = document.getElementById("mobile-language-select");
    if (languageSelect) {
      const savedLanguage = localStorage.getItem("verida_language") || "en";
      languageSelect.value = savedLanguage;
      languageSelect.onchange = () => {
        localStorage.setItem("verida_language", languageSelect.value);
        this.applyLanguagePreference(languageSelect.value);
      };
    }

    const signoutBtn = document.getElementById("mobile-menu-signout");
    if (signoutBtn) signoutBtn.onclick = (e) => {
      e.preventDefault();
      closeMenu();
      this.signOut();
    };

    this.applyLanguagePreference(localStorage.getItem("verida_language") || "en");
  }

  updateMobileMenuProfile() {
    const isDriver = store.currentRole === "guide";
    const profile = isDriver ? store.activeGuide : store.activeUser;
    const name = profile?.name || (isDriver ? "Driver" : "Passenger");
    const nameEl = document.getElementById("mobile-menu-user-name");
    const roleEl = document.getElementById("mobile-menu-role-label");
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = isDriver ? "Driver" : "Passenger";
  }

  applyLanguagePreference(language) {
    const labels = {
      en: { transit: "Transit & History", radar: "Hotspot Radar", handshake: "Handshake", driverQr: "Driver QR", ledger: "Ledger", profile: "Profile", signOut: "Sign Out", language: "Language" },
      hi: { transit: "ट्रांज़िट और हिस्ट्री", radar: "हॉटस्पॉट रडार", handshake: "हैंडशेक", driverQr: "ड्राइवर QR", ledger: "लेजर", profile: "प्रोफ़ाइल", signOut: "साइन आउट", language: "भाषा" },
      gu: { transit: "ટ્રાન્ઝિટ અને હિસ્ટ્રી", radar: "હોટસ્પોટ રડાર", handshake: "હેન્ડશેક", driverQr: "ડ્રાઇવર QR", ledger: "લેજર", profile: "પ્રોફાઇલ", signOut: "સાઇન આઉટ", language: "ભાષા" }
    };
    const t = labels[language] || labels.en;
    const textByTab = { transit: t.transit, radar: t.radar, handshake: t.handshake, "guide-qr": t.driverQr, ledger: t.ledger, profile: t.profile };
    document.querySelectorAll(".mobile-menu-option").forEach((btn) => {
      const span = btn.querySelector("span");
      const tab = btn.getAttribute("data-menu-tab");
      if (span && textByTab[tab]) span.textContent = textByTab[tab];
    });
    const signout = document.querySelector("#mobile-menu-signout span");
    if (signout) signout.textContent = t.signOut;
    const langLabel = document.querySelector(".mobile-menu-language label");
    if (langLabel) langLabel.innerHTML = `<i class="fas fa-language"></i> ${t.language}`;
  }

  signOut() {
    signOutFirebase();
    const signedOutRole = store.currentRole;

    // A sign-out is a real end of the local session. Remove the profile
    // belonging to the current mode so the next visit starts with fresh
    // Sign In / Sign Up fields rather than old details.
    sessionStorage.removeItem(VERIDA_AUTH_SESSION_KEY);
    sessionStorage.removeItem(VERIDA_AUTH_ROLE_KEY);
    sessionStorage.removeItem("verida_session_version");
    // Clean up legacy persistent auth markers from older builds.
    localStorage.removeItem("verida_user_authenticated");
    localStorage.removeItem("verida_authenticated_role");
    localStorage.removeItem("verida_trip_preferences");
    localStorage.removeItem("verida_hotel_stay");

    if (signedOutRole === "guide") {
      localStorage.removeItem("verida_guide_profile");
      store.activeGuide = { uid: "", id: "", role: "guide" };
    } else {
      localStorage.removeItem("verida_user_profile");
      store.activeUser = { uid: "", name: "", phone: "", origin: "", emergency: "", role: "traveler" };
      hotelSafety.clearStay();
    }

    this.roleLocked = false;
    this.lockedRole = null;
    store.currentRole = "traveler";
    document.body.classList.remove("role-guide", "role-traveler");

    // Clear authentication form fields so the landing page is genuinely
    // fresh on the next Sign In / Sign Up.
    document.querySelectorAll("#auth-modal input, #auth-modal select").forEach((el) => {
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    const menu = document.getElementById("mobile-app-menu");
    if (menu) menu.classList.remove("open");

    const landing = document.getElementById("verida-landing-website");
    const appShell = document.getElementById("single-app-shell");
    if (landing) { landing.classList.remove("hidden"); landing.style.display = ""; }
    if (appShell) appShell.style.display = "none";

    const prefModal = document.getElementById("trip-preferences-modal");
    if (prefModal) prefModal.classList.remove("active");
    const authModal = document.getElementById("auth-modal");
    if (authModal) authModal.classList.remove("active");

    window.scrollTo(0, 0);
  }

  syncProfileDisplayNames() {
    const passengerName = store.activeUser.name;
    const driverName = store.activeGuide.name;
    const driverPlate =
      store.activeGuide.vehicleRegNo || "GJ-06-AU-7892";
    const driverVehicle =
      store.activeGuide.vehicleType || "Green CNG Auto-Rickshaw";

    const nameEl = document.getElementById("header-user-display-name");
    if (nameEl) {
      // The header profile always represents the currently authenticated role.
      nameEl.textContent = store.currentRole === "guide" ? driverName : passengerName;
    }

    const dualPassName =
      document.getElementById("dual-passenger-name");

    if (dualPassName) {
      dualPassName.textContent = passengerName;
    }

    const dualDriverName =
      document.getElementById("dual-driver-name");

    if (dualDriverName) {
      dualDriverName.textContent = driverName;
    }

    // Main driver card
    const driverCardName =
      document.getElementById("driver-card-name");

    const driverCardLic =
      document.getElementById("driver-card-lic");

    if (driverCardName) {
      driverCardName.textContent = driverName;
    }

    if (driverCardLic) {
      driverCardLic.textContent =
        `${driverPlate} • ${driverVehicle}`;
    }

    // Dual driver card
    const driverCardNameDual =
      document.getElementById("driver-card-name-dual");

    const driverCardLicDual =
      document.getElementById("driver-card-lic-dual");

    if (driverCardNameDual) {
      driverCardNameDual.textContent = driverName;
    }

    if (driverCardLicDual) {
      driverCardLicDual.textContent =
        `${driverPlate} • ${driverVehicle}`;
    }
  }

  bindEvents() {
    // City Selector
    const citySelector =
      document.getElementById("header-city-selector");

    if (citySelector) {
      citySelector.onchange = (e) => {
        store.setCity(e.target.value);
        this.onCityChanged();
      };
    }

    // Navigation Tabs
    document
      .querySelectorAll(".nav-tab-btn[data-tab], .desktop-nav-link[data-tab]")
      .forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();

          const tab =
            btn.getAttribute("data-tab");

          if (tab) {
            this.switchTab(tab);
          }
        };
      });

    // Dual Screen Presenter Toggle
    const dualBtn =
      document.getElementById("toggle-dual-screen-btn");

    if (dualBtn) {
      dualBtn.onclick = (e) => {
        e.preventDefault();
        demoSimulator.toggleDualScreen();
      };
    }

    // View Mode Toggle
    const viewModeBtn =
      document.getElementById("toggle-view-mode-btn");

    if (viewModeBtn) {
      viewModeBtn.onclick = (e) => {
        e.preventDefault();

        document.body.classList.toggle(
          "mobile-mockup-mode"
        );

        const isMockup =
          document.body.classList.contains(
            "mobile-mockup-mode"
          );

        viewModeBtn.innerHTML = isMockup
          ? `<i class="fas fa-desktop"></i> Laptop Dashboard View`
          : `<i class="fas fa-mobile-screen"></i> Phone Simulator Frame`;
      };
    }

    // Teleport Selector
    const teleportSelect =
      document.getElementById("demo-teleport-select");

    if (teleportSelect) {
      teleportSelect.onchange = (e) => {
        if (e.target.value) {
          demoSimulator.teleport(e.target.value);
        }
      };
    }

    // Live Handshake Simulation
    const simScanBtn =
      document.getElementById("simulate-scan-btn");

    if (simScanBtn) {
      simScanBtn.onclick = (e) => {
        e.preventDefault();
        this.executeHandshakeFlow();
      };
    }

    // Camera Start Scanner
    const startScannerBtn =
      document.getElementById("start-camera-scan-btn");

    if (startScannerBtn) {
      startScannerBtn.onclick = (e) => {
        e.preventDefault();

        document
          .getElementById("camera-scanner-wrapper")
          ?.classList.remove("hidden");

        digitalHandshake.startTravelerScanner(
          "qr-reader",
          (record) => {
            this.onHandshakeSuccess(record);

            digitalHandshake.stopTravelerScanner();

            document
              .getElementById("camera-scanner-wrapper")
              ?.classList.add("hidden");
          }
        );
      };
    }

    const closeScannerBtn =
      document.getElementById("close-camera-scanner-btn");

    if (closeScannerBtn) {
      closeScannerBtn.onclick = (e) => {
        e.preventDefault();

        digitalHandshake.stopTravelerScanner();

        document
          .getElementById("camera-scanner-wrapper")
          ?.classList.add("hidden");
      };
    }

    // SOS Emergency Button
    const sosBtn =
      document.getElementById("emergency-sos-floating-btn");

    if (sosBtn) {
      sosBtn.onclick = (e) => {
        e.preventDefault();
        this.triggerSosFlow();
      };
    }

    // Hotspot Search
    const hotspotSearchInput =
      document.getElementById("hotspot-search-input");

    if (hotspotSearchInput) {
      hotspotSearchInput.oninput = (e) => {
        hotspotRadar.searchQuery =
          e.target.value;

        hotspotRadar.renderHotspotsDirectory();
      };
    }

    // Hotspot Categories
    // The desktop buttons remain the single source of truth for filtering.
    const applyHotspotCategory = (category) => {
      const existingButton = Array.from(
        document.querySelectorAll(".hotspot-cat-btn")
      ).find((btn) => btn.getAttribute("data-cat") === category);

      if (existingButton) {
        existingButton.click();
      }
    };

    document
      .querySelectorAll(".hotspot-cat-btn")
      .forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();

          document
            .querySelectorAll(".hotspot-cat-btn")
            .forEach((b) =>
              b.classList.remove("active")
            );

          btn.classList.add("active");

          hotspotRadar.activeCategoryFilter =
            btn.getAttribute("data-cat");

          hotspotRadar.renderHotspotsDirectory();

          // Keep the compact mobile controls synchronized with the existing
          // desktop category state without introducing a second filter state.
          const selected = hotspotRadar.activeCategoryFilter;
          document
            .querySelectorAll(".hotspot-mobile-action")
            .forEach((action) => action.classList.remove("active"));

          if (selected === "all") {
            document
              .querySelector('[data-mobile-action="all"]')
              ?.classList.add("active");
          } else if (selected === "scam") {
            document
              .querySelector('[data-mobile-action="safety"]')
              ?.classList.add("active");
          } else {
            document
              .querySelector('[data-mobile-action="more"]')
              ?.classList.add("active");
          }
        };
      });

    // Mobile Hotspot Radar controls.
    // These only call existing category/hotel handlers; no duplicate data logic.
    const mobileAllBtn = document.querySelector('[data-mobile-action="all"]');
    const mobileSafetyBtn = document.querySelector('[data-mobile-action="safety"]');
    const mobileStayBtn = document.querySelector('[data-mobile-action="stay"]');
    const mobileMoreBtn = document.querySelector('[data-mobile-action="more"]');
    const mobileMoreModal = document.getElementById("hotspot-mobile-more-modal");
    const closeMobileMoreBtn = document.getElementById("close-hotspot-mobile-more-btn");

    const closeMobileMore = () => {
      mobileMoreModal?.classList.remove("active");
      mobileMoreBtn?.setAttribute("aria-expanded", "false");
    };

    mobileAllBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      applyHotspotCategory("all");
    });

    mobileSafetyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      applyHotspotCategory("scam");
    });

    mobileStayBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (hotelSafety && typeof hotelSafety.openHotelModal === "function") {
        hotelSafety.openHotelModal();
      }
    });

    mobileMoreBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!mobileMoreModal) return;
      mobileMoreModal.classList.add("active");
      mobileMoreBtn.setAttribute("aria-expanded", "true");
    });

    closeMobileMoreBtn?.addEventListener("click", closeMobileMore);

    mobileMoreModal?.addEventListener("click", (e) => {
      if (e.target === mobileMoreModal) closeMobileMore();
    });

    document
      .querySelectorAll(".hotspot-mobile-option")
      .forEach((option) => {
        option.addEventListener("click", (e) => {
          e.preventDefault();
          const category = option.getAttribute("data-cat");
          applyHotspotCategory(category);
          closeMobileMore();
        });
      });

    // Escape closes the mobile category sheet, matching the existing modal UX.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileMore();
    });
  }

  populateCityDropdown() {
    const selector =
      document.getElementById("header-city-selector");

    if (!selector) return;

    const cities = store.getCities();

    selector.innerHTML = Object.values(cities)
      .map(
        (city) => `
      <option value="${city.id}" ${
          city.id === store.currentCityId
            ? "selected"
            : ""
        }>
        📍 ${city.name} (${city.state})
      </option>
    `
      )
      .join("");
  }

  onCityChanged() {
    store.getCurrentCity();

    const locPill =
      document.getElementById("current-location-pill");

    if (locPill) {
      locPill.innerHTML = `
        <span class="gps-live-dot"></span>
        ${store.currentLocation.name}
      `;
    }

    transitSafety.initRoutePlanner();

    reviewsManager.renderGuideLedger();

    hotspotRadar.renderMapLayers();

    hotspotRadar.renderHotspotsDirectory();

    hotspotRadar.checkGeofenceProximity();

    if (store.currentRole === "guide") {
      digitalHandshake.startGuideQrRotation();
    }
  }

  switchRole(role) {
    // Strict role separation (post-authentication): once locked, refuse
    // any switch away from the authenticated role. This guards against
    // stray clicks on the demo role-toggle buttons AND any other code
    // path that might call switchRole() directly.
    if (this.roleLocked && role !== this.lockedRole) {
      console.warn("[Verida] Role is locked to '" + this.lockedRole + "' after authentication — ignoring switch to '" + role + "'.");
      return;
    }

    store.currentRole = role;

    document
      .querySelectorAll(".role-toggle-btn")
      .forEach((b) => {
        b.classList.toggle(
          "active",
          b.getAttribute("data-role") === role
        );
      });

    document.body.classList.toggle(
      "role-guide",
      role === "guide"
    );

    document.body.classList.toggle(
      "role-traveler",
      role === "traveler"
    );

    if (role === "guide") {
      try {
        digitalHandshake.startGuideQrRotation(
          "guide-qr-canvas",
          "qr-countdown-badge"
        );
      } catch (e) {
        console.warn(
          "[Verida] QR rotation error:",
          e
        );
      }

      try {
        reviewsManager.renderGuideLedger(
          store.activeGuide.id ||
            store.activeGuide.uid,
          "guide-self-ledger"
        );
      } catch (e) {
        console.warn(
          "[Verida] Guide ledger error:",
          e
        );
      }

      this.switchTab("guide-qr");
    } else {
      try {
        digitalHandshake.stopGuideQrRotation();
      } catch (e) {}

      this.switchTab("transit");
    }
  }

  // Strict role separation (post-authentication): called once, right
  // after a Passenger or Driver finishes signing in/up. Locks the role
  // so switchRole() will refuse any further switch, and hides the
  // in-app "Passenger Mode / Driver Mode" toggle so there is no UI path
  // left to change roles once authenticated.
  lockRole(role) {
    this.roleLocked = true;
    this.lockedRole = role;

    const toggleContainer = document.querySelector(".role-toggle-container");
    if (toggleContainer) toggleContainer.classList.add("hidden");

    console.log("[Verida] Role locked to:", role);
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;

    document
      .querySelectorAll(
        ".nav-tab-btn[data-tab], .desktop-nav-link[data-tab]"
      )
      .forEach((b) => {
        b.classList.toggle(
          "active",
          b.getAttribute("data-tab") === tabKey
        );
      });

    document
      .querySelectorAll(".tab-content-panel")
      .forEach((panel) => {
        panel.classList.toggle(
          "active",
          panel.getAttribute("id") ===
            `tab-${tabKey}`
        );
      });

    if (tabKey === "radar") {
      try { hotspotRadar.renderHotspotsDirectory(); } catch(e) {}

      setTimeout(() => {
        try {
          if (!hotspotRadar.map) {
            hotspotRadar.initMap();
          } else {
            hotspotRadar.map.invalidateSize();
            hotspotRadar.renderMapLayers();
            hotspotRadar.renderHotspotsDirectory();
          }
        } catch (e) {
          console.warn(
            "[Verida Map Invalidate Warning]:",
            e
          );
        }
      }, 150);
    }

    if (tabKey === "transit") {
      try {
        transitSafety.initRoutePlanner();
      } catch (e) {
        console.warn(
          "[Verida] Transit planner error:",
          e
        );
      }
    } else if (tabKey === "guide-qr") {
      setTimeout(() => {
        try {
          digitalHandshake.startGuideQrRotation(
            "guide-qr-canvas",
            "qr-countdown-badge"
          );
        } catch (e) {
          console.warn(
            "[Verida] QR rotation error:",
            e
          );
        }

        try {
          reviewsManager.renderGuideLedger(
            store.activeGuide.id ||
              store.activeGuide.uid,
            "guide-self-ledger"
          );
        } catch (e) {
          console.warn(
            "[Verida] Guide-self ledger error:",
            e
          );
        }
      }, 80);
    } else if (tabKey === "driver-reviews") {
      try {
        reviewsManager.renderDriverReviewsTab("driver-reviews-container");
      } catch (e) {
        console.warn(
          "[Verida] Driver reviews render error:",
          e
        );
      }
    } else if (tabKey === "ledger") {
      try {
        if (store.currentRole === "guide") {
          reviewsManager.renderGuideLedger(
            store.activeGuide.id ||
              store.activeGuide.uid,
            "guide-ledger-container"
          );
        } else {
          reviewsManager.renderGuideLedger();
        }
      } catch (e) {
        console.warn(
          "[Verida] Ledger render error:",
          e
        );
      }
    } else if (tabKey === "profile") {
      try {
        this.renderProfileTab();
      } catch (e) {
        console.warn(
          "[Verida] Profile render error:",
          e
        );
      }
    }
  }

  renderProfileTab() {
    const container = document.getElementById("profile-container");
    if (!container) return;

    const isGuide = store.currentRole === "guide";
    const profile = isGuide ? store.activeGuide : store.activeUser;
    const prefs = store.getTripPreferences() || {};
    const hotel = hotelSafety.selectedHotel;

    const driverPhoto = profile.photo || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
    const driverName = profile.name || "Mehul Bhai Solanki";
    const driverPlate = profile.vehicleRegNo || "GJ-06-AU-7892";
    const driverLic = profile.licenseNo || profile.rtoLicenseNo || "GJ-06-2018-009124";
    const driverType = profile.vehicleType || "Green CNG Auto-Rickshaw";

    container.innerHTML = `
      <div class="verida-profile-card">
        <div class="verida-profile-heading">
          <div class="verida-profile-avatar" style="${isGuide ? 'border-radius:50%;overflow:hidden;padding:0;width:52px;height:52px;border:2px solid #10b981;' : ''}">
            ${isGuide ? `<img src="${driverPhoto}" alt="${driverName}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fas fa-user-shield"></i>`}
          </div>
          <div>
            <h3>${isGuide ? driverName : (profile.name || "Passenger Profile")}</h3>
            <p>${isGuide ? `${driverType} • Verified Driver` : "Your saved travel and safety preferences."}</p>
          </div>
        </div>

        ${isGuide ? `
          <!-- Driver Profile Card (Matching Reference UI) -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:700;font-size:13px;color:#0f172a;"><i class="fas fa-id-badge" style="color:#059669;"></i> Driver Credentials</span>
              <span style="background:#ecfdf5;color:#047857;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;border:1px solid #a7f3d0;"><i class="fas fa-shield-alt"></i> 98% Trust Index</span>
            </div>
            <div style="font-size:12px;color:#475569;display:flex;flex-direction:column;gap:5px;">
              <div><i class="fas fa-car"></i> Vehicle: <strong style="font-family:monospace;background:#f1f5f9;padding:1px 6px;border-radius:4px;color:#0f172a;">${driverPlate}</strong></div>
              <div><i class="fas fa-certificate" style="color:#059669;"></i> License: <strong>${driverLic}</strong></div>
              <div><i class="fas fa-landmark"></i> Vadodara RTO &amp; Police Tourist Syndicate</div>
              <div><i class="fas fa-phone"></i> Phone: <strong>${profile.phone || "+91 94260 55321"}</strong></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
              <span style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;"><i class="fas fa-language"></i> English, Gujarati, Hindi</span>
              <span style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;"><i class="fas fa-clock"></i> 5+ Years Exp</span>
              <span style="background:#ecfdf5;color:#059669;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;"><i class="fas fa-handshake"></i> 4 Verified Encounters</span>
            </div>
          </div>
        ` : `
          <div class="verida-profile-info-grid">
            <div><span>Name</span><strong>${profile.name || "Not set"}</strong></div>
            <div><span>Phone</span><strong>${profile.phone || "Not set"}</strong></div>
            <div><span>Home / Origin</span><strong>${profile.origin || "Not set"}</strong></div>
            <div><span>Emergency Contact</span><strong>${profile.emergencyContact || profile.emergency || "Not set"}</strong></div>
          </div>
        `}

        ${!isGuide ? `
        <div class="profile-useful-section">
          <div class="profile-useful-title"><i class="fas fa-compass"></i> Tourist Safety Shortcuts</div>
          <div class="profile-shortcut-grid">
            <button type="button" class="profile-shortcut" data-profile-action="preferences"><i class="fas fa-sliders"></i><span>Trip Preferences</span><small>${prefs.tripType || "Not set"}</small></button>
            <button type="button" class="profile-shortcut" data-profile-action="hotel"><i class="fas fa-hotel"></i><span>Check My Stay</span><small>${hotel?.name || "Select a hotel"}</small></button>
            <button type="button" class="profile-shortcut" data-profile-action="sos"><i class="fas fa-life-ring"></i><span>Emergency / SOS</span><small>Open safety tools</small></button>
            <button type="button" class="profile-shortcut" data-profile-action="radar"><i class="fas fa-map-location-dot"></i><span>Hotspot Radar</span><small>Area safety signals</small></button>
          </div>
        </div>` : `
        <div class="profile-useful-section">
          <div class="profile-useful-title"><i class="fas fa-shield-check"></i> Driver Shortcuts</div>
          <div class="profile-shortcut-grid">
            <button type="button" class="profile-shortcut" data-profile-action="qr"><i class="fas fa-qrcode"></i><span>My Driver QR</span><small>Rotating verification QR</small></button>
            <button type="button" class="profile-shortcut" data-profile-action="reviews"><i class="fas fa-comment-dots"></i><span>Verified Reviews</span><small>Passenger feedback</small></button>
            <button type="button" class="profile-shortcut" data-profile-action="ledger"><i class="fas fa-book"></i><span>Trip Ledger</span><small>Verification records</small></button>
          </div>
        </div>`}

        <div class="profile-action-row">
          <button type="button" class="btn btn-outline" id="edit-current-profile-btn"><i class="fas fa-user-edit"></i> Edit Profile Information</button>
          <button type="button" class="btn btn-danger-outline" id="profile-signout-btn"><i class="fas fa-right-from-bracket"></i> Sign Out</button>
        </div>
      </div>
    `;

    document.getElementById("edit-current-profile-btn")?.addEventListener("click", () => authManager.openProfileEdit());
    document.getElementById("profile-signout-btn")?.addEventListener("click", () => this.signOut());

    container.querySelectorAll("[data-profile-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-profile-action");
        if (action === "preferences") authManager.openTripPreferencesModal();
        else if (action === "hotel") hotelSafety.openHotelModal();
        else if (action === "radar") this.switchTab("radar");
        else if (action === "qr") this.switchTab("guide-qr");
        else if (action === "reviews") this.switchTab("driver-reviews");
        else if (action === "ledger") this.switchTab("ledger");
        else if (action === "sos") this.switchTab("transit");
      });
    });
  }

  // --- Handshake Execution Flow ---
  async executeHandshakeFlow() {
    const record =
      await digitalHandshake.simulateLiveHandshake();

    if (record) {
      this.onHandshakeSuccess(record);
    }
  }

  onHandshakeSuccess(record) {
    const modal =
      document.getElementById(
        "handshake-success-modal"
      );

    const content =
      document.getElementById(
        "handshake-success-content"
      );

    if (!modal || !content) return;

    /*
     * IMPORTANT:
     * Everything below comes from the authenticated/scanned
     * driver QR payload first.
     *
     * The store.activeGuide fallback is used only when the
     * QR payload does not contain that particular field.
     */

    const aadharVal =
      record.guideAadharNo ||
      record.aadharNo ||
      "Not Provided";

    const vehicleVal =
      record.guideVehicleRegNo ||
      record.vehicleRegNo ||
      "Not Provided";

    const driverPhoto =
      record.guidePhoto ||
      record.photo ||
      store.activeGuide.photo ||
      "";

    const driverTrust =
      record.guideTrustScore ??
      record.trustScore ??
      store.activeGuide.trustScore ??
      0;

    const driverEncounters =
      record.guideEncounterCount ??
      record.encounterCount ??
      store.activeGuide.encounterCount ??
      0;

    const driverName =
      record.guideName ||
      record.name ||
      "Unknown Driver";

    const driverPhone =
      record.guidePhone ||
      record.phone ||
      "";

    const driverLicense =
      record.guideLicenseNo ||
      record.licenseNo ||
      record.guideRtoLicenseNo ||
      record.rtoLicenseNo ||
      "Not Provided";

    const driverRtoLicense =
      record.guideRtoLicenseNo ||
      record.rtoLicenseNo ||
      driverLicense;

    const driverIssuer =
      record.guideIssuer ||
      record.issuer ||
      "Not Provided";

    const driverGovtIssuer =
      record.guideGovtIssuer ||
      record.govtIssuer ||
      driverIssuer;

    const driverVehicleType =
      record.guideVehicleType ||
      record.vehicleType ||
      "Not Provided";

    const driverCategory =
      record.guideCategory ||
      record.category ||
      "Not Provided";

    const driverId =
      record.guideId ||
      record.driverId ||
      record.id ||
      null;

    /*
     * CRITICAL FIX:
     * Replace the currently active driver with the driver
     * authenticated by the QR handshake.
     *
     * This means the next safety card will use the scanned
     * driver's actual information instead of always using
     * the default Mehul Bhai profile.
     */
    transitSafety.activeDriver = {
      ...(store.activeGuide || {}),

      id: driverId,
      uid: driverId,

      name: driverName,
      phone: driverPhone,

      photo: driverPhoto,

      vehicleRegNo: vehicleVal,
      vehicleType: driverVehicleType,

      licenseNo: driverLicense,
      rtoLicenseNo: driverRtoLicense,

      issuer: driverIssuer,
      govtIssuer: driverGovtIssuer,

      aadharNo: aadharVal,

      category: driverCategory,

      rating:
        record.guideRating ??
        record.rating ??
        0,

      trustScore: driverTrust,

      encounterCount: driverEncounters
    };

    content.innerHTML = `
      <div class="verified-encounter-card animate-bounce-in">

        <div class="badge-shield-wrap">
          <div class="shield-circle">
            <i class="fas fa-shield-check"></i>
          </div>

          <span class="encounter-verified-text">
            DIGITAL HANDSHAKE VERIFIED
          </span>
        </div>

        <div class="verified-guide-profile">

          <img
            src="${driverPhoto}"
            alt="${driverName}"
            class="verified-guide-avatar"
          >

          <div class="verified-guide-text">

            <h3>${driverName}</h3>

            <p
              class="vehicle-badge-pill"
              style="
                background: #fef3c7;
                color: #92400e;
                padding: 2px 8px;
                border-radius: 4px;
                display: inline-block;
                font-family: monospace;
                font-weight: bold;
                margin-bottom: 2px;
              "
            >
              <i class="fas fa-taxi"></i>
              Vehicle No: ${vehicleVal}
            </p>

            <p
              class="aadhar-tag"
              style="
                font-size: 11px;
                color: #64748b;
                margin-bottom: 6px;
                font-weight: 500;
              "
            >
              <i class="fas fa-id-card"></i>
              Aadhaar No:
              <strong>${aadharVal}</strong>
            </p>

            <p
              class="lic-tag"
              style="
                font-size: 13px;
                margin-bottom: 2px;
              "
            >
              <i class="fas fa-id-badge"></i>
              RTO License:
              <strong>${driverLicense}</strong>
            </p>

            <p
              class="issuer-tag"
              style="
                font-size: 12px;
                color: #64748b;
              "
            >
              <i class="fas fa-university"></i>
              ${driverIssuer}
            </p>

          </div>
        </div>

        <div class="encounter-metrics-grid">

          <div class="metric-item">
            <span class="m-label">
              Physical Proximity
            </span>

            <span class="m-val text-success">
              ${record.distanceMeters}m (Verified)
            </span>
          </div>

          <div class="metric-item">
            <span class="m-label">
              Govt Verification
            </span>

            <span class="m-val text-success">
              ${driverGovtIssuer || "Verified"}
            </span>
          </div>

          <div class="metric-item">
            <span class="m-label">
              Verified Encounters
            </span>

            <span class="m-val">
              ${driverEncounters + 1} On Record
            </span>
          </div>

          <div class="metric-item">
            <span class="m-label">
              Trust Index
            </span>

            <span class="m-val text-success">
              ${driverTrust}% Authenticity
            </span>
          </div>

        </div>

        <div class="encounter-ledger-proof">
          <i class="fas fa-link"></i>
          Immutable Ledger Hash:
          <code>${record.tokenHash}</code>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-block btn-lg"
          id="proceed-to-review-btn"
        >
          <i class="fas fa-arrow-right"></i>
          Leave a Proof-of-Presence Review
        </button>

      </div>
    `;

    modal.classList.add("active");

    const proceedBtn =
      document.getElementById(
        "proceed-to-review-btn"
      );

    if (proceedBtn) {
      proceedBtn.onclick = (e) => {
        e.preventDefault();

        modal.classList.remove("active");

        const targetGuideId =
          driverId ||
          store.activeGuide.id ||
          store.activeGuide.uid;

        reviewsManager.renderGuideLedger(
          targetGuideId,
          "guide-ledger-container"
        );

        this.switchTab("ledger");
      };
    }
  }

  // --- SOS Flow ---
  triggerSosFlow() {
    const dossier =
      evidencePacketManager.compileDossier({
        category:
          "Extortionate Overcharging & Street Tout Harassment",

        suspectName:
          transitSafety.activeDriver?.name ||
          store.activeGuide.name,

        suspectLicense:
          transitSafety.activeDriver?.licenseNo ||
          store.activeGuide.licenseNo,

        quotedPrice: 450,

        description:
          `Unregulated operator approached at ${store.currentLocation.name}. Demanded ₹450 cash for standard ₹100 local route.`
      });

    evidencePacketManager.showEvidenceModal(
      dossier
    );
  }
}

// Global Exports
window.veridaApp = new App();
window.digitalHandshake = digitalHandshake;
window.demoSimulator = demoSimulator;
window.hotspotRadar = hotspotRadar;
window.reviewsManager = reviewsManager;
window.evidencePacketManager = evidencePacketManager;
window.transitSafety = transitSafety;
window.authManager = authManager;
window.store = store;

// Immediate or DOMContentLoaded trigger
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      window.veridaApp.init();
      // Fallback explicit rendering AFTER globals are assigned
      try { transitSafety.initRoutePlanner(); } catch(e) {}
    }
  );
} else {
  window.veridaApp.init();
  // Fallback explicit rendering AFTER globals are assigned
  setTimeout(() => {
    try { transitSafety.initRoutePlanner(); } catch(e) {}
  }, 50);
}