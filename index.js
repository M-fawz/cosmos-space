// =============================================================================
// COSMOS Space Dashboard — Main Application
// =============================================================================

const CONFIG = {
  NASA_KEY:     'DEMO_KEY',
  APOD_URL:     'https://api.nasa.gov/planetary/apod',
  LAUNCHES_URL: 'https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10',
  PLANETS_URL:  'https://solar-system-opendata-proxy.vercel.app/api/planets',
};

const PLANET_IMAGES = {
  mercury: './images/mercury.png',
  venus:   './images/venus.png',
  earth:   './images/earth.png',
  mars:    './images/mars.png',
  jupiter: './images/jupiter.png',
  saturn:  './images/saturn.png',
  uranus:  './images/uranus.png',
  neptune: './images/neptune.png',
};

const PLANET_ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

const PLANET_COLORS = {
  Mercury: '#eab308',
  Venus:   '#f97316',
  Earth:   '#3b82f6',
  Mars:    '#ef4444',
  Jupiter: '#fb923c',
  Saturn:  '#facc15',
  Uranus:  '#06b6d4',
  Neptune: '#2563eb',
};

// in-memory store populated after the planets API responds
let planetsData = [];

// =============================================================================
// UTILITIES
// =============================================================================

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(isoString) {
  if (!isoString) return 'TBD';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoString; }
}

function formatDateShort(isoString) {
  if (!isoString) return 'TBD';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return isoString; }
}

// Returns an HTML string: "5.97 × 10^24 kg" with a <sup> exponent
function formatMass(massObj) {
  if (!massObj) return 'N/A';
  return `${massObj.massValue} &times; 10<sup>${massObj.massExponent}</sup> kg`;
}

function formatNumber(n, unit = '') {
  if (n == null) return 'N/A';
  return `${Number(n).toLocaleString()}${unit ? ' ' + unit : ''}`;
}

function kmToAU(km) {
  return (km / 149597870.7).toFixed(2);
}

function getPlanetType(name) {
  if (['Mercury', 'Venus', 'Earth', 'Mars'].includes(name)) return 'Terrestrial';
  if (['Jupiter', 'Saturn'].includes(name))                  return 'Gas Giant';
  return 'Ice Giant';
}

function getPlanetImage(name) {
  return PLANET_IMAGES[name.toLowerCase()] || './images/earth.png';
}

function getPlanetDescription(name) {
  const d = {
    Mercury: 'Mercury is the smallest planet in the Solar System and the closest to the Sun. Its heavily cratered surface experiences extreme temperature swings — from −180 °C at night to 430 °C during the day — the widest range of any planet.',
    Venus:   'Venus is the second planet from the Sun and the hottest world in the Solar System, with surface temperatures reaching 465 °C. A runaway greenhouse effect driven by a dense CO₂ atmosphere traps more heat than even Mercury receives.',
    Earth:   'Earth is the third planet from the Sun and the only known world to harbour life. About 71 % of its surface is covered by liquid water, and a protective magnetic field combined with an oxygen-rich atmosphere sustain the biosphere.',
    Mars:    'Mars is the fourth planet, nicknamed the "Red Planet" for its iron-oxide surface. It hosts Olympus Mons — the tallest volcano in the Solar System — and ancient river valleys suggesting liquid water once flowed across its surface.',
    Jupiter: 'Jupiter is the largest planet in the Solar System, a gas giant whose iconic cloud bands and centuries-old Great Red Spot storm are iconic. It acts as a gravitational shield for the inner Solar System and has at least 95 known moons.',
    Saturn:  'Saturn is the sixth planet, famous for its spectacular ring system made of ice and rock. It is the least dense planet in the Solar System — less dense than water — and has 146 confirmed moons, including the atmosphere-rich Titan.',
    Uranus:  'Uranus is the seventh planet, an ice giant rotating nearly on its side with an axial tilt of 98°. Methane in its atmosphere absorbs red light, giving it a distinctive blue-green hue. It has 27 known moons and 13 rings.',
    Neptune: 'Neptune is the eighth and farthest known planet, an ice giant with the strongest winds in the Solar System — reaching 2 100 km/h. Its large storm system and retrograde-orbiting moon Triton make it one of the most dynamic worlds we know.',
  };
  return d[name] || `${name} is a fascinating body in our Solar System.`;
}

function getPlanetFacts(name) {
  const f = {
    Mercury: ['Smallest planet in the Solar System', 'No moons or rings', 'A year lasts just 88 Earth days', '600 °C temperature swing between night and day'],
    Venus:   ['Hottest planet despite not being closest to the Sun', 'Rotates backwards relative to most planets', 'A Venusian day is longer than its year', 'Atmospheric pressure is 90× that of Earth'],
    Earth:   ['Only known planet with liquid surface water', 'Atmosphere is 78 % nitrogen and 21 % oxygen', 'Magnetic field shields life from solar wind', 'Formed approximately 4.54 billion years ago'],
    Mars:    ['Home to Olympus Mons, the tallest volcano in the Solar System', 'Has two small moons: Phobos and Deimos', 'Evidence of ancient liquid-water channels', 'Global dust storms can engulf the entire planet'],
    Jupiter: ['Largest planet — over 1 300 Earths fit inside', 'Great Red Spot storm has raged for over 400 years', 'Has at least 95 confirmed moons', 'Moon Ganymede is larger than the planet Mercury'],
    Saturn:  ['Ring system spans 282 000 km but is only ~10 m thick', 'Less dense than liquid water', 'Has 146 confirmed moons', 'Moon Titan has a thick nitrogen atmosphere and methane lakes'],
    Uranus:  ['Tilted 98° — it rolls around the Sun on its side', 'Coldest planetary atmosphere in the Solar System: −224 °C', '27 moons named after Shakespeare characters', 'Has 13 known rings'],
    Neptune: ['Strongest winds of any planet: up to 2 100 km/h', 'Takes 165 Earth years to orbit the Sun once', 'Has 16 known moons', 'Moon Triton orbits in the reverse (retrograde) direction'],
  };
  return f[name] || ['A fascinating world in our Solar System'];
}

// Ratio relative to Earth's mass (5.972 × 10^24 kg)
const EARTH_MASS_KG = 5.972e24;

function getMassRatio(massObj) {
  if (!massObj) return 'N/A';
  const kg = massObj.massValue * Math.pow(10, massObj.massExponent);
  return (kg / EARTH_MASS_KG).toFixed(3);
}

function getPlanetTypeStyle(type) {
  switch (type) {
    case 'Terrestrial': return 'bg-orange-500/50 text-orange-200';
    case 'Gas Giant':   return 'bg-purple-500/50 text-purple-200';
    case 'Ice Giant':   return 'bg-cyan-500/50 text-cyan-200';
    default:            return 'bg-slate-500/50 text-slate-200';
  }
}

function formatOrbitalPeriod(days) {
  if (!days) return 'N/A';
  const d = Math.abs(days);
  return d >= 365 ? `${(d / 365.25).toFixed(1)} years` : `${d.toFixed(0)} days`;
}

function getStatusBadge(statusName) {
  if (!statusName) return { cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', label: 'Unknown' };
  const s = statusName.toLowerCase();
  if (s === 'go' || s.includes('go for'))
    return { cls: 'bg-green-500/20 text-green-400 border border-green-500/30', label: statusName };
  if (s.includes('success'))
    return { cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: statusName };
  if (s.includes('hold') || s.includes('tbd') || s.includes('tbc') || s.includes('to be'))
    return { cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', label: statusName };
  if (s.includes('fail') || s.includes('partial'))
    return { cls: 'bg-red-500/20 text-red-400 border border-red-500/30', label: statusName };
  return { cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30', label: statusName };
}

// =============================================================================
// NAVIGATION
// =============================================================================

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  const sections = document.querySelectorAll('.app-section[id]');

  function showSection(sectionId) {
    sections.forEach(sec =>
      sec.id === sectionId ? sec.classList.remove('hidden') : sec.classList.add('hidden')
    );
    navLinks.forEach(link => {
      if (link.dataset.section === sectionId) {
        link.classList.add('bg-blue-500/10', 'text-blue-400');
        link.classList.remove('text-slate-300');
      } else {
        link.classList.remove('bg-blue-500/10', 'text-blue-400');
        link.classList.add('text-slate-300');
      }
    });
    // Close mobile sidebar after navigating
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 1024) {
      sidebar.classList.remove('sidebar-open');
      document.getElementById('sidebar-overlay')?.remove();
    }
  }

  navLinks.forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); showSection(link.dataset.section); })
  );

  showSection('today-in-space');
}

function initSidebarToggle() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    if (sidebar.classList.contains('sidebar-open')) {
      sidebar.classList.remove('sidebar-open');
      document.getElementById('sidebar-overlay')?.remove();
    } else {
      sidebar.classList.add('sidebar-open');
      const overlay = document.createElement('div');
      overlay.id        = 'sidebar-overlay';
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-open');
        overlay.remove();
      });
      document.body.appendChild(overlay);
    }
  });
}

// =============================================================================
// SECTION 1 — NASA APOD
// =============================================================================

async function fetchAPOD(date = null) {
  const loadingEl = document.getElementById('apod-loading');
  const imgEl     = document.getElementById('apod-image');
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (imgEl)     imgEl.classList.add('hidden');

  const url = date
    ? `${CONFIG.APOD_URL}?api_key=${CONFIG.NASA_KEY}&date=${date}`
    : `${CONFIG.APOD_URL}?api_key=${CONFIG.NASA_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NASA API returned HTTP ${res.status}`);
    renderAPOD(await res.json());
  } catch (err) {
    console.error('APOD fetch failed:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    const container = document.getElementById('apod-image-container');
    if (container) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <i class="fas fa-exclamation-triangle text-4xl text-yellow-400 mb-4"></i>
          <p class="text-slate-300 font-semibold mb-2">Could not load today's image</p>
          <p class="text-slate-400 text-sm">${err.message}</p>
        </div>`;
    }
  }
}

function renderAPOD(data) {
  if (document.getElementById('apod-loading'))
    document.getElementById('apod-loading').classList.add('hidden');

  const container = document.getElementById('apod-image-container');
  const imgEl     = document.getElementById('apod-image');

  if (data.media_type === 'video') {
    if (imgEl) imgEl.classList.add('hidden');
    let iframe = container.querySelector('iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className       = 'w-full h-full rounded-2xl';
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    }
    iframe.src = data.url;
  } else {
    container.querySelector('iframe')?.remove();
    if (imgEl) {
      imgEl.src = data.hdurl || data.url;
      imgEl.alt = data.title;
      imgEl.classList.remove('hidden');
    }
  }

  setText('apod-title',       data.title || 'Astronomy Picture of the Day');
  setText('apod-explanation', data.explanation || '');
  setText('apod-date-detail', `\u{1F4C5} ${data.date}`);
  setText('apod-date-info',   data.date);
  setText('apod-media-type',  data.media_type === 'video' ? 'Video' : 'Image');

  const dateEl = document.getElementById('apod-date');
  if (dateEl) dateEl.textContent = `Astronomy Picture of the Day — ${data.date}`;

  const copyEl = document.getElementById('apod-copyright');
  if (copyEl) {
    copyEl.innerHTML = data.copyright
      ? `&copy; ${data.copyright.replace(/\n/g, ', ')}`
      : '&copy; NASA';
  }

  updateDatePickerDisplay(data.date);
  console.log(`APOD loaded: "${data.title}" (${data.date})`);
}

function updateDatePickerDisplay(dateStr) {
  const inputEl = document.getElementById('apod-date-input');
  if (!inputEl) return;
  inputEl.value = dateStr;

  // The .date-input-wrapper CSS ::after reads the data-date attribute for visible text
  const wrapper = inputEl.closest('.date-input-wrapper');
  if (wrapper && dateStr) {
    const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    wrapper.setAttribute('data-date', label);
    const span = wrapper.querySelector('span');
    if (span) span.textContent = label;
  }
}

function initAPODControls() {
  const dateInput = document.getElementById('apod-date-input');
  const loadBtn   = document.getElementById('load-date-btn');
  const todayBtn  = document.getElementById('today-apod-btn');

  if (dateInput) {
    dateInput.max = today();
    dateInput.min = '1995-06-16';
  }

  loadBtn?.addEventListener('click', () => {
    if (dateInput?.value) fetchAPOD(dateInput.value);
  });

  todayBtn?.addEventListener('click', () => fetchAPOD(null));

  dateInput?.addEventListener('change', () => {
    if (dateInput.value) fetchAPOD(dateInput.value);
  });
}

// =============================================================================
// SECTION 2 — LAUNCHES
// =============================================================================

async function fetchLaunches() {
  const featuredEl = document.getElementById('featured-launch');
  const gridEl     = document.getElementById('launches-grid');

  if (featuredEl) {
    featuredEl.innerHTML = `
      <div class="flex items-center justify-center h-64 bg-slate-800/30 border border-slate-700 rounded-3xl">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
          <p class="text-slate-400">Loading upcoming launches…</p>
        </div>
      </div>`;
  }
  if (gridEl) gridEl.innerHTML = '';

  try {
    const res = await fetch(CONFIG.LAUNCHES_URL);
    if (!res.ok) throw new Error(`SpaceDevs API returned HTTP ${res.status}`);
    const data     = await res.json();
    const launches = data.results || [];

    if (!launches.length) {
      if (featuredEl) featuredEl.innerHTML = '<p class="text-slate-400 py-8 text-center">No upcoming launches found.</p>';
      return;
    }

    renderFeaturedLaunch(launches[0]);
    renderLaunchGrid(launches.slice(1));

    setText('launches-count',        `${launches.length} Launches`);
    setText('launches-count-mobile', String(launches.length));

    console.log(`Launches loaded: ${launches.length} upcoming missions`);
  } catch (err) {
    console.error('Launches fetch failed:', err);
    const errHtml = `
      <div class="flex flex-col items-center justify-center h-48 p-8 text-center bg-slate-800/50 border border-slate-700 rounded-2xl">
        <i class="fas fa-exclamation-triangle text-4xl text-yellow-400 mb-4"></i>
        <p class="text-slate-300 font-semibold mb-2">Could not load launches</p>
        <p class="text-slate-400 text-sm">${err.message}</p>
      </div>`;
    if (featuredEl) featuredEl.innerHTML = errHtml;
    if (gridEl)     gridEl.innerHTML     = errHtml;
  }
}

function renderFeaturedLaunch(launch) {
  const featuredEl = document.getElementById('featured-launch');
  if (!featuredEl) return;

  const badge       = getStatusBadge(launch.status?.name);
  const imgUrl      = launch.image?.image_url || './images/earth.png';
  const missionName = launch.mission?.name || launch.name || 'Unknown Mission';
  const rocketName  = launch.rocket?.configuration?.name || 'Unknown Rocket';
  const provider    = launch.launch_service_provider?.name || 'Unknown Provider';
  const location    = launch.pad?.location?.name || 'Unknown Location';
  const description = launch.mission?.description || 'No mission description available.';

  let daysLabel = 'TBD';
  if (launch.net) {
    const diff = Math.ceil((new Date(launch.net) - Date.now()) / 86400000);
    daysLabel = diff > 0 ? String(diff) : diff === 0 ? 'Today' : 'Launched';
  }

  const launchTimeStr = launch.net
    ? new Date(launch.net).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : 'TBD';

  featuredEl.innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i> Featured Launch
              </span>
              <span class="px-4 py-1.5 ${badge.cls} rounded-full text-sm font-semibold">${badge.label}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${missionName}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${provider}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${rocketName}</span></div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${daysLabel}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i>Launch Date</p>
                <p class="font-semibold">${formatDateShort(launch.net)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i>Launch Time</p>
                <p class="font-semibold">${launchTimeStr}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i>Location</p>
                <p class="font-semibold text-sm">${location}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-rocket"></i>Rocket</p>
                <p class="font-semibold">${rocketName}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${description}</p>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            <img src="${imgUrl}" alt="${missionName}"
                 class="w-full h-full object-cover"
                 onerror="this.onerror=null;this.src='./images/earth.png';" />
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderLaunchGrid(launches) {
  const gridEl = document.getElementById('launches-grid');
  if (!gridEl) return;

  if (!launches.length) {
    gridEl.innerHTML = '<p class="text-slate-400 col-span-full text-center py-8">No additional launches found.</p>';
    return;
  }

  gridEl.innerHTML = launches.map(launch => {
    const badge       = getStatusBadge(launch.status?.name);
    const imgUrl      = launch.image?.image_url || './images/earth.png';
    const missionName = launch.mission?.name || launch.name || 'Unknown Mission';
    const rocketName  = launch.rocket?.configuration?.name || 'Unknown Rocket';
    const provider    = launch.launch_service_provider?.name || 'Unknown Provider';
    const location    = launch.pad?.location?.name || 'Unknown Location';

    return `
      <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
        <div class="relative h-48 bg-slate-900/50 overflow-hidden">
          <img src="${imgUrl}" alt="${missionName}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               onerror="this.onerror=null;this.src='./images/earth.png';" />
          <div class="absolute top-3 right-3">
            <span class="px-3 py-1 ${badge.cls} backdrop-blur-sm rounded-full text-xs font-semibold">${badge.label}</span>
          </div>
        </div>
        <div class="p-5">
          <div class="mb-3">
            <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${missionName}</h4>
            <p class="text-sm text-slate-400 flex items-center gap-2">
              <i class="fas fa-building text-xs"></i>${provider}
            </p>
          </div>
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-calendar text-slate-500 w-4"></i>
              <span class="text-slate-300">${formatDateShort(launch.net)}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-rocket text-slate-500 w-4"></i>
              <span class="text-slate-300">${rocketName}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
              <span class="text-slate-300 line-clamp-1">${location}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// =============================================================================
// SECTION 3 — PLANETS
// =============================================================================

async function fetchPlanets() {
  const gridEl  = document.getElementById('planets-grid');
  const tableEl = document.getElementById('planet-comparison-tbody');

  if (gridEl) {
    gridEl.innerHTML = `
      <div class="col-span-full flex items-center justify-center h-32">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3"></i>
          <p class="text-slate-400 text-sm">Loading planets…</p>
        </div>
      </div>`;
  }

  try {
    const res = await fetch(CONFIG.PLANETS_URL);
    if (!res.ok) throw new Error(`Solar System API returned HTTP ${res.status}`);
    const data = await res.json();

    // Keep only the 8 main planets (filter out moons and dwarf planets)
    const planets = data.filter(body =>
      PLANET_ORDER.includes(body.englishName) && !body.aroundPlanet
    );

    planets.sort((a, b) => (a.semimajorAxis || 0) - (b.semimajorAxis || 0));
    planetsData = planets;

    renderPlanetsGrid(planets);
    renderPlanetTable(planets);

    // Show Mercury detail by default
    const mercury = planets.find(p => p.englishName === 'Mercury') || planets[0];
    if (mercury) renderPlanetDetail(mercury);

    console.log(`Planets loaded: ${planets.length} bodies`);
  } catch (err) {
    console.error('Planets fetch failed:', err);
    const errHtml = `
      <div class="col-span-full flex flex-col items-center justify-center h-32 text-center">
        <i class="fas fa-exclamation-triangle text-3xl text-yellow-400 mb-3"></i>
        <p class="text-slate-300 font-semibold">Could not load planet data</p>
        <p class="text-slate-400 text-sm">${err.message}</p>
      </div>`;
    if (gridEl)  gridEl.innerHTML  = errHtml;
    if (tableEl) tableEl.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Failed to load planet data</td></tr>`;
  }
}

function renderPlanetsGrid(planets) {
  const gridEl = document.getElementById('planets-grid');
  if (!gridEl) return;

  const ordered = PLANET_ORDER
    .map(name => planets.find(p => p.englishName === name))
    .filter(Boolean);

  gridEl.innerHTML = ordered.map(planet => {
    const name    = planet.englishName;
    const color   = PLANET_COLORS[name] || '#888888';
    const au      = planet.semimajorAxis ? kmToAU(planet.semimajorAxis) : 'N/A';
    const imgPath = getPlanetImage(name);

    return `
      <div class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group"
           data-planet="${name}"
           style="--planet-color:${color}"
           onmouseover="this.style.borderColor='${color}80'"
           onmouseout="this.style.borderColor='#334155'">
        <div class="relative mb-3 h-24 flex items-center justify-center">
          <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform"
               src="${imgPath}" alt="${name}"
               onerror="this.onerror=null;this.src='./images/earth.png';" />
        </div>
        <h4 class="font-semibold text-center text-sm">${name}</h4>
        <p class="text-xs text-slate-400 text-center">${au} AU</p>
      </div>`;
  }).join('');

  // Click → update detail panel
  gridEl.querySelectorAll('.planet-card').forEach(card => {
    card.addEventListener('click', () => {
      const planet = planetsData.find(p => p.englishName === card.dataset.planet);
      if (!planet) return;
      renderPlanetDetail(planet);
      // Highlight active card
      gridEl.querySelectorAll('.planet-card').forEach(c => { c.style.borderColor = '#334155'; });
      card.style.borderColor = PLANET_COLORS[card.dataset.planet] || '#3b82f6';
    });
  });
}

function renderPlanetDetail(planet) {
  const name = planet.englishName;

  const imgEl = document.getElementById('planet-detail-image');
  if (imgEl) {
    imgEl.src = getPlanetImage(name);
    imgEl.alt = name;
    imgEl.onerror = () => { imgEl.src = './images/earth.png'; };
  }

  setText('planet-detail-name',        name);
  setText('planet-detail-description', getPlanetDescription(name));
  setText('planet-body-type',          planet.bodyType || 'Planet');
  setText('planet-discoverer',         planet.discoveredBy || 'Known since antiquity');
  setText('planet-discovery-date',     planet.discoveryDate || 'Ancient');

  setText('planet-distance', planet.semimajorAxis
    ? `${formatNumber(planet.semimajorAxis)} km (${kmToAU(planet.semimajorAxis)} AU)`
    : 'N/A');
  setText('planet-radius',  planet.meanRadius  ? `${formatNumber(planet.meanRadius)} km`  : 'N/A');
  setText('planet-density', planet.density     ? `${planet.density} g/cm³`           : 'N/A');
  setHTML('planet-mass',    planet.mass        ? formatMass(planet.mass)                   : 'N/A');

  setText('planet-orbital-period', planet.sideralOrbit
    ? `${Math.abs(planet.sideralOrbit).toLocaleString()} days`
    : 'N/A');
  setText('planet-rotation', planet.sideralRotation
    ? `${Math.abs(planet.sideralRotation).toFixed(2)} hours`
    : 'N/A');
  setText('planet-moons',   planet.moons ? String(planet.moons.length) : '0');
  setText('planet-gravity', planet.gravity ? `${planet.gravity} m/s²` : 'N/A');

  setHTML('planet-volume', planet.vol
    ? `${planet.vol.volValue} &times; 10<sup>${planet.vol.volExponent}</sup> km³`
    : 'N/A');

  setText('planet-perihelion',   planet.perihelion   ? `${formatNumber(planet.perihelion)} km`   : 'N/A');
  setText('planet-aphelion',     planet.aphelion     ? `${formatNumber(planet.aphelion)} km`     : 'N/A');
  setText('planet-eccentricity', planet.eccentricity != null ? planet.eccentricity.toFixed(4)   : 'N/A');
  setText('planet-inclination',  planet.inclination  != null ? `${planet.inclination.toFixed(2)}°`  : 'N/A');
  setText('planet-axial-tilt',   planet.axialTilt    != null ? `${planet.axialTilt.toFixed(2)}°`    : 'N/A');
  setText('planet-temp', planet.avgTemp != null
    ? `${planet.avgTemp} K (${(planet.avgTemp - 273.15).toFixed(0)} °C)`
    : 'N/A');
  setText('planet-escape', planet.escape ? `${(planet.escape / 1000).toFixed(1)} km/s` : 'N/A');

  const factsEl = document.getElementById('planet-facts');
  if (factsEl) {
    factsEl.innerHTML = getPlanetFacts(name).map(fact => `
      <li class="flex items-start">
        <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
        <span class="text-slate-300">${fact}</span>
      </li>`).join('');
  }

  console.log(`Planet detail: ${name}`);
}

function renderPlanetTable(planets) {
  const tbodyEl = document.getElementById('planet-comparison-tbody');
  if (!tbodyEl) return;

  const ordered = PLANET_ORDER
    .map(name => planets.find(p => p.englishName === name))
    .filter(Boolean);

  tbodyEl.innerHTML = ordered.map(planet => {
    const name    = planet.englishName;
    const color   = PLANET_COLORS[name] || '#888888';
    const au      = planet.semimajorAxis ? kmToAU(planet.semimajorAxis) : 'N/A';
    const diam    = planet.meanRadius ? formatNumber(planet.meanRadius * 2) : 'N/A';
    const massRel = planet.mass ? getMassRatio(planet.mass) : 'N/A';
    const period  = planet.sideralOrbit ? formatOrbitalPeriod(planet.sideralOrbit) : 'N/A';
    const moons   = planet.moons ? planet.moons.length : 0;
    const type    = getPlanetType(name);
    const rowBg   = name === 'Earth' ? 'bg-blue-500/5' : '';

    return `
      <tr class="hover:bg-slate-800/30 transition-colors ${rowBg}">
        <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color:${color}"></div>
            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${name}</span>
          </div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${au}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${diam}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${massRel}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${period}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap">${moons}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
          <span class="px-2 py-1 rounded text-xs ${getPlanetTypeStyle(type)}">${type}</span>
        </td>
      </tr>`;
  }).join('');
}

// =============================================================================
// DOM HELPERS
// =============================================================================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// =============================================================================
// BOOTSTRAP — fires after the DOM is ready
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('COSMOS Dashboard — initialising…');

  initNavigation();
  initSidebarToggle();
  initAPODControls();

  // Prime the date-picker with today's date
  updateDatePickerDisplay(today());

  // Load all three data sources in parallel; failures are isolated
  const [apodResult, launchesResult, planetsResult] = await Promise.allSettled([
    fetchAPOD(),
    fetchLaunches(),
    fetchPlanets(),
  ]);

  if (apodResult.status    === 'rejected') console.error('APOD failed:',    apodResult.reason);
  if (launchesResult.status === 'rejected') console.error('Launches failed:', launchesResult.reason);
  if (planetsResult.status  === 'rejected') console.error('Planets failed:',  planetsResult.reason);

  console.log('COSMOS Dashboard — ready.');
});
