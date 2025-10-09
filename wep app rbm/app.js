(function () {
  const defaultLocations = [
    { name: 'Ruas Sudirman', lat: -6.2146, lng: 106.8451 },
    { name: 'Setiabudi', lat: -6.2087, lng: 106.8219 },
    { name: 'Kuningan', lat: -6.2276, lng: 106.8256 },
  ];

  const stored = JSON.parse(localStorage.getItem('rbm_locations') || 'null');
  const locations = Array.isArray(stored) && stored.length ? stored : defaultLocations;

  function saveLocations(list) {
    localStorage.setItem('rbm_locations', JSON.stringify(list));
  }

  function renderLocations() {
    const list = document.getElementById('locationsList');
    if (!list) return;
    list.innerHTML = '';
    locations.slice(0, 6).forEach((loc, index) => {
      const li = document.createElement('li');
      li.textContent = loc.name;
      li.title = `Lat ${loc.lat}, Lng ${loc.lng}`;
      list.appendChild(li);
    });
  }

  function requestGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Tambahkan lokasi pengguna ke awal daftar
        const userLoc = { name: 'Dekat Anda', lat: latitude, lng: longitude };
        locations.unshift(userLoc);
        saveLocations(locations);
        renderLocations();
      },
      () => {
        // abaikan jika ditolak
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function wireAddLocation() {
    const btn = document.getElementById('addLocationBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const name = prompt('Nama lokasi baru:');
      if (!name) return;
      locations.push({ name, lat: 0, lng: 0 });
      saveLocations(locations);
      renderLocations();
    });
  }

  function wireNotifications() {
    const btn = document.getElementById('notificationBtn');
    const dialog = document.getElementById('notificationDialog');
    const list = document.getElementById('notifList');
    if (!btn || !dialog || !list) return;
    const promos = [
      'Promo Payday: Diskon 25% semua menu',
      'Beli 2 gratis 1 untuk Chicken Bowl',
      'Gratis ongkir hingga Rp10.000',
    ];
    list.innerHTML = promos.map((p) => `<div class="card">${p}</div>`).join('');
    btn.addEventListener('click', () => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else alert(promos.join('\n'));
    });
  }

  function init() {
    renderLocations();
    wireAddLocation();
    wireNotifications();
    requestGeolocation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


