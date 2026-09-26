/**
 * Verida — Live Price Pulse Module (Feature #3)
 * Dynamic Price Ticker + 3-Second Post-Handshake Rate Logger + Fair Price Brackets
 */

import { store } from "./store.js";

export class PricePulse {
  constructor() {
    this.tickerInterval = null;
    this.activeFilter = "all";
  }

  // --- Render Live Price Ticker Banner & List ---
  renderTicker(tickerContainerId = "price-pulse-ticker", listContainerId = "price-pulse-feed") {
    const tickerContainer = document.getElementById(tickerContainerId);
    const listContainer = document.getElementById(listContainerId);

    const pulses = store.getPricePulses(store.currentCityId);

    // Filter by active category
    const filtered = this.activeFilter === "all"
      ? pulses
      : pulses.filter(p => (p.serviceCategory || p.serviceType || "").toLowerCase().includes(this.activeFilter.toLowerCase()));

    // 1. Ticker Top Ticker Strip
    if (tickerContainer && pulses.length > 0) {
      const topItems = pulses.slice(0, 5);
      tickerContainer.innerHTML = topItems.map(p => {
        const timeAgo = this.formatTimeAgo(p.createdAt);
        return `
          <div class="ticker-item">
            <span class="ticker-dot"></span>
            <span class="ticker-service"><strong>${p.serviceType || "Service"}</strong></span>
            <span class="ticker-price">₹${p.amount}</span>
            <span class="ticker-meta">${p.locationLabel || p.monumentId || "Local"} • ${timeAgo}</span>
          </div>
        `;
      }).join("");
    }

    // 2. Full Feed List
    if (listContainer) {
      if (filtered.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <p>No recent price pulses for this filter. Complete a Digital Handshake to log the first price!</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = filtered.map(p => {
        const timeAgo = this.formatTimeAgo(p.createdAt);
        return `
          <div class="price-pulse-card animate-fade-in">
            <div class="pulse-header">
              <span class="service-badge"><i class="fas fa-tag"></i> ${p.serviceType || "Local Transit"}</span>
              <span class="time-badge">${timeAgo}</span>
            </div>
            <div class="pulse-body">
              <div class="pulse-price-row">
                <span class="pulse-amount">₹${p.amount}</span>
                <span class="pulse-bracket">Range: ${p.rangeTag || "Verified"}</span>
              </div>
              <p class="pulse-location"><i class="fas fa-map-marker-alt"></i> ${p.locationLabel || "Verified Encounter Location"}</p>
            </div>
            <div class="pulse-footer">
              <span class="pulse-traveler"><i class="fas fa-user-check"></i> ${p.travelerName || "Verified Traveler"}</span>
              <span class="pulse-guide"><i class="fas fa-id-badge"></i> ${p.guideName || "Registered Partner"}</span>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // --- 3-Second Post-Handshake Prompt ---
  showPostHandshakePrompt(handshakeRecord, onComplete) {
    const modal = document.getElementById("price-prompt-modal");
    if (!modal) return;

    const modalTitle = document.getElementById("price-prompt-title");
    const modalPills = document.getElementById("price-prompt-pills");
    const customInput = document.getElementById("price-prompt-custom-amount");
    const submitBtn = document.getElementById("price-prompt-submit-btn");

    if (modalTitle) {
      modalTitle.textContent = `What rate did you agree to pay ${handshakeRecord.guideName}?`;
    }

    // Benchmark brackets for current location
    const benchmark = store.getFairRateBenchmark(handshakeRecord.monumentId, handshakeRecord.guideCategory);
    const min = benchmark.min || 100;
    const median = benchmark.median || 200;
    const max = benchmark.max || 350;

    const suggestedRanges = [
      { label: `Under ₹${min}`, value: min * 0.9, rangeTag: `Under ₹${min}` },
      { label: `₹${min}–₹${median} (Standard)`, value: median, rangeTag: `₹${min}–₹${median}`, default: true },
      { label: `₹${median}–₹${max}`, value: max, rangeTag: `₹${median}–₹${max}` },
      { label: `₹${max}+ (High)`, value: max * 1.3, rangeTag: `₹${max}+` }
    ];

    let selectedRange = suggestedRanges[1];

    if (modalPills) {
      modalPills.innerHTML = suggestedRanges.map((rng, idx) => `
        <button type="button" class="range-pill-btn ${rng.default ? 'active' : ''}" data-index="${idx}">
          ${rng.label}
        </button>
      `).join("");

      // Add click listeners to pills
      modalPills.querySelectorAll(".range-pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          modalPills.querySelectorAll(".range-pill-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const idx = parseInt(btn.getAttribute("data-index"), 10);
          selectedRange = suggestedRanges[idx];
          if (customInput) customInput.value = "";
        });
      });
    }

    // Show modal
    modal.classList.add("active");

    // Handle Submit
    const handleSubmit = async (e) => {
      if (e) e.preventDefault();
      let finalAmount = selectedRange.value;
      let finalRangeTag = selectedRange.rangeTag;

      if (customInput && customInput.value && parseFloat(customInput.value) > 0) {
        finalAmount = parseFloat(customInput.value);
        finalRangeTag = `Exact ₹${finalAmount}`;
      }

      const pulseRecord = {
        handshakeId: handshakeRecord.id,
        monumentId: handshakeRecord.monumentId || "vad-laxmi-vilas",
        city: store.currentCityId,
        serviceType: handshakeRecord.guideCategory || "Transit & Heritage",
        serviceCategory: handshakeRecord.guideCategory || "Transit & Heritage",
        amount: Math.round(finalAmount),
        rangeTag: finalRangeTag,
        guideId: handshakeRecord.guideId,
        guideName: handshakeRecord.guideName,
        travelerName: store.activeUser.name,
        locationLabel: handshakeRecord.monumentName || "Vadodara Transit Corridor",
        createdAt: Date.now()
      };

      await store.recordPricePulse(pulseRecord);
      this.renderTicker();
      modal.classList.remove("active");

      // Trigger Confetti Celebration Animation
      if (typeof confetti === "function") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Notify Driver Screen (single-view driver mode)
      this._notifyDriverScreen(finalAmount, handshakeRecord, pulseRecord);

      // Show non-blocking confirmation toast
      this._showConfirmToast(`✅ ₹${Math.round(finalAmount)} pulse logged! Future travelers are protected.`);

      if (onComplete) onComplete(pulseRecord);
    };

    if (submitBtn) {
      submitBtn.onclick = handleSubmit;
    }
  }

  formatTimeAgo(timestamp) {
    const diffMins = Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60)));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  }

  _buildLedgerItem(finalAmount, handshakeRecord, pulseRecord) {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.style.animation = "fade-in 0.4s ease";
    item.innerHTML = `
      <div class="timeline-dot verified"></div>
      <div class="timeline-card">
        <div class="timeline-card-header">
          <strong>${store.activeUser.name} (Verified Passenger)</strong>
          <span style="color:var(--primary);font-weight:800;">₹${Math.round(finalAmount)}</span>
        </div>
        <div class="presence-watermark"><i class="fas fa-shield-check"></i> Handshake Proximity Verified (&lt;10m)</div>
        <p class="review-text">Route / Spot: ${pulseRecord.locationLabel}</p>
        <span class="token-mono">Hash: ${handshakeRecord.tokenHash || "0x98f4a1c79e821034bcfa894"}</span>
      </div>
    `;
    return item;
  }

  _notifyDriverScreen(finalAmount, handshakeRecord, pulseRecord) {
    const toastHTML = `
      <div class="driver-toast-header">
        <div class="driver-toast-icon">🎉</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:13px;">NEW PASSENGER VERIFIED</div>
          <div class="driver-toast-route">${store.activeUser.name} • ${pulseRecord.locationLabel}</div>
        </div>
        <div class="driver-toast-amount">₹${Math.round(finalAmount)}</div>
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.6);font-family:var(--font-mono);">
        Token: ${handshakeRecord.tokenHash || "0x98f4a1c7"}
      </div>
    `;

    // Single-view driver panel toast
    const single = document.getElementById("driver-live-notification-toast");
    if (single) {
      single.innerHTML = toastHTML;
      single.classList.remove("hidden");
      setTimeout(() => single.classList.add("hidden"), 9000);
    }

    // Dual-screen driver panel toast
    const dual = document.getElementById("driver-live-notification-toast-dual");
    if (dual) {
      dual.innerHTML = toastHTML;
      dual.classList.remove("hidden");
      setTimeout(() => dual.classList.add("hidden"), 9000);
    }

    // Update single-view driver ledger
    const singleLedger = document.getElementById("guide-self-ledger");
    if (singleLedger) singleLedger.prepend(this._buildLedgerItem(finalAmount, handshakeRecord, pulseRecord));

    // Update dual-screen driver ledger
    const dualLedger = document.getElementById("guide-self-ledger-dual");
    if (dualLedger) dualLedger.prepend(this._buildLedgerItem(finalAmount, handshakeRecord, pulseRecord));
  }

  _showConfirmToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #059669; color: #fff; padding: 12px 24px; border-radius: 50px;
      font-size: 13px; font-weight: 700; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      z-index: 9999; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); opacity: 0;
      white-space: nowrap;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(20px)";
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
}

export const pricePulse = new PricePulse();

