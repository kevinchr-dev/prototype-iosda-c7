// Dummy data foto untuk simulasi
const allPhotos = Array.from({ length: 30 }, (_, i) => ({
  id: `photo_${i + 1}`,
  url: `https://picsum.photos/300/400?random=${i + 1}`, // URL gambar placeholder
}));

// State untuk menyimpan ID foto yang dipilih
let selectedPhotoIds = new Set();
const SELECTION_TARGET = 20; // Target jumlah foto yang dipilih

// Ambil semua elemen DOM yang kita butuhkan
const gridContainer = document.getElementById('summary-grid');
const remainPill = document.getElementById('remain-pill');
const fab = document.getElementById('show-selection-btn');
const selectionCountBadge = document.getElementById('selection-count');
const modal = document.getElementById('selection-modal');
const modalTitle = document.getElementById('modal-title');
const modalGrid = document.getElementById('modal-grid');
const closeModalBtn = document.getElementById('close-modal-btn');

/**
 * Merender semua foto ke dalam grid utama
 */
function renderMainGrid() {
  gridContainer.innerHTML = ''; // Kosongkan grid
  allPhotos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'selectable-card';
    card.dataset.photoId = photo.id; // Tambahkan ID ke elemen untuk identifikasi

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = `Photo ${photo.id}`;

    card.appendChild(img);
    gridContainer.appendChild(card);
  });
  remainPill.textContent = `Remain Photos: ${allPhotos.length}`;
}

/**
 * Meng-update tampilan FAB dan badge hitungan
 */
function updateFab() {
  const count = selectedPhotoIds.size;
  selectionCountBadge.textContent = count;

  if (count > 0) {
    fab.classList.add('visible');
  } else {
    fab.classList.remove('visible');
  }
}

/**
 * Menangani klik pada sebuah foto di grid utama
 */
function handlePhotoClick(event) {
  const card = event.target.closest('.selectable-card');
  if (!card) return; // Jika yang diklik bukan foto, abaikan

  const photoId = card.dataset.photoId;
  card.classList.toggle('selected');

  // Tambahkan atau hapus ID dari Set
  if (selectedPhotoIds.has(photoId)) {
    selectedPhotoIds.delete(photoId);
  } else {
    selectedPhotoIds.add(photoId);
  }

  updateFab();
}

/**
 * Menampilkan modal dan mengisi dengan foto yang dipilih
 */
function showSelectionModal() {
  modalGrid.innerHTML = ''; // Kosongkan grid modal

  // Update judul modal
  modalTitle.textContent = `Selected Photos: ${selectedPhotoIds.size}/${SELECTION_TARGET}`;

  // Isi grid modal dengan gambar yang dipilih
  selectedPhotoIds.forEach(photoId => {
    const photo = allPhotos.find(p => p.id === photoId);
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.url;
      modalGrid.appendChild(img);
    }
  });

  modal.classList.add('visible');
}

/**
 * Menyembunyikan modal
 */
function hideSelectionModal() {
  modal.classList.remove('visible');
}


// --- Daftarkan Event Listeners ---

// Panggil render saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', renderMainGrid);

// Tambahkan listener ke grid container (event delegation)
gridContainer.addEventListener('click', handlePhotoClick);

// Listener untuk tombol FAB untuk membuka modal
fab.addEventListener('click', showSelectionModal);

// Listener untuk tombol close di dalam modal
closeModalBtn.addEventListener('click', hideSelectionModal);

// Listener untuk backdrop modal (klik di luar area modal akan menutupnya)
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    hideSelectionModal();
  }
});