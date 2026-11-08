const API_KEY = "h8HWKPRC77pbnpd8cMtC9k76pKwrLkJcwq7FRtcQ";
const APOD_URL = "https://api.nasa.gov/planetary/apod";
const LAUNCHES_PROD = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/";
const LAUNCHES_DEV = "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/";
const LAUNCHES_LIMIT = 10;
const PLANETS_URL = "https://solar-system-opendata-proxy.vercel.app/api/planets";

const AU = 149597870.7;
const EARTH_MASS = 5.97237e24;
const PLANET_KEYS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];

const byId = (id) => document.getElementById(id);

const sidebar = byId("sidebar");
const sidebarToggle = byId("sidebar-toggle");
const navLinks = document.querySelectorAll(".nav-link");
const appSections = document.querySelectorAll(".app-section");

const dateInput = byId("apod-date-input");
const loadDateBtn = byId("load-date-btn");
const todayBtn = byId("today-apod-btn");

const launchesGrid = byId("launches-grid");
const featuredLaunch = byId("featured-launch");
const planetCards = document.querySelectorAll(".planet-card");

const activeClasses = ["bg-blue-500/10", "text-blue-400"];
const idleClasses = ["text-slate-300", "hover:bg-slate-800"];

const planetState = { all: {}, selected: "earth" };
let backdrop = null;

const planetInfo = {
  mercury: "Mercury is the smallest planet in the Solar System and the closest to the Sun. Its orbit around the Sun takes 87.97 Earth days, the shortest of all the planets in the Solar System.",
  venus: "Venus is the second planet from the Sun. It is named after the Roman goddess of love and beauty. As the second-brightest natural object in the night sky after the Moon, Venus can cast shadows.",
  earth: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of Earth's surface is land consisting of continents and islands. The remaining 71% is covered with water.",
  mars: "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. Named after the Roman god of war, it is often referred to as the \"Red Planet\" due to its reddish appearance.",
  jupiter: "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass one-thousandth that of the Sun, but two-and-a-half times that of all the other planets combined.",
  saturn: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System. It is a gas giant with an average radius about nine times that of Earth, and is best known for its extensive ring system.",
  uranus: "Uranus is the seventh planet from the Sun. It has the third-largest planetary radius and fourth-largest planetary mass in the Solar System. Uranus is unique in that it rotates on its side.",
  neptune: "Neptune is the eighth and farthest known planet from the Sun in the Solar System. It is the fourth-largest planet by diameter and the third-most-massive planet.",
};

const kindBadge = {
  Terrestrial: "bg-orange-500/50 text-orange-200",
  "Gas Giant": "bg-purple-500/50 text-purple-200",
  "Ice Giant": "bg-cyan-500/50 text-cyan-200",
};

const statusColors = {
  Go: "#22c55e",
  Success: "#22c55e",
  TBC: "#eab308",
  TBD: "#3b82f6",
  Hold: "#ef4444",
  Failure: "#ef4444",
};

const backupImages = [
  "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=85",
];

const superscripts = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateString(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function prettyDate(str, month = "long") {
  return fromDateString(str).toLocaleDateString("en-US", { year: "numeric", month, day: "numeric" });
}

function escapeHTML(value = "") {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (ch) => entities[ch]);
}

function setText(id, value) {
  const el = byId(id);
  if (el) el.textContent = value;
}

function num(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fixed(value, min, max) {
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
}

function power(exp) {
  return String(exp).split("").map((ch) => superscripts[ch]).join("");
}

async function getJSON(url, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      clearTimeout(timer);
    }
  }
}

function openSidebar() {
  sidebar.classList.add("sidebar-open");
  if (backdrop) return;
  backdrop = document.createElement("div");
  backdrop.className = "sidebar-overlay lg:hidden";
  backdrop.addEventListener("click", closeSidebar);
  document.body.appendChild(backdrop);
}

function closeSidebar() {
  sidebar.classList.remove("sidebar-open");
  if (!backdrop) return;
  backdrop.remove();
  backdrop = null;
}

function showSection(name) {
  appSections.forEach((section) => {
    section.classList.toggle("hidden", section.dataset.section !== name);
  });

  navLinks.forEach((link) => {
    const active = link.dataset.section === name;
    activeClasses.forEach((cls) => link.classList.toggle(cls, active));
    idleClasses.forEach((cls) => link.classList.toggle(cls, !active));
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initNavigation() {
  sidebarToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("sidebar-open")) closeSidebar();
    else openSidebar();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
      closeSidebar();
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeSidebar();
  });
}

function toggleApodLoader(loading) {
  byId("apod-loading").classList.toggle("hidden", !loading);
  byId("apod-image").classList.toggle("hidden", loading);
}

function updateDateField(dateStr) {
  dateInput.value = dateStr;
  dateInput.nextElementSibling.textContent = prettyDate(dateStr, "short");
}

function showApodMedia(data) {
  const box = byId("apod-image-container");
  const img = byId("apod-image");

  box.querySelectorAll(".apod-video").forEach((el) => el.remove());

  if (data.media_type === "video") {
    img.classList.add("hidden");
    const frame = document.createElement("iframe");
    frame.className = "apod-video w-full h-full";
    frame.src = data.url;
    frame.title = data.title;
    frame.allowFullscreen = true;
    frame.style.border = "0";
    box.prepend(frame);
    return;
  }

  img.src = data.url;
  img.alt = data.title;
  img.classList.remove("hidden");
}

function showApod(data) {
  showApodMedia(data);

  const credit = data.copyright
    ? `&copy; ${escapeHTML(data.copyright.replace(/\n/g, " ").trim())}`
    : "Public Domain";

  setText("apod-date", `Astronomy Picture of the Day - ${prettyDate(data.date)}`);
  setText("apod-title", data.title);
  byId("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${data.date}`;
  setText("apod-explanation", data.explanation);
  byId("apod-copyright").innerHTML = credit;
  setText("apod-date-info", data.date);
  setText("apod-media-type", data.media_type.charAt(0).toUpperCase() + data.media_type.slice(1));

  updateDateField(data.date);

  const fullResBtn = byId("apod-image-container").querySelector("button");
  if (fullResBtn) {
    fullResBtn.onclick = () => window.open(data.hdurl || data.url, "_blank", "noopener");
  }
}

function showApodError() {
  setText("apod-title", "Couldn't load the image");
  setText("apod-explanation", "NASA's servers didn't respond. Please try another date or try again in a moment.");
  setText("apod-copyright", "");
  setText("apod-date-info", "--");
}

async function loadApod(date) {
  toggleApodLoader(true);
  try {
    const query = date ? `&date=${date}` : "";
    const data = await getJSON(`${APOD_URL}?api_key=${API_KEY}${query}`);
    showApod(data);
  } catch (err) {
    console.error(err);
    showApodError();
  } finally {
    toggleApodLoader(false);
  }
}

function initApod() {
  const today = toDateString(new Date());
  dateInput.max = today;
  updateDateField(today);

  loadDateBtn.addEventListener("click", () => {
    if (dateInput.value) loadApod(dateInput.value);
  });

  todayBtn.addEventListener("click", () => {
    updateDateField(today);
    loadApod();
  });

  dateInput.addEventListener("change", () => {
    if (dateInput.value) updateDateField(dateInput.value);
  });
}

function launchImage(launch, index) {
  const raw = launch.image;
  const url = typeof raw === "string" ? raw : raw?.image_url || raw?.thumbnail_url;
  if (url && /^https?:\/\//i.test(url)) return url;
  return backupImages[index % backupImages.length];
}

function launchDetails(launch) {
  const net = new Date(launch.net);
  const valid = !Number.isNaN(net.getTime());
  const dateOpts = { month: "short", day: "numeric", year: "numeric" };

  return {
    shortDate: net.toLocaleDateString("en-US", dateOpts),
    longDate: net.toLocaleDateString("en-US", { ...dateOpts, month: "long" }),
    time: valid ? net.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "TBD",
    daysLeft: Math.ceil((net - new Date()) / 86400000),
    provider: launch.launch_service_provider?.name || "Unknown",
    rocket: launch.rocket?.configuration?.name || "Unknown",
    pad: launch.pad?.name || "Unknown pad",
    location: launch.pad?.location?.name || "Unknown location",
    country: launch.pad?.location?.country_code || "N/A",
    status: launch.status?.abbrev || "TBD",
  };
}

function featuredTemplate(launch) {
  const d = launchDetails(launch);
  const color = statusColors[d.status] || "#64748b";
  const image = launchImage(launch, 0);
  const mission = launch.mission?.description || "No mission description available yet.";

  const countdown = d.daysLeft > 0
    ? `<p class="text-2xl font-bold text-blue-400">${d.daysLeft}</p>
       <p class="text-xs text-slate-400">Days Until Launch</p>`
    : `<p class="text-2xl font-bold text-blue-400">Today</p>
       <p class="text-xs text-slate-400">Launch Window Open</p>`;

  return `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>
                Featured Launch
              </span>
              <span class="px-4 py-1.5 rounded-full text-sm font-semibold" style="background:${color}33;color:${color}">${escapeHTML(d.status)}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${escapeHTML(launch.name)}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2">
                <i class="fas fa-building"></i>
                <span>${escapeHTML(d.provider)}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-rocket"></i>
                <span>${escapeHTML(d.rocket)}</span>
              </div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>${countdown}</div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i>Launch Date</p>
                <p class="font-semibold">${d.longDate}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i>Launch Time</p>
                <p class="font-semibold">${d.time}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i>Location</p>
                <p class="font-semibold text-sm">${escapeHTML(d.location)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i>Country</p>
                <p class="font-semibold">${escapeHTML(d.country)}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${escapeHTML(mission)}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>
              View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="fas fa-bell"></i></button>
            </div>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            <img src="${escapeHTML(image)}" alt="${escapeHTML(launch.name)}" class="w-full h-full object-cover absolute inset-0" onerror="this.onerror=null;this.src='${backupImages[0]}'" />
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function launchCardTemplate(launch, index) {
  const d = launchDetails(launch);
  const color = statusColors[d.status] || "#64748b";
  const image = launchImage(launch, index + 1);
  const fallback = backupImages[(index + 2) % backupImages.length];

  return `
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(launch.name)}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'" />
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 text-white backdrop-blur-sm rounded-full text-xs font-semibold" style="background:${color}e6">${escapeHTML(d.status)}</span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${escapeHTML(launch.name)}</h4>
          <p class="text-sm text-slate-400 flex items-center gap-2">
            <i class="fas fa-building text-xs"></i>
            ${escapeHTML(d.provider)}
          </p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-calendar text-slate-500 w-4"></i>
            <span class="text-slate-300">${d.shortDate}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-clock text-slate-500 w-4"></i>
            <span class="text-slate-300">${d.time}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-rocket text-slate-500 w-4"></i>
            <span class="text-slate-300">${escapeHTML(d.rocket)}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
            <span class="text-slate-300 line-clamp-1">${escapeHTML(d.pad)}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
          <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
        </div>
      </div>
    </div>`;
}

function updateLaunchCount(count) {
  setText("launches-count", `${count} Launches`);
  setText("launches-count-mobile", String(count));
}

async function fetchLaunches() {
  const query = `?limit=${LAUNCHES_LIMIT}`;
  try {
    return await getJSON(LAUNCHES_PROD + query, 0);
  } catch (err) {
    return getJSON(LAUNCHES_DEV + query, 0);
  }
}

async function loadLaunches() {
  launchesGrid.innerHTML = `
    <div class="col-span-full text-center py-12">
      <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
      <p class="text-slate-400">Loading launches...</p>
    </div>`;
  featuredLaunch.innerHTML = "";

  try {
    const data = await fetchLaunches();
    const launches = data.results || [];
    if (!launches.length) throw new Error("No launches returned");

    updateLaunchCount(launches.length);
    featuredLaunch.innerHTML = featuredTemplate(launches[0]);
    launchesGrid.innerHTML = launches.slice(1).map(launchCardTemplate).join("");
  } catch (err) {
    console.error(err);
    launchesGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-triangle-exclamation text-4xl text-yellow-400 mb-4"></i>
        <p class="text-slate-300 mb-1">Couldn't load upcoming launches</p>
        <p class="text-slate-400 text-sm">The launch API is rate limited, please try again in a few minutes.</p>
      </div>`;
  }
}

function cardOf(id) {
  return document.querySelector(`.planet-card[data-planet-id="${id}"]`);
}

function colorOf(id) {
  const card = cardOf(id);
  return card?.style.getPropertyValue("--planet-color").trim() || "#64748b";
}

function formatMass(mass) {
  return mass ? `${num(mass.massValue, 3)} × 10${power(mass.massExponent)}` : null;
}

function inMillionKm(km) {
  return km ? `${num(km / 1e6, 1)}M km` : "N/A";
}

function formatOrbit(days) {
  if (!days) return "N/A";
  return days >= 730 ? `${num(days, 0)} days (${num(days / 365.25, 1)} yrs)` : `${num(days, 2)} days`;
}

function formatRotation(hours) {
  if (hours == null) return "N/A";
  return `${num(Math.abs(hours), 2)} hours${hours < 0 ? " (retrograde)" : ""}`;
}

function formatYear(days) {
  if (!days) return "N/A";
  return days >= 730 ? `${num(days / 365.25, 1)} years` : `${num(days, 1)} days`;
}

function formatEarthMass(mass) {
  if (!mass) return "N/A";
  const ratio = (mass.massValue * 10 ** mass.massExponent) / EARTH_MASS;
  return ratio < 10 ? fixed(ratio, 3, 3) : fixed(ratio, 1, 1);
}

function extractPlanets(data) {
  return (data.bodies || [])
    .filter((body) => body.isPlanet)
    .map((body) => ({ ...body, key: body.englishName.toLowerCase(), moons: body.moons || [] }))
    .filter((planet) => PLANET_KEYS.includes(planet.key))
    .sort((a, b) => a.semimajorAxis - b.semimajorAxis);
}

function clearPlanetPanel() {
  const ids = [
    "planet-distance", "planet-radius", "planet-mass", "planet-density",
    "planet-orbital-period", "planet-rotation", "planet-moons", "planet-gravity",
    "planet-discoverer", "planet-discovery-date", "planet-body-type", "planet-volume",
    "planet-perihelion", "planet-aphelion", "planet-eccentricity", "planet-inclination",
    "planet-axial-tilt", "planet-temp", "planet-escape",
  ];
  ids.forEach((id) => setText(id, "—"));
  byId("planet-facts").innerHTML = "";
}

function showPlanet(id, p) {
  const image = cardOf(id).querySelector("img");
  byId("planet-detail-image").src = image.src;
  byId("planet-detail-image").alt = `${id} planet`;

  setText("planet-detail-name", p.englishName || id);
  setText("planet-detail-description", planetInfo[id] || "");

  const massText = formatMass(p.mass) ? `${formatMass(p.mass)} kg` : "N/A";
  const kelvin = p.avgTemp || (id === "mercury" ? 440 : null);

  setText("planet-distance", inMillionKm(p.semimajorAxis));
  setText("planet-radius", `${num(p.meanRadius, 1)} km`);
  setText("planet-mass", massText);
  setText("planet-density", `${num(p.density, 2)} g/cm³`);
  setText("planet-orbital-period", formatOrbit(p.sideralOrbit));
  setText("planet-rotation", formatRotation(p.sideralRotation));
  setText("planet-moons", p.moons ? p.moons.length : 0);
  setText("planet-gravity", `${num(p.gravity, 2)} m/s²`);

  setText("planet-discoverer", p.discoveredBy || "Known since antiquity");
  setText("planet-discovery-date", p.discoveryDate || "Ancient");
  setText("planet-body-type", p.bodyType || "Planet");
  setText("planet-volume", p.vol ? `${num(p.vol.volValue, 3)} × 10${power(p.vol.volExponent)} km³` : "N/A");

  setText("planet-perihelion", inMillionKm(p.perihelion));
  setText("planet-aphelion", inMillionKm(p.aphelion));
  setText("planet-eccentricity", num(p.eccentricity, 4));
  setText("planet-inclination", `${num(p.inclination, 2)}°`);
  setText("planet-axial-tilt", `${num(p.axialTilt, 2)}°`);
  setText("planet-temp", kelvin ? `${num(kelvin - 273.15, 0)}°C` : "N/A");
  setText("planet-escape", `${num((p.escape || 0) / 1000, 1)} km/s`);

  const facts = [
    ["Mass", massText],
    ["Surface gravity", `${num(p.gravity, 2)} m/s²`],
    ["Density", `${num(p.density, 4)} g/cm³`],
    ["Axial tilt", `${num(p.axialTilt, 2)}°`],
  ];

  byId("planet-facts").innerHTML = facts
    .map(([label, value]) => `
      <li class="flex items-start">
        <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
        <span class="text-slate-300">${label}: ${escapeHTML(value)}</span>
      </li>`)
    .join("");
}

function markSelected(id) {
  planetCards.forEach((card) => {
    const selected = card.dataset.planetId === id;
    const color = colorOf(card.dataset.planetId);
    card.style.borderColor = selected ? color : "#334155";
    card.style.boxShadow = selected ? `0 0 0 1px ${color}66` : "none";
  });
}

function fillPlanetCards(planets) {
  planets.forEach((p) => {
    const label = cardOf(p.key)?.querySelector("p");
    if (label && p.semimajorAxis) label.textContent = `${fixed(p.semimajorAxis / AU, 2, 2)} AU`;
  });
}

function tableRow(p) {
  const kind = p.type || "Planet";
  const badge = kindBadge[kind] || "bg-slate-500/50 text-slate-200";
  const rowClass = p.key === "earth" ? " bg-blue-500/5" : "";
  const cell = "px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap";

  return `
    <tr class="hover:bg-slate-800/30 transition-colors${rowClass}">
      <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
        <div class="flex items-center space-x-2 md:space-x-3">
          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${colorOf(p.key)}"></div>
          <span class="font-semibold text-sm md:text-base whitespace-nowrap">${escapeHTML(p.englishName)}</span>
        </div>
      </td>
      <td class="${cell}">${p.semimajorAxis ? fixed(p.semimajorAxis / AU, 2, 2) : "N/A"}</td>
      <td class="${cell}">${p.meanRadius ? num(p.meanRadius * 2, 0) : "N/A"}</td>
      <td class="${cell}">${formatEarthMass(p.mass)}</td>
      <td class="${cell}">${formatYear(p.sideralOrbit)}</td>
      <td class="${cell}">${p.moons ? p.moons.length : 0}</td>
      <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
        <span class="px-2 py-1 rounded text-xs ${badge}">${kind}</span>
      </td>
    </tr>`;
}

function tableMessage(html) {
  byId("planet-comparison-tbody").innerHTML = `<tr><td colspan="7" class="px-6 py-10 text-center">${html}</td></tr>`;
}

async function loadPlanets() {
  tableMessage(`
    <i class="fas fa-spinner fa-spin text-2xl text-blue-400 mb-3"></i>
    <p class="text-slate-400">Loading planet data...</p>`);

  try {
    const planets = extractPlanets(await getJSON(PLANETS_URL));
    if (!planets.length) throw new Error("No planets returned");

    planets.forEach((p) => (planetState.all[p.key] = p));
    fillPlanetCards(planets);
    byId("planet-comparison-tbody").innerHTML = planets.map(tableRow).join("");

    const current = planetState.all[planetState.selected];
    if (current) showPlanet(planetState.selected, current);
  } catch (err) {
    console.error(err);
    tableMessage(`
      <i class="fas fa-triangle-exclamation text-2xl text-yellow-400 mb-3"></i>
      <p class="text-slate-300 mb-3">Couldn't load planet data right now.</p>
      <button id="planets-retry-btn" class="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
        <i class="fas fa-rotate-right mr-2"></i>Try again
      </button>`);
    byId("planets-retry-btn").addEventListener("click", loadPlanets);
  }
}

async function selectPlanet(id) {
  planetState.selected = id;
  markSelected(id);

  const card = cardOf(id);
  byId("planet-detail-image").src = card.querySelector("img").src;
  byId("planet-detail-image").alt = `${id} planet`;
  setText("planet-detail-name", card.querySelector("h4").textContent);
  setText("planet-detail-description", planetInfo[id] || "");

  if (planetState.all[id]) {
    showPlanet(id, planetState.all[id]);
    return;
  }

  clearPlanetPanel();
  try {
    const planet = extractPlanets(await getJSON(PLANETS_URL)).find((p) => p.key === id);
    if (!planet) throw new Error("Planet not found");
    planetState.all[id] = planet;
    if (planetState.selected === id) showPlanet(id, planet);
  } catch (err) {
    console.error(err);
    if (planetState.selected === id) {
      setText("planet-detail-description", "Couldn't load planet data right now. Click the planet again to retry.");
    }
  }
}

function initPlanets() {
  planetCards.forEach((card) => {
    const id = card.dataset.planetId;

    card.addEventListener("click", () => selectPlanet(id));
    card.onmouseover = () => {
      card.style.borderColor = `${colorOf(id)}80`;
    };
    card.onmouseout = () => {
      card.style.borderColor = id === planetState.selected ? colorOf(id) : "#334155";
    };
  });

  markSelected(planetState.selected);
  loadPlanets().then(() => {
    if (!planetState.all[planetState.selected]) selectPlanet(planetState.selected);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initApod();
  loadApod();
  loadLaunches();
  initPlanets();
  showSection("today-in-space");
});
