/**
 * Main Application JavaScript
 * Mengelola logika aplikasi input point dan klaim VCR
 */

// Konfigurasi
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwPwndN3GiJHxZgnZObz5RhURr3VhOsNgg-9e0x6FU5kE4mMwPvUZF5aiFpW9wbswvA/exec',
  STORAGE_KEYS: {
    USER: 'rbm_user',
    POINTS_HISTORY: 'rbm_points_history',
    VOUCHERS: 'rbm_vouchers'
  }
};

// Simple hardcoded credentials (for on-device auth only)
const AUTH = {
  USERS: [
    { username: 'kasir1', password: 'rbm123', nama: 'Kasir 1', phone: '0000000001', points: 0 },
    { username: 'kasir2', password: 'rbm123', nama: 'Kasir 2', phone: '0000000002', points: 0 }
  ],
  login(username, password) {
    const found = this.USERS.find(u => u.username === username && u.password === password);
    if (!found) return null;
    const sessionUser = { username: found.username, nama: found.nama, phone: found.phone, points: found.points };
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(sessionUser));
    return sessionUser;
  },
  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  }
};

// State management
class AppState {
  constructor() {
    this.user = this.loadUser();
    this.pointsHistory = this.loadPointsHistory();
    this.vouchers = this.loadVouchers();
  }
  loadUser() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }
  loadPointsHistory() {
    const history = localStorage.getItem(CONFIG.STORAGE_KEYS.POINTS_HISTORY);
    return history ? JSON.parse(history) : [];
  }
  loadVouchers() {
    const vouchers = localStorage.getItem(CONFIG.STORAGE_KEYS.VOUCHERS);
    return vouchers ? JSON.parse(vouchers) : [];
  }
  saveUser(user) {
    this.user = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  }
  savePointsHistory(history) {
    this.pointsHistory = history;
    localStorage.setItem(CONFIG.STORAGE_KEYS.POINTS_HISTORY, JSON.stringify(history));
  }
  saveVouchers(vouchers) {
    this.vouchers = vouchers;
    localStorage.setItem(CONFIG.STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
  }
  addPoints(amount, source = 'manual') {
    if (!this.user) return false;
    const pointsEntry = {
      id: Date.now(),
      amount: amount,
      source: source,
      timestamp: new Date().toISOString(),
      userId: this.user.phone
    };
    this.pointsHistory.unshift(pointsEntry);
    this.user.points = (this.user.points || 0) + amount;
    this.saveUser(this.user);
    this.savePointsHistory(this.pointsHistory);
    return true;
  }
  addVoucher(voucherData) {
    const voucher = {
      id: Date.now(),
      ...voucherData,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    this.vouchers.unshift(voucher);
    this.saveVouchers(this.vouchers);
    return voucher;
  }
}

// API Service
class APIService {
  static async findUserByPhone(phone) {
    try {
      const response = await fetch(`${CONFIG.SCRIPT_URL}?phone=${encodeURIComponent(phone)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }

  // ===== FUNGSI YANG DIPERBAIKI #1 =====
static async addPoints(phone, nominal, points, source, operator) { // Tambahkan 'operator'
  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'addPoints',
        phone: phone,
        nominal: nominal,
        points: points,
        source: source,     // 'source' sekarang dinamis
        operator: operator  // Kirim nama operator
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: 'Koneksi gagal' };
  }
}

  static async claimVoucher(phone, voucherCode) {
    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claimVoucher',
          phone: phone,
          voucherCode: voucherCode
        })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }
  
  static async getUserData(phone) {
    try {
      const response = await fetch(`${CONFIG.SCRIPT_URL}?phone=${phone}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }
}

// UI Helper
class UIHelper {
  static showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.createElement('div');
    messageEl.className = `status-${type} fade-in`;
    messageEl.textContent = message;
    const content = document.querySelector('.content');
    content.insertBefore(messageEl, content.firstChild);
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, duration);
  }
  static showModal(title, content, actions = []) {
    const modalHtml = `
      <div class="modal-overlay show" id="custom-modal">
        <div class="modal">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-content">${content}</div>
          <div class="modal-actions">
            ${actions.map(action => 
              `<button class="btn ${action.class || 'btn-primary'}" data-action="${action.action}">${action.text}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) { existingModal.remove(); }
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('custom-modal');
    const actionButtons = modal.querySelectorAll('[data-action]');
    return new Promise((resolve) => {
      actionButtons.forEach(button => {
        button.addEventListener('click', () => {
          modal.remove();
          resolve(button.dataset.action);
        });
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve('close');
        }
      });
    });
  }
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  static formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
  }
}

// Initialize app
let appState;

function generatePhoneVariants(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D+/g, '');
  if (!digits) return [];
  const variants = new Set();
  variants.add(String(rawPhone).trim());
  variants.add(digits);
  const with0 = digits.startsWith('0') ? digits : (digits.startsWith('62') ? '0' + digits.slice(2) : (digits.startsWith('8') ? '0' + digits : '0' + digits));
  variants.add(with0);
  const no0 = with0.startsWith('0') ? with0.slice(1) : with0;
  variants.add('62' + no0);
  variants.add('+62' + no0);
  return Array.from(variants);
}

document.addEventListener('DOMContentLoaded', () => {
  appState = new AppState();
  if (!appState.user) {
    const here = window.location.pathname.split('/').pop();
    if (here !== 'login.html') {
      window.location.href = 'login.html';
      return;
    }
    return;
  }
  const currentPage = window.location.pathname.split('/').pop();
  initializePage(currentPage);
});

function initializePage(page) {
  switch (page) {
    case 'input-point.html':
      initializeInputPoint();
      break;
    case 'claim-vcr.html':
      initializeClaimVCR();
      break;
    default:
      console.log('Unknown page:', page);
  }
}

function initializeInputPoint() {
  updatePointsDisplay();
  const lookupBtn = document.getElementById('btn-lookup-customer');
  const phoneInput = document.getElementById('customer-phone');
  const infoBox = document.getElementById('customer-info');
  const formCard = document.getElementById('nominal-form-card');
  const selName = document.getElementById('sel-cust-name');
  const selPhone = document.getElementById('sel-cust-phone');
  const selPoints = document.getElementById('sel-cust-points');
  const nominalInput = document.getElementById('input-nominal');
  const pointsInput = document.getElementById('input-points');
  const submitBtn = document.getElementById('btn-submit-points');

  if (lookupBtn && phoneInput) {
    const doLookup = async () => {
      const phone = (phoneInput.value || '').trim();
      if (!phone) {
        UIHelper.showMessage('Masukkan nomor telepon customer', 'error');
        return;
      }
      infoBox.style.display = 'block';
      infoBox.className = 'status-info';
      infoBox.textContent = 'Mencari customer...';
      const variants = generatePhoneVariants(phone);
      let found = null;
      for (const v of variants) {
        const res = await APIService.findUserByPhone(v);
        if (res && res.status === 'success' && res.data) {
          found = { result: res, usedPhone: v };
          break;
        }
      }
      if (found) {
        const user = found.result.data;
        infoBox.className = 'status-success';
        infoBox.textContent = `Ditemukan: ${user.nama} • Poin: ${UIHelper.formatNumber(user.points_sisa ?? user.points ?? 0)}`;
        selName.textContent = user.nama || '-';
        selPhone.textContent = user.phone || found.usedPhone;
        selPoints.textContent = UIHelper.formatNumber(user.points_sisa ?? user.points ?? 0);
        formCard.style.display = 'block';
        formCard.dataset.targetPhone = user.phone || found.usedPhone;
      } else {
        infoBox.className = 'status-error';
        infoBox.textContent = 'Customer tidak ditemukan';
        formCard.style.display = 'none';
        formCard.dataset.targetPhone = '';
      }
    };
    lookupBtn.addEventListener('click', doLookup);
    phoneInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doLookup(); });
  }

  if (nominalInput && pointsInput) {
    const recalc = () => {
      const nominal = parseInt(nominalInput.value || '0', 10) || 0;
      pointsInput.value = String(Math.floor(nominal / 100));
    };
    nominalInput.addEventListener('input', recalc);
  }

  // ===== BAGIAN YANG DIPERBAIKI #2 =====
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const targetPhone = formCard?.dataset?.targetPhone || '';
      if (!targetPhone) {
        UIHelper.showMessage('Cari customer terlebih dahulu', 'error');
        return;
      }
      const nominal = parseInt(nominalInput.value || '0', 10) || 0;
      const points = parseInt(pointsInput.value || '0', 10) || 0;
      if (nominal <= 0 || points <= 0) {
        UIHelper.showMessage('Nominal dan point harus lebih dari 0', 'error');
        return;
      }
      const confirm = await UIHelper.showModal(
        'Konfirmasi',
        `Tambah ${UIHelper.formatNumber(points)} point (dari nominal Rp ${UIHelper.formatNumber(nominal)}) untuk ${selName.textContent}?`,
        [
          { text: 'Batal', action: 'cancel', class: 'btn-secondary' },
          { text: 'Ya, Tambahkan', action: 'confirm', class: 'btn-primary' }
        ]
      );
      if (confirm !== 'confirm') return;

      UIHelper.showMessage('Memproses input point...', 'info');
      const loggedInUser = appState.user.username || 'unknown_kasir'; // Dapatkan nama kasir
       const result = await APIService.addPoints(targetPhone, nominal, points, `Nominal: ${nominal}`, loggedInUser);

      if (result.status === 'success') {
        const currentSelPts = parseInt(String(selPoints.textContent || '0').replace(/\D+/g, ''), 10) || 0;
        const newSelPts = currentSelPts + points;
        selPoints.textContent = UIHelper.formatNumber(newSelPts);
        UIHelper.showMessage('Berhasil menambahkan point', 'success');
        nominalInput.value = '';
        pointsInput.value = '';
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } else {
        UIHelper.showMessage(result.message || 'Gagal menambahkan point', 'error');
      }
    });
  }
}

// Fungsi lainnya tidak diubah...
function initializeClaimVCR() {
  updatePointsDisplay();
  const scanner = new QRScanner('qr-scanner', {
    onSuccess: handleVoucherCodeScanned,
    onError: (error) => { UIHelper.showMessage(`Error: ${error}`, 'error'); }
  });
  const manualInput = document.getElementById('manual-voucher-input');
  const manualSubmit = document.getElementById('manual-voucher-submit');
  if (manualSubmit) {
    manualSubmit.addEventListener('click', () => {
      const code = manualInput.value.trim();
      if (code) { handleVoucherCodeScanned(code); }
    });
  }
  const startScanBtn = document.getElementById('start-scan-btn');
  if (startScanBtn) { startScanBtn.addEventListener('click', () => { scanner.start(); }); }
  loadVouchersHistory();
}
async function handleVoucherCodeScanned(code) { /* ...Fungsi ini tidak diubah... */ }
function updatePointsDisplay() {
  const pointsElement = document.getElementById('user-points');
  if (pointsElement && appState.user) {
    pointsElement.textContent = UIHelper.formatNumber(appState.user.points || 0);
  }
}
function loadVouchersHistory() { /* ...Fungsi ini tidak diubah... */ }

// Export
window.AppState = AppState;
window.APIService = APIService;
window.UIHelper = UIHelper;
window.AUTH = AUTH;