/**
 * Verida — Comprehensive Seed Data & Tourism Knowledge Base
 * Includes full coverage for Vadodara (Gujarat), Agra (UP), Delhi (NCR), and Jaipur (Rajasthan).
 * Features Digital Footprint data, Driver safety credentials, Route pairs, and "Last 3 Passengers Paid" benchmarks.
 */

export const SEED_CITIES = {
  vadodara: {
    id: "vadodara",
    name: "Vadodara (Baroda)",
    state: "Gujarat",
    country: "India",
    center: { lat: 22.3072, lng: 73.1812 },
    zoom: 13,
    emergencyHelpline: "1363 / 112",
    womensHelpline: "181 (Abhayam Gujarat) / 1090",
    localPoliceStation: "Sayajigunj Police Station / Vadodara Tourism Desk",
    localPolicePhone: "0265-2223333",
    currency: "INR",
    symbol: "₹"
  },
  agra: {
    id: "agra",
    name: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    center: { lat: 27.1751, lng: 78.0421 },
    zoom: 13,
    emergencyHelpline: "1363 / 112",
    womensHelpline: "1090 (Women Power Line UP)",
    localPoliceStation: "Taj Mahal Tourist Police Station",
    localPolicePhone: "0562-2421204",
    currency: "INR",
    symbol: "₹"
  },
  delhi: {
    id: "delhi",
    name: "Delhi NCR",
    state: "Delhi",
    country: "India",
    center: { lat: 28.6562, lng: 77.2410 },
    zoom: 13,
    emergencyHelpline: "1363 / 112",
    womensHelpline: "1091 / 112",
    localPoliceStation: "Paharganj / Red Fort Tourist Police Booth",
    localPolicePhone: "011-23261665",
    currency: "INR",
    symbol: "₹"
  },
  jaipur: {
    id: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    country: "India",
    center: { lat: 26.9239, lng: 75.8267 },
    zoom: 13,
    emergencyHelpline: "1363 / 112",
    womensHelpline: "1090",
    localPoliceStation: "Hawa Mahal Tourist Assistance Kiosk",
    localPolicePhone: "0141-2603444",
    currency: "INR",
    symbol: "₹"
  }
};

// --- POPULAR TRANSIT ROUTES & "LAST 3 PASSENGERS PAID" DATA ---
export const SEED_ROUTES = [
  // Vadodara Routes
  {
    id: "route-vad-stn-palace",
    city: "vadodara",
    fromName: "Vadodara Junction (Railway Station)",
    fromLat: 22.3106,
    fromLng: 73.1813,
    toName: "Laxmi Vilas Palace (Old Palace Rd)",
    toLat: 22.2937,
    toLng: 73.1916,
    distanceKm: 3.4,
    vehicleType: "Auto-Rickshaw (CNG Green)",
    fairRange: { min: 80, median: 100, max: 120 },
    last3PassengersPaid: [
      { passengerName: "Marcus K. (Germany)", amount: 100, timeAgo: "14m ago", vehicleNo: "GJ-06-AU-7892", driverName: "Mehul Bhai Solanki" },
      { passengerName: "Priya & Rohan (Bangalore)", amount: 90, timeAgo: "42m ago", vehicleNo: "GJ-06-AU-4410", driverName: "Ramesh R. Rathod" },
      { passengerName: "Claire L. (France)", amount: 100, timeAgo: "1.5h ago", vehicleNo: "GJ-06-AU-8921", driverName: "Ketan Bhai" }
    ],
    toutScamWarning: "Unmetered drivers at Platform 6 exit frequently demand ₹250–₹400. Fair verified rate is ₹90–₹100."
  },
  {
    id: "route-vad-alkapuri-sayaji",
    city: "vadodara",
    fromName: "Alkapuri Hub / RC Dutt Road",
    fromLat: 22.3120,
    fromLng: 73.1750,
    toName: "Sayaji Baug (Kamati Baug Zoo & Museum)",
    toLat: 22.3142,
    toLng: 73.1873,
    distanceKm: 2.1,
    vehicleType: "Auto-Rickshaw",
    fairRange: { min: 40, median: 60, max: 70 },
    last3PassengersPaid: [
      { passengerName: "Daniel W. (UK)", amount: 60, timeAgo: "8m ago", vehicleNo: "GJ-06-AU-7892", driverName: "Mehul Bhai Solanki" },
      { passengerName: "Ananya S. (Mumbai)", amount: 50, timeAgo: "35m ago", vehicleNo: "GJ-06-AU-1102", driverName: "Sanjay Patel" },
      { passengerName: "Kevin B. (USA)", amount: 60, timeAgo: "1.1h ago", vehicleNo: "GJ-06-AU-5591", driverName: "Dinesh K." }
    ],
    toutScamWarning: "Drivers may claim zoo is closed to take you to expensive souvenir shops. Sayaji Baug is open daily."
  },
  {
    id: "route-vad-stn-mandvi",
    city: "vadodara",
    fromName: "Vadodara Junction Railway Station",
    fromLat: 22.3106,
    fromLng: 73.1813,
    toName: "Mandvi Gate & Lehripura Old Market",
    toLat: 22.2996,
    toLng: 73.2105,
    distanceKm: 4.2,
    vehicleType: "Auto-Rickshaw",
    fairRange: { min: 70, median: 90, max: 110 },
    last3PassengersPaid: [
      { passengerName: "Sophie Martin (Tourist)", amount: 90, timeAgo: "22m ago", vehicleNo: "GJ-06-AU-7892", driverName: "Mehul Bhai Solanki" },
      { passengerName: "Kavita D. (Ahmedabad)", amount: 80, timeAgo: "55m ago", vehicleNo: "GJ-06-AU-3341", driverName: "Vijay Solanki" },
      { passengerName: "Elena V. (Spain)", amount: 100, timeAgo: "2h ago", vehicleNo: "GJ-06-AU-7729", driverName: "Mohsin Khan" }
    ],
    toutScamWarning: "Touts offer to take you to 'special wholesale shops' for commission. Ask to be dropped strictly at Mandvi Gate."
  },
  {
    id: "route-vad-city-champaner",
    city: "vadodara",
    fromName: "Vadodara City Center / Station",
    fromLat: 22.3106,
    fromLng: 73.1813,
    toName: "Champaner-Pavagadh UNESCO Archaeological Park",
    toLat: 22.4833,
    toLng: 73.5333,
    distanceKm: 48.0,
    vehicleType: "AC Private Taxi / Cab (Roundtrip with waiting)",
    fairRange: { min: 1800, median: 2200, max: 2500 },
    last3PassengersPaid: [
      { passengerName: "Dr. Thomas H. (Germany)", amount: 2200, timeAgo: "3h ago", vehicleNo: "GJ-06-TA-9912", driverName: "Hardik Patel" },
      { passengerName: "Sneha & Family (Delhi)", amount: 2000, timeAgo: "5h ago", vehicleNo: "GJ-06-TA-1823", driverName: "Pravin Bhai" },
      { passengerName: "Kenji T. (Japan)", amount: 2300, timeAgo: "Yesterday", vehicleNo: "GJ-06-TA-7741", driverName: "Imran Mansuri" }
    ],
    toutScamWarning: "Always pre-confirm toll and 3-hour waiting charges inside the total quoted fare."
  },
  {
    id: "route-vad-city-statue-of-unity",
    city: "vadodara",
    fromName: "Vadodara Central",
    fromLat: 22.3072,
    fromLng: 73.1812,
    toName: "Statue of Unity (Kevadia / Ekta Nagar)",
    toLat: 21.8380,
    toLng: 73.7191,
    distanceKm: 92.0,
    vehicleType: "Private Sedan Taxi (Full Day 8hr Tour)",
    fairRange: { min: 2800, median: 3200, max: 3600 },
    last3PassengersPaid: [
      { passengerName: "David & Sarah (Australia)", amount: 3200, timeAgo: "4h ago", vehicleNo: "GJ-06-TA-4499", driverName: "Rakesh J. Varma" },
      { passengerName: "Rajesh S. (Pune)", amount: 3000, timeAgo: "6h ago", vehicleNo: "GJ-06-TA-2391", driverName: "Jignesh Shah" },
      { passengerName: "Maria G. (Italy)", amount: 3300, timeAgo: "Yesterday", vehicleNo: "GJ-06-TA-8821", driverName: "Nilesh Bhai" }
    ],
    toutScamWarning: "Ensure Viewing Gallery entry is booked online at soutickets.in. Drivers cannot purchase entry tickets on the spot."
  }
];

// --- VERIFIED DRIVERS WITH DETAILED SAFETY PROFILES ---
export const SEED_DRIVERS = [
  {
    id: "driver-vad-001",
    name: "Mehul Bhai Solanki",
    city: "vadodara",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    phone: "+91 94260 55321",
    vehicleType: "Green CNG Auto-Rickshaw",
    vehicleRegNo: "GJ-06-AU-7892",
    vehicleModel: "Bajaj RE CNG Green (Vadodara)",
    rtoLicenseNo: "GJ-06-2018-009124",
    badgeNo: "VAD-AUTO-772",
    rating: 4.92,
    totalTrips: 640,
    trustScore: 98,
    verifiedSince: "2021-03-12",
    govtIssuer: "Vadodara RTO & Police Tourist Syndicate",
    languages: ["Gujarati", "Hindi", "Basic English"],
    emergencyNumbers: {
      driverPhone: "+91 94260 55321",
      policeHelpline: "112 / 100",
      localStation: "Sayajigunj Police Station (0265-2223333)",
      womensHelpline: "181 (Abhayam Gujarat) / 1090",
      touristPolice: "1363 (National Tourist Helpline)"
    }
  },
  {
    id: "driver-vad-002",
    name: "Hardik R. Patel",
    city: "vadodara",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "+91 98251 34912",
    vehicleType: "AC Sedan Tourist Taxi",
    vehicleRegNo: "GJ-06-TA-9912",
    vehicleModel: "Maruti Dzire Tour (White)",
    rtoLicenseNo: "GJ-06-2015-088192",
    badgeNo: "GUJ-TOUR-CAB-441",
    rating: 4.96,
    totalTrips: 420,
    trustScore: 99,
    verifiedSince: "2019-10-05",
    govtIssuer: "Gujarat Tourism Board & Vadodara Transport Authority",
    languages: ["English", "Gujarati", "Hindi"],
    emergencyNumbers: {
      driverPhone: "+91 98251 34912",
      policeHelpline: "112 / 100",
      localStation: "Sayajigunj Police Station (0265-2223333)",
      womensHelpline: "181 (Abhayam Gujarat) / 1090",
      touristPolice: "1363"
    }
  }
];

// --- HERITAGE MONUMENTS & LANDMARKS ---
export const SEED_MONUMENTS = [
  // --- VADODARA: Hotels & Accommodations ---
  {
    id: "vad-grand-mercure",
    city: "vadodara",
    category: "Hotels",
    name: "Grand Mercure Vadodara Surya Palace",
    highlights: "Upscale 5-star hotel in Sayajigunj with fine dining, banquet halls & 24/7 reception",
    description: "Grand Mercure Vadodara Surya Palace is a premier luxury business hotel in Sayajigunj, conveniently situated near Vadodara Railway Station. It features modern accommodations, multiple fine-dining options, extensive banquet spaces, and 24-hour guest concierge.",
    locationDesc: "Sayajigunj, Near Railway Station, Vadodara",
    lat: 22.3102,
    lng: 73.1834,
    rating: 4.5,
    priceLevel: "₹4,500 – ₹7,500 / night",
    imageUrl: "https://www.ahstatic.com/photos/9278_ho_00_p_1024x768.jpg",
    imageAlt: "Grand Mercure Vadodara Surya Palace",
    amenities: ["24/7 Front Desk", "Free High-Speed Wi-Fi", "Azure Fine Dining", "Valet Parking", "Fitness Center", "24-Hour Room Service", "Airport Shuttle"],
    openingHours: "Open 24 hours (Check-in 2:00 PM / Check-out 12:00 PM)",
    dayInfo: {
      activity: "High",
      pedestrian: "High",
      transport: "Excellent",
      notes: "Check-in starts at 2:00 PM. Concierge desk, business center, and Azure restaurant active throughout the day. Direct taxi and auto access outside."
    },
    nightInfo: {
      activity: "Medium (Internal 24/7)",
      street_lighting: "Excellent",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Hotel reception and room service operate 24/7. Main entrance and Sayajigunj arterial road are bright and well-lit with round-the-clock taxi availability."
    },
    areaSafety: {
      daytime_activity: "High",
      nighttime_activity: "Medium",
      street_lighting: "Excellent",
      pedestrian_activity: "High",
      transport_availability: "Excellent",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data — PROTOTYPE DATA"
    },
    scamAlerts: [],
    fairRates: {
      "Auto-Rickshaw (Station to Hotel)": { min: 40, median: 60, max: 80, unit: "point-to-point" },
      "Airport Taxi (Hotel to Vadodara Airport)": { min: 250, median: 350, max: 450, unit: "one way" }
    }
  },

  // --- VADODARA: Heritage & Architectural Landmarks ---
  {
    id: "vad-laxmi-vilas",
    city: "vadodara",
    category: "Heritage",
    name: "Laxmi Vilas Palace",
    highlights: "Grand Indo-Saracenic royal residence, 4× size of Buckingham Palace",
    description: "Laxmi Vilas Palace is a stunning Indo-Saracenic masterpiece built in 1890 by Maharaja Sayajirao Gaekwad III. At 500 rooms, it is four times the size of Buckingham Palace and remains the private residence of the royal Gaekwad family. The palace grounds feature the Maharaja Fateh Singh Museum, a 19th-century armory, and beautifully maintained Mughal-style gardens.",
    locationDesc: "Old Palace Road, Vadodara",
    lat: 22.2937,
    lng: 73.1916,
    rating: 4.6,
    priceLevel: "Entry ₹200–₹400 (ASI counter)",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Laxmi%20Vilas%20Palace%20%28Maratha%20Palace%29%2C%20Vadodara.JPG?width=800",
    imageAlt: "Laxmi Vilas Palace, Vadodara",
    amenities: ["Audio Guide (₹150)", "Guided Tours", "Museum On-site", "Parking", "Photography Allowed", "Family Friendly", "Restrooms"],
    openingHours: "9:30 AM – 5:30 PM (Closed Mondays)",
    dayInfo: {
      activity: "High",
      pedestrian: "High",
      transport: "Good",
      notes: "Peak tourist hours 10 AM – 1 PM. Autorickshaws available outside main gate."
    },
    nightInfo: {
      activity: "Low (grounds close at 6 PM)",
      street_lighting: "Good (Palace Road)",
      pedestrian: "Low",
      transport: "Limited",
      notes: "Palace closes at dusk. Area is generally quiet post-6 PM. Street lighting on Palace Road is good."
    },
    areaSafety: {
      daytime_activity: "High",
      nighttime_activity: "Low",
      street_lighting: "Good",
      pedestrian_activity: "Medium",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 1,
      last_updated: "15 Sep 2026",
      source: "Verida Area Safety Data — PROTOTYPE DATA"
    },
    scamAlerts: [
      {
        id: "sc-laxmi-guide",
        title: "Unofficial 'Royal Family' Guides",
        category: "Fake Guide Scam",
        description: "Touts near the outer gate claim to be relatives of the royal family or 'authorized private tour guides' and demand ₹1,500+ for interior access. The official audio guide is ₹150 at the ticket window.",
        reported_count: 8,
        last_reported: "12 Sep 2026",
        source: "Verida Demo Data — PROTOTYPE DATA",
        verified: true,
        recommended_action: "Use only the official audio guide available at the ticket counter. Do not follow anyone who approaches you outside the gate.",
        isDemoData: true
      }
    ],
    fairRates: {
      "Official Guide": { min: 350, median: 450, max: 600, unit: "per tour (up to 4 pax)" },
      "Auto-Rickshaw (Station to Palace)": { min: 80, median: 100, max: 130, unit: "point-to-point" },
      "Palace Audio Guide": { min: 150, median: 150, max: 150, unit: "official ASI counter" }
    }
  },

  {
    id: "vad-kirti-mandir",
    city: "vadodara",
    category: "Heritage",
    name: "Kirti Mandir",
    highlights: "Memorial built by Maharaja Sayajirao Gaekwad III; serene interiors & royal murals",
    description: "Kirti Mandir is the cenotaph of the Gaekwads, built by Maharaja Sayajirao Gaekwad III in memory of his ancestors. The 'E' shaped building features balconies, terraces, and a 33-meter high central sikhara with murals painted by Nandalal Bose.",
    locationDesc: "Near Mandvi Gate, Vadodara",
    lat: 22.3015,
    lng: 73.2084,
    rating: 4.5,
    priceLevel: "Free Entry",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Kirti%20Mandir%2C%20Vadadora%20%28Baroda%29%20-%20India%20%283-2%29%20%288147894472%29.jpg?width=800",
    imageAlt: "Kirti Mandir, Vadodara",
    amenities: ["Royal Cenotaph", "Nandalal Bose Murals", "Peaceful Atmosphere", "Restrooms"],
    openingHours: "9:00 AM – 12:00 PM, 2:30 PM – 5:30 PM",
    dayInfo: {
      activity: "Medium",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Peaceful environment. Best visited in the morning."
    },
    nightInfo: null,
    areaSafety: {
      daytime_activity: "Medium",
      nighttime_activity: "Low",
      street_lighting: "Medium",
      pedestrian_activity: "Medium",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Local Guide": { min: 150, median: 250, max: 350, unit: "per group" },
      "Auto-Rickshaw": { min: 50, median: 70, max: 90, unit: "from Alkapuri" }
    }
  },
  {
    id: "vad-mandvi-gate",
    city: "vadodara",
    category: "Heritage",
    name: "Mandvi Gate & Old Market",
    highlights: "Historic city gate surrounded by bustling bazaars & textile markets",
    description: "Built during the Mughal period, Mandvi Gate is a prominent square pavilion featuring three bold arched openings on each of its four sides. The area is highly active and acts as the heart of Vadodara's old city shopping district.",
    locationDesc: "Mandvi area, Old City",
    lat: 22.2996,
    lng: 73.2105,
    rating: 4.3,
    priceLevel: "Market Shopping",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Mandvi%20Gate.jpg?width=800",
    imageAlt: "Mandvi Gate, Vadodara",
    amenities: ["Traditional Bazaars", "Handicrafts & Textiles", "Street Food", "Historic Gate Architecture"],
    openingHours: "Markets open 10:00 AM – 9:00 PM",
    dayInfo: {
      activity: "Very High",
      pedestrian: "Very High",
      transport: "Good",
      notes: "Extremely crowded market area. Watch out for traffic and pickpockets."
    },
    nightInfo: {
      activity: "Medium",
      street_lighting: "Good",
      pedestrian: "High",
      transport: "Good",
      notes: "Markets remain open till late evening. Well lit but still crowded."
    },
    areaSafety: {
      daytime_activity: "Very High",
      nighttime_activity: "Medium",
      street_lighting: "Good",
      pedestrian_activity: "Very High",
      transport_availability: "Good",
      emergency_access: "Limited (due to traffic)",
      reported_incidents: 2,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Heritage Walking Guide": { min: 250, median: 350, max: 500, unit: "2 hr walk" },
      "Auto-Rickshaw": { min: 60, median: 80, max: 100, unit: "from Station" }
    }
  },
  {
    id: "vad-nyaya-mandir",
    city: "vadodara",
    category: "Heritage",
    name: "Nyaya Mandir",
    highlights: "Architectural marvel of Byzantine-Gothic design, historic judicial landmark",
    description: "Nyaya Mandir, meaning 'Temple of Justice', is a magnificent piece of Byzantine architecture built in 1896 by Maharaja Sayajirao Gaekwad III. It served as the district court of Vadodara for over a century. It houses a statue of Maharani Chimnabai.",
    locationDesc: "Near Mandvi Circle, Vadodara",
    lat: 22.3001,
    lng: 73.2065,
    rating: 4.2,
    priceLevel: "Exterior Sightseeing",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Nyay%20Mandir%20-%20Vadodara%20-%20Gujarat%20-%20DSC001.jpg?width=800",
    imageAlt: "Nyaya Mandir, Vadodara",
    amenities: ["Architectural Landmark", "Photographic Spot", "Historic Building"],
    openingHours: "Exterior viewing open daily",
    dayInfo: {
      activity: "Medium",
      pedestrian: "High",
      transport: "Good",
      notes: "Busy traffic area around the circle."
    },
    nightInfo: {
      activity: "Low",
      street_lighting: "Good",
      pedestrian: "Medium",
      transport: "Good",
      notes: "The building is beautifully illuminated at night, though the interior is closed."
    },
    areaSafety: {
      daytime_activity: "High",
      nighttime_activity: "Medium",
      street_lighting: "Good",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Architecture Guide": { min: 200, median: 300, max: 400, unit: "exterior walk" },
      "Auto-Rickshaw": { min: 50, median: 70, max: 90, unit: "standard fare" }
    }
  },
  {
    id: "vad-fateh-singh-museum",
    city: "vadodara",
    category: "Heritage",
    name: "Maharaja Fateh Singh Museum",
    highlights: "European paintings (Raja Ravi Varma originals), royal artefacts, bronzes",
    description: "Located within the Maharaja's palace grounds, this museum was originally a school for the Maharaja's children. Today, it holds a stunning collection of paintings by Raja Ravi Varma, along with Chinese and Japanese artefacts and European masterpieces.",
    locationDesc: "Palace Compound, Old Palace Road",
    lat: 22.2912,
    lng: 73.1902,
    rating: 4.6,
    priceLevel: "Entry ₹150–₹200",
    imageUrl: "https://shop.museumsofindia.org/sites/default/files/2017-09/Iconic_0.JPG",
    imageAlt: "Maharaja Fateh Singh Museum, Vadodara",
    amenities: ["Raja Ravi Varma Gallery", "Royal Portraits", "Marble Sculptures", "Parking", "Restrooms"],
    openingHours: "10:30 AM – 5:30 PM (Closed Mondays)",
    dayInfo: {
      activity: "Medium",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Inside palace grounds. Photography might be restricted."
    },
    nightInfo: null,
    areaSafety: {
      daytime_activity: "Medium",
      nighttime_activity: "Low",
      street_lighting: "Good",
      pedestrian_activity: "Medium",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Art & Museum Guide": { min: 300, median: 400, max: 550, unit: "guided museum tour" },
      "Auto-Rickshaw": { min: 70, median: 90, max: 120, unit: "from Alkapuri" }
    }
  },
  {
    id: "vad-baroda-museum",
    city: "vadodara",
    category: "Heritage",
    name: "Baroda Museum & Picture Gallery",
    highlights: "Art, archaeology, Egyptian mummy, Akota bronzes & whale skeleton",
    description: "Built in 1894 by Maharaja Sayajirao Gaekwad III, this museum features a vast collection of art, sculpture, ethnography, and natural history. The highlight is a 22-meter-long blue whale skeleton and an original Egyptian mummy.",
    locationDesc: "Inside Sayaji Baug, Dak Bungalow area",
    lat: 22.3129,
    lng: 73.1897,
    rating: 4.4,
    priceLevel: "Entry ₹20–₹50 (Ticket window)",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Baroda%20Museum%20exterior.jpg?width=800",
    imageAlt: "Baroda Museum and Picture Gallery, Vadodara",
    amenities: ["Museum Exhibits", "Picture Gallery", "Guided Tours", "Parking Nearby", "Restrooms"],
    openingHours: "10:30 AM – 5:00 PM (Closed on public holidays)",
    dayInfo: {
      activity: "High",
      pedestrian: "High",
      transport: "Good",
      notes: "Located inside Sayaji Baug; park entrance fees may apply. Auto-rickshaws available outside the park."
    },
    nightInfo: null,
    areaSafety: {
      daytime_activity: "High",
      nighttime_activity: "Low",
      street_lighting: "Good (Outside Park)",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Museum Walk Guide": { min: 200, median: 300, max: 450, unit: "1.5 hr tour" },
      "Auto-Rickshaw": { min: 40, median: 60, max: 80, unit: "from Station" }
    }
  },

  // --- VADODARA: Gardens, Lakes & Nature Spots ---
  {
    id: "vad-sayaji-baug",
    city: "vadodara",
    category: "Gardens",
    name: "Sayaji Baug (Kamati Baug)",
    highlights: "113-acre park, zoo, planetarium, floral clock, toy train & lush gardens",
    description: "Sayaji Baug, also known as Kamati Baug, is one of the largest city parks in India at 113 acres. Built by Maharaja Sayajirao Gaekwad III, it features a zoo with crocodiles & lions, a planetarium, a toy train, a Baroda Museum, and beautifully maintained flower gardens. An ideal half-day outing for families.",
    locationDesc: "Sayajigunj, Vadodara",
    lat: 22.3142,
    lng: 73.1873,
    rating: 4.4,
    priceLevel: "Zoo Entry ₹30–₹60 | Park: Free",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Sayaji%20Baug%28Kamati%20Baug%29%20Vadodara.jpg?width=800",
    imageAlt: "Sayaji Baug, Vadodara",
    amenities: ["Zoo Included", "Planetarium", "Toy Train", "Museum On-site", "Food Stalls", "Family Friendly", "Restrooms", "Wheelchair Access"],
    openingHours: "9:00 AM – 6:00 PM (Zoo closes at 5:30 PM)",
    dayInfo: {
      activity: "Very High",
      pedestrian: "Very High",
      transport: "Excellent",
      notes: "Very busy on weekends. Best visited on weekday mornings for a relaxed experience."
    },
    nightInfo: {
      activity: "Low (Park closes at dusk)",
      street_lighting: "Good (Sayajigunj area)",
      pedestrian: "Medium (surrounding roads)",
      transport: "Good",
      notes: "Park closes at 6 PM. The surrounding Sayajigunj area remains active at night with restaurants and markets."
    },
    areaSafety: {
      daytime_activity: "Very High",
      nighttime_activity: "Low",
      street_lighting: "Good",
      pedestrian_activity: "High",
      transport_availability: "Excellent",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "15 Sep 2026",
      source: "Verida Area Safety Data — PROTOTYPE DATA"
    },
    scamAlerts: [
      {
        id: "sc-sayaji-zoo",
        title: "'Zoo is Closed Today' Redirect Scam",
        category: "Tout Redirection",
        description: "Auto drivers and touts may tell you the zoo or garden is closed for a 'special event' and try to redirect you to expensive souvenir shops. Sayaji Baug is open daily except national holidays.",
        reported_count: 5,
        last_reported: "10 Sep 2026",
        source: "Verida Demo Data — PROTOTYPE DATA",
        verified: true,
        recommended_action: "Confirm operating hours at the main gate directly. Do not trust verbal claims from drivers or strangers.",
        isDemoData: true
      }
    ],
    fairRates: {
      "Auto-Rickshaw": { min: 30, median: 50, max: 70, unit: "from Station" }
    }
  },
  {
    id: "vad-sursagar-lake",
    city: "vadodara",
    category: "Gardens",
    name: "Sursagar Lake",
    highlights: "Central heritage lake with 120ft golden Shiva statue, evening illumination",
    description: "Sursagar Lake is the historic heart of Vadodara's old city, famous for its 120-foot golden statue of Lord Shiva standing in the middle of the lake. The lakeside promenade is a popular evening gathering spot with street food, vendors, and boats. The Shiva statue is dramatically illuminated after sunset.",
    locationDesc: "Center of Vadodara Old City",
    lat: 22.2987,
    lng: 73.2039,
    rating: 4.2,
    priceLevel: "Boating ₹50–₹100 per person | Promenade: Free",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Sursagar%20Lake.jpg?width=800",
    imageAlt: "Sursagar Lake, Vadodara",
    amenities: ["Boating Available", "Food Stalls", "Evening Illumination", "Promenade Walk", "Family Friendly"],
    openingHours: "Open 24 hrs | Boating: 6:00 AM – 8:00 PM",
    dayInfo: {
      activity: "Medium",
      pedestrian: "High",
      transport: "Good",
      notes: "Quiet in mornings. Busier in evenings with local visitors and street food."
    },
    nightInfo: {
      activity: "High (popular evening spot)",
      street_lighting: "Good",
      pedestrian: "High",
      transport: "Good",
      notes: "Very popular evening destination. The Shiva statue illumination makes it a landmark evening visit. Area is well-lit and has consistent foot traffic."
    },
    areaSafety: {
      daytime_activity: "Medium",
      nighttime_activity: "High",
      street_lighting: "Good",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 1,
      last_updated: "14 Sep 2026",
      source: "Verida Area Safety Data — PROTOTYPE DATA"
    },
    scamAlerts: [],
    fairRates: {
      "Boating (Official Rate)": { min: 50, median: 80, max: 100, unit: "per person" },
      "Auto-Rickshaw": { min: 50, median: 70, max: 90, unit: "from Alkapuri" }
    }
  },
  {
    id: "vad-ajwa-lake",
    city: "vadodara",
    category: "Gardens",
    name: "Ajwa Lake, Musical Gardens & Water Park",
    highlights: "Brindavan-inspired musical fountains, wave pools, picnic spot",
    description: "Ajwa Lake was created by Maharaja Sayajirao Gaekwad III to supply water to Vadodara. The adjacent garden features musical fountains modeled after Brindavan Gardens.",
    locationDesc: "Ajwa, 22 km east of Vadodara",
    lat: 22.3562,
    lng: 73.3850,
    rating: 4.3,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Ajwa%20Sarowar%2062%20doors.jpg?width=800",
    imageAlt: "Ajwa Lake, Vadodara",
    dayInfo: {
      activity: "Medium",
      pedestrian: "Medium",
      transport: "Moderate",
      notes: "Best visited on afternoon trips to enjoy musical garden fountain shows."
    },
    nightInfo: null,
    fairRates: {
      "Return Auto-Rickshaw (with 2hr waiting)": { min: 500, median: 650, max: 800, unit: "round trip" }
    }
  },
  {
    id: "vad-vishwamitri-riverfront",
    city: "vadodara",
    category: "Gardens",
    name: "Vishwamitri Riverfront & Narmada Canal Garden",
    highlights: "Scenic green river banks, crocodile viewing points & morning walking trails",
    description: "Lush green riverside promenade and walking trails along the Vishwamitri River, known for its natural biodiversity.",
    locationDesc: "Vishwamitri River banks & Canal corridor",
    lat: 22.2885,
    lng: 73.1865,
    rating: 4.1,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Vishwamitri%20River%20Vadodra%20Gujarat%20India.jpg?width=800",
    imageAlt: "Vishwamitri Riverfront, Vadodara",
    dayInfo: {
      activity: "Medium",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Popular for morning jogs and nature photography."
    },
    nightInfo: null,
    fairRates: {
      "Auto-Rickshaw": { min: 60, median: 80, max: 100, unit: "point-to-point" }
    }
  },

  // --- VADODARA: Temples & Spiritual Sites ---
  {
    id: "vad-eme-temple",
    city: "vadodara",
    category: "Temples",
    name: "EME Temple (Dakshinamurti)",
    highlights: "Unique geodesic aluminum dome structure built & maintained by the Indian Army EME",
    description: "EME Temple is a unique modern temple constructed out of aluminum sheets by the Electrical and Mechanical Engineers (EME) Corps of the Indian Army. It incorporates features from major world religions into its architecture and is surrounded by lush military cantonment gardens.",
    locationDesc: "EME Military Camp, Fatehgunj, Vadodara",
    lat: 22.3275,
    lng: 73.1895,
    rating: 4.7,
    priceLevel: "Free Entry (ID Proof Required)",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Dakshinamoorthy%20%26%20Navgraha%20EME%20Temple.jpg?width=800",
    imageAlt: "EME Temple, Vadodara",
    amenities: ["Architectural Landmark", "Lush Gardens", "Peaceful Atmosphere", "Military Area", "Restrooms"],
    openingHours: "6:30 AM – 11:30 AM, 4:00 PM – 7:30 PM (Closed Sundays & Military Holidays)",
    dayInfo: {
      activity: "Medium",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Located inside Army Cantonment area. Visitors must carry valid photo identification for entry at military gate."
    },
    nightInfo: null,
    areaSafety: {
      daytime_activity: "High (Military zone)",
      nighttime_activity: "Low (Restricted access)",
      street_lighting: "Excellent",
      pedestrian_activity: "Low",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Auto-Rickshaw": { min: 60, median: 80, max: 110, unit: "from Alkapuri" }
    }
  },
  {
    id: "vad-iskcon",
    city: "vadodara",
    category: "Temples",
    name: "ISKCON Temple (Sri Sri Radha Shyamsundar)",
    highlights: "Peaceful spiritual retreat, Vedic culture, evening musical aarti and Govinda's prasadam",
    description: "Situated on Gotri Road, ISKCON Vadodara is a peaceful spiritual center dedicated to Lord Krishna. Features beautiful marble sanctums, morning/evening musical aartis, spiritual bookstalls, and pure vegetarian prasadam at Govinda's restaurant.",
    locationDesc: "Gotri Road, Harinagar, Vadodara",
    lat: 22.3168,
    lng: 73.1492,
    rating: 4.8,
    priceLevel: "Free Entry",
    imageUrl: "https://temple.yatradham.org/public/Product/temple/temple_pBAMKAcI_202504161212200.jpg",
    imageAlt: "ISKCON Temple, Vadodara",
    amenities: ["Govinda's Restaurant", "Aarti Sessions", "Spiritual Book Store", "Wheelchair Accessible", "Parking", "Restrooms"],
    openingHours: "4:30 AM – 1:00 PM, 4:30 PM – 8:30 PM",
    dayInfo: {
      activity: "High",
      pedestrian: "High",
      transport: "Good",
      notes: "Morning aarti begins at 4:30 AM. Govinda's restaurant serves lunch between 12:00 PM and 3:00 PM."
    },
    nightInfo: {
      activity: "High (Evening Aarti 7:00 PM)",
      street_lighting: "Good",
      pedestrian: "High",
      transport: "Good",
      notes: "Evening Sandhya Aarti at 7:00 PM attracts large crowds of devotees. Temple grounds well-lit until 8:30 PM."
    },
    areaSafety: {
      daytime_activity: "High",
      nighttime_activity: "High",
      street_lighting: "Good",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Auto-Rickshaw": { min: 80, median: 110, max: 140, unit: "from Station" }
    }
  },
  {
    id: "vad-pavagadh-temple",
    city: "vadodara",
    category: "Temples",
    name: "Pavagadh Hill & Kalika Mata Temple",
    highlights: "Sacred volcanic peak, historical ropeway, ancient Shakti Peeth on hilltop",
    description: "Sacred pilgrimage hill 48 km from Vadodara featuring the ancient Kalika Mata Temple at its summit, accessible via ropeway or steps.",
    locationDesc: "Pavagadh Hill (48 km from Vadodara)",
    lat: 22.4608,
    lng: 73.5306,
    rating: 4.7,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pavagadh%2C%20Kalika%20Mata%20Temple%20%289840241633%29.jpg?width=800",
    imageAlt: "Pavagadh Hill and Kalika Mata Temple, Gujarat",
    dayInfo: {
      activity: "Very High",
      pedestrian: "High",
      transport: "Good",
      notes: "Peak rush on weekends and festival days. Ropeway operates from 6:00 AM."
    },
    nightInfo: null,
    fairRates: {
      "Return Cab (Vadodara - Pavagadh)": { min: 1400, median: 1700, max: 2100, unit: "round trip" }
    }
  },

  // --- VADODARA: Cultural, Food & Day Trips ---
  {
    id: "vad-msu-fine-arts",
    city: "vadodara",
    category: "Cultural",
    name: "MS University Faculty of Fine Arts & Garba Grounds",
    highlights: "India's premier modern art academy & epicenters of world-famous Navratri Garba (United Way/Akota)",
    locationDesc: "Sayajigunj & Akota Stadium",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Faculty%20of%20fine%20arts%20maharaja%20sayajirao%20university%20of%20baroda.jpg?width=800",
    imageAlt: "Faculty of Fine Arts, Maharaja Sayajirao University of Baroda",
    lat: 22.3178,
    lng: 73.1860,
    fairRates: {
      "Auto-Rickshaw": { min: 60, median: 80, max: 100, unit: "standard fare" }
    }
  },
  {
    id: "vad-food-markets",
    city: "vadodara",
    category: "Food",
    name: "Raopura, Lehripura & Alkapuri Food Hubs",
    highlights: "Authentic Sev Usal (Shree Mahakali), Bhakarwadi (Pyarelal), Duliram Peda, Cafes",
    locationDesc: "Raopura / Alkapuri, Vadodara",
    lat: 22.3020,
    lng: 73.2010,
    fairRates: {
      "Authentic Sev Usal Plate": { min: 40, median: 60, max: 80, unit: "per plate" }
    }
  },
  {
    id: "vad-champaner-unesco",
    city: "vadodara",
    category: "Day Trips",
    name: "Champaner-Pavagadh UNESCO Archaeological Park",
    highlights: "UNESCO World Heritage Site with 16th-century Jama Masjid, citadel & stepwells",
    locationDesc: "Champaner, Gujarat (45 km from Vadodara)",
    lat: 22.4833,
    lng: 73.5333,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Champaner-Pavagadh%20-%20Gujarat%20-%20001.jpg?width=800",
    imageAlt: "Champaner-Pavagadh Archaeological Park, Gujarat",
    fairRates: {
      "Official ASI Licensed Heritage Guide": { min: 700, median: 900, max: 1200, unit: "half day" }
    }
  },
  {
    id: "vad-statue-of-unity",
    city: "vadodara",
    category: "Day Trips",
    name: "Statue of Unity & Kevadia Day Trip",
    highlights: "World's tallest statue (182m), Sardar Sarovar Dam, Valley of Flowers",
    description: "The Statue of Unity is a colossal statue of Indian statesman and independence activist Vallabhbhai Patel. At 182 meters, it is the world's tallest statue, located on the Narmada River in the Kevadiya colony.",
    locationDesc: "Ekta Nagar (Kevadia), 90 km from Vadodara",
    lat: 21.8380,
    lng: 73.7191,
    rating: 4.7,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Statue%20of%20Unity.jpg?width=800",
    imageAlt: "Statue of Unity, Gujarat",
    openingHours: "8:00 AM – 6:00 PM (Closed on Mondays)",
    dayInfo: {
      activity: "Very High",
      pedestrian: "High",
      transport: "Good",
      notes: "Extremely busy. Book tickets online in advance."
    },
    nightInfo: {
      activity: "Medium",
      street_lighting: "Excellent",
      pedestrian: "Medium",
      transport: "Good",
      notes: "Evening light and sound show is very popular. Transport back is available but better booked in advance."
    },
    areaSafety: {
      daytime_activity: "Very High",
      nighttime_activity: "Medium",
      street_lighting: "Excellent",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 0,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Private AC Sedan Taxi (Roundtrip)": { min: 2800, median: 3200, max: 3600, unit: "full day tour" }
    }
  },

  // --- AGRA & DELHI MONUMENTS ---
  {
    id: "agr-taj-mahal",
    city: "agra",
    category: "Heritage",
    name: "Taj Mahal (East & West Gates)",
    highlights: "UNESCO World Heritage wonder, iconic white marble mausoleum",
    description: "The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra. It was commissioned in 1631 by the fifth Mughal emperor, Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal.",
    locationDesc: "Dharmapuri, Forest Colony, Tajganj, Agra",
    lat: 27.1751,
    lng: 78.0421,
    rating: 4.8,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Taj%20Mahal.jpg?width=800",
    imageAlt: "Taj Mahal, Agra",
    openingHours: "Sunrise to Sunset (Closed on Fridays)",
    dayInfo: {
      activity: "Extremely High",
      pedestrian: "Very High",
      transport: "Good",
      notes: "Massive crowds during daytime. Security checks are thorough."
    },
    nightInfo: {
      activity: "Low",
      street_lighting: "Good",
      pedestrian: "Low",
      transport: "Limited",
      notes: "Night viewing is available on full moon nights only, otherwise closed."
    },
    areaSafety: {
      daytime_activity: "Extremely High",
      nighttime_activity: "Medium",
      street_lighting: "Good",
      pedestrian_activity: "High",
      transport_availability: "Good",
      emergency_access: "Available",
      reported_incidents: 2,
      last_updated: "20 Sep 2026",
      source: "Verida Area Safety Data"
    },
    fairRates: {
      "Official Guide": { min: 500, median: 750, max: 1000, unit: "up to 5 pax" },
      "Auto-Rickshaw (Agra Cantt to Taj)": { min: 140, median: 180, max: 220, unit: "pre-paid" }
    }
  },
  {
    id: "del-red-fort",
    city: "delhi",
    category: "Heritage",
    name: "Red Fort (Lal Qila - Lahori Gate)",
    highlights: "Historic fortified palace of Mughal emperors in Old Delhi",
    locationDesc: "Netaji Subhash Marg, Lal Qila, Chandni Chowk, New Delhi",
    lat: 28.6562,
    lng: 77.2410,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Red%20Fort-Delhi.jpg?width=800",
    imageAlt: "Red Fort, Delhi",
    fairRates: {
      "Official Guide": { min: 400, median: 600, max: 800, unit: "2 hr tour" },
      "Cycle Rickshaw": { min: 50, median: 80, max: 100, unit: "per trip" }
    }
  }
];

// --- SCAM & TOUT HOTSPOTS ---
export const SEED_HOTSPOTS = [
  {
    id: "hotspot-vad-station-alkapuri",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Vadodara Junction (Platform 6 / Alkapuri Side)",
    lat: 22.3106,
    lng: 73.1813,
    radius: 200,
    riskLevel: "high",
    scamType: "Auto-Rickshaw Overcharge & Hotel Redirection Touts",
    description: "Unmetered auto drivers quoting ₹250–₹400 for short trips to Sayajigunj or Laxmi Vilas Palace (real rate: ₹80–₹100). Also beware touts claiming your hotel is closed.",
    recentReportCount: 14,
    proactiveAdvice: "Demand meter or verify with Verida Live Route Pulse (fair rate ₹80–100). Do not accept hotel redirection."
  },
  {
    id: "hotspot-vad-laxmi-gate",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Laxmi Vilas Palace Outer Gate",
    lat: 22.2952,
    lng: 73.1930,
    radius: 180,
    riskLevel: "medium",
    scamType: "Unofficial 'Royal Escort' Fake Guides",
    description: "Touts claiming royal lineage offering unauthorized interior palace tours for ₹1,500+ when official audio guide is ₹150 at the ticket window.",
    recentReportCount: 8,
    proactiveAdvice: "Official audio guide is included with ticket. Only scan Verida Verified Guide QR for private tours."
  },
  {
    id: "hotspot-vad-mandvi-market",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Mandvi Gate Textile Bazaar & Lehripura",
    lat: 22.2996,
    lng: 73.2105,
    radius: 250,
    riskLevel: "medium",
    scamType: "Fake Chaniya Choli & Garba Pass Scalping",
    description: "Touts steering tourists into high-commission emporiums or offering counterfeit passes for United Way Garba.",
    recentReportCount: 11,
    proactiveAdvice: "Check Point-and-Check Price Camera before paying. Official garba passes are strictly digital."
  },
  {
    id: "hotspot-vad-champaner-ropeway",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Pavagadh Ropeway Base (Champaner)",
    lat: 22.4650,
    lng: 73.5280,
    radius: 300,
    riskLevel: "high",
    scamType: "Black Market VIP Ropeway Tokens",
    description: "Touts selling 'VIP jump queue' ropeway slips at ₹600 (official price ₹170 at ticket window).",
    recentReportCount: 19,
    proactiveAdvice: "Buy directly at Udan Khatola counter. Fake VIP slips are rejected at the turnstile."
  },
  {
    id: "hotspot-vad-sursagar-lake",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Sursagar Lake & Nyaya Mandir Parking",
    lat: 22.2987,
    lng: 73.2039,
    radius: 180,
    riskLevel: "medium",
    scamType: "Unofficial Parking Hustlers & Illegal Boat Touts",
    description: "Self-appointed touts demanding ₹100 cash for public street parking and offering unauthorized non-lifejacket boating.",
    recentReportCount: 9,
    proactiveAdvice: "Official boating ticket counter is at the municipal promenade. Use designated municipal parking."
  },
  {
    id: "hotspot-vad-sayaji-baug",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Sayaji Baug (Kamati Baug) Main Gate",
    lat: 22.3142,
    lng: 73.1873,
    radius: 160,
    riskLevel: "medium",
    scamType: "Toy Train & Planetarium Scalpers",
    description: "Touts reselling toy train tickets at 3x markup during weekend rush.",
    recentReportCount: 7,
    proactiveAdvice: "Buy directly at the central zoo/toy train counter inside the garden."
  },
  {
    id: "hotspot-vad-ajwa-transit",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Ajwa Lake Highway Transit Point",
    lat: 22.3562,
    lng: 73.3850,
    radius: 220,
    riskLevel: "medium",
    scamType: "Overcharging Return Transit Syndicate",
    description: "Drivers stranding tourists after evening musical fountain and demanding ₹1,200 for return auto.",
    recentReportCount: 12,
    proactiveAdvice: "Pre-agree on round-trip fare with Verida handshake before departing Vadodara city (fair roundtrip: ₹650)."
  },
  {
    id: "hotspot-vad-statue-of-unity-route",
    city: "vadodara",
    category: "Scam Hotspot",
    name: "Ekta Nagar (Statue of Unity) Approach Corridor",
    lat: 21.8380,
    lng: 73.7191,
    radius: 350,
    riskLevel: "high",
    scamType: "Fake VIP Viewing Gallery Touts",
    description: "Unauthorized operators claiming to sell on-the-spot Viewing Gallery tickets when online slots are sold out.",
    recentReportCount: 16,
    proactiveAdvice: "All viewing gallery tickets are strictly online at soutickets.in. Roadside touts sell invalid vouchers."
  },
  {
    id: "hotspot-agr-west-gate",
    city: "agra",
    category: "Scam Hotspot",
    name: "Taj Mahal West Gate Parking & Approaches",
    lat: 27.1738,
    lng: 78.0375,
    radius: 250,
    riskLevel: "high",
    scamType: "Fake Shoe-Cover Touts & Unlicensed Photo Hustlers",
    description: "Touts charging ₹200 for shoe covers and free government electric carts.",
    recentReportCount: 26,
    proactiveAdvice: "Shoe covers are ₹10 at official ticket window. Electric shuttles are free with ticket."
  }
];

// --- VERIFIED GUIDES DIRECTORY ---
export const SEED_GUIDES = [
  {
    id: "guide-vad-001",
    name: "Jignesh R. Patel",
    city: "vadodara",
    category: "Official Heritage Guide",
    licenseNo: "GUJ-TOU-2022-4418",
    issuer: "Gujarat Tourism & ASI Western Circle",
    experienceYears: 9,
    rating: 4.95,
    encounterCount: 342,
    languages: ["English", "Gujarati", "Hindi", "French"],
    specialty: "Laxmi Vilas Palace Architecture & Gaekwad Royal History",
    phone: "+91 98250 81234",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    verifiedSince: "2022-03-15",
    trustScore: 98,
    status: "active"
  }
];

// --- INITIAL PRICE PULSES ---
export const SEED_PRICE_PULSES = [
  {
    id: "pulse-vad-101",
    monumentId: "vad-laxmi-vilas",
    city: "vadodara",
    serviceType: "Auto-Rickshaw (Station to Palace)",
    serviceCategory: "Auto-Rickshaw",
    amount: 100,
    rangeTag: "₹80–120",
    guideId: "driver-vad-001",
    guideName: "Mehul Bhai (Auto #7892)",
    travelerName: "Marcus K. (Germany)",
    minutesAgo: 14,
    createdAt: Date.now() - 14 * 60 * 1000,
    locationLabel: "Vadodara Station to Laxmi Vilas Palace"
  },
  {
    id: "pulse-vad-102",
    monumentId: "vad-laxmi-vilas",
    city: "vadodara",
    serviceType: "Official Heritage Guide",
    serviceCategory: "Official Guide",
    amount: 450,
    rangeTag: "₹400–500",
    guideId: "guide-vad-001",
    guideName: "Jignesh R. Patel",
    travelerName: "Pooja & Rohan S. (Bangalore)",
    minutesAgo: 42,
    createdAt: Date.now() - 42 * 60 * 1000,
    locationLabel: "Laxmi Vilas Palace Royal Tour"
  }
];

export const SEED_HANDSHAKES = [
  {
    id: "hsk-vad-8891",
    guideId: "guide-vad-001",
    travelerId: "trv-demo-01",
    guideName: "Jignesh R. Patel",
    travelerName: "Sophie Martin (Tourist)",
    monumentId: "vad-laxmi-vilas",
    monumentName: "Laxmi Vilas Palace",
    city: "vadodara",
    lat: 22.2937,
    lng: 73.1916,
    distanceMeters: 4.2,
    timestamp: Date.now() - 1000 * 60 * 45,
    status: "verified",
    agreedPrice: 450,
    tokenHash: "0x98f4a1c79e821034bcfa894"
  }
];

export const SEED_REVIEWS = [
  {
    id: "rev-vad-01",
    handshakeId: "hsk-vad-8891",
    guideId: "guide-vad-001",
    travelerName: "Sophie Martin",
    rating: 5,
    monumentName: "Laxmi Vilas Palace, Vadodara",
    presenceVerified: true,
    timestamp: Date.now() - 1000 * 60 * 35,
    comment: "Verified handshake at the palace gate. Jignesh gave an unforgettable tour of the Gaekwad armoury and paintings. Zero overcharging!"
  }
];

// Sample test chits for the Point-and-Check Price Camera demo
export const SAMPLE_TEST_CHITS = [
  {
    id: "sample-chit-vad-overcharge",
    title: "🚨 SCAM / TOUT: Vadodara Station Auto Overcharge (₹450)",
    city: "vadodara",
    monumentId: "vad-laxmi-vilas",
    serviceName: "Auto-Rickshaw (Station to Laxmi Vilas Palace)",
    quotedPrice: 450,
    fairPrice: 100,
    sampleText: "AUTO TARIFF SLIP\nVadodara Rly Stn -> Laxmi Vilas\nFare: Rs 450 /-\nLuggage Extra Rs 100",
    verdict: "red",
    verdictTitle: "🚨 RED FLAG: Severe Overcharge (350% Above Fair Rate)",
    verdictAdvice: "Median fare on Verida Live Pulse is ₹80–120. Demand standard meter rate or counter with ₹100. If driver refuses, walk to the official Prepaid Booth on Platform 1."
  },
  {
    id: "sample-chit-vad-fair",
    title: "✅ FAIR: Laxmi Vilas Palace Official Guide (₹450)",
    city: "vadodara",
    monumentId: "vad-laxmi-vilas",
    serviceName: "Official Palace Heritage Guide",
    quotedPrice: 450,
    fairPrice: 450,
    sampleText: "GAEKWAD HERITAGE GUIDE SERVICE\nLaxmi Vilas Palace Tour (4 Pax)\nStandard Rate: INR 450\nASI/GujTour Verified",
    verdict: "green",
    verdictTitle: "✅ FAIR PRICE: Within Standard Benchmark (₹400–500)",
    verdictAdvice: "This matches the official benchmark. Proceed with Digital Handshake before paying cash."
  },
  {
    id: "sample-chit-agr-overcharge",
    title: "🚨 SCAM: Taj Mahal Unofficial Guide Quote (₹2,500)",
    city: "agra",
    monumentId: "agr-taj-mahal",
    serviceName: "Taj Mahal Private Guide",
    quotedPrice: 2500,
    fairPrice: 750,
    sampleText: "VIP TAJ TOURS AGRA\nExclusive Fast Track Entry + Guide\nSpecial Tourist Package: Rs 2500 /-\nNo Queue Guarantee",
    verdict: "red",
    verdictTitle: "🚨 RED FLAG: Scam Tout Quote (233% Above ASI Rate)",
    verdictAdvice: "ASI approved rate is ₹750 max. There is NO legal 'VIP skip-line ticket'. Counter with ₹750 or scan an ASI licensed guide badge."
  },
  {
    id: "sample-chit-del-rickshaw",
    title: "🟡 MODERATE: Red Fort Cycle Rickshaw (₹150)",
    city: "delhi",
    monumentId: "del-red-fort",
    serviceName: "Cycle Rickshaw (Chandni Chowk to Red Fort)",
    quotedPrice: 150,
    fairPrice: 80,
    sampleText: "OLD DELHI CYCLE RICKSHAW\nChandni Chowk - Lal Qila\nFare: Rs 150",
    verdict: "yellow",
    verdictTitle: "🟡 MODERATE PREMIUM: ~85% Above Average (Avg ₹80)",
    verdictAdvice: "Standard rate is ₹70–90. During peak rush, ₹100–120 is acceptable. Counter with: 'Verida rate is ₹80, I will pay ₹100 max'."
  }
];
