const sheetURL = 'https://docs.google.com/spreadsheets/d/1vSQCXtdyqgRHVFkcjfTBhjHEIj9AMkA0Ii8-3xOqosI/export?format=csv&gid=0';

let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 30;

// Ambil data spreadsheet dan dukung kolom kategori opsional.
fetch(sheetURL)
    .then(res => {
        if (!res.ok) throw new Error('Spreadsheet tidak bisa diakses');
        return res.text();
    })
    .then(csvText => {
        const rows = parseCSV(csvText).filter(row => row.some(cell => cell.trim()));
        if (!rows.length) throw new Error('Spreadsheet kosong');

        const headers = rows.shift().map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
        const indexOf = (...names) => headers.findIndex(header => names.includes(header));
        const idIndex = indexOf('id');
        const namaIndex = indexOf('nama_produk', 'nama produk', 'nama');
        const hargaIndex = indexOf('harga');
        const gambarIndex = indexOf('gambar', 'image', 'image_url');
        const linkIndex = indexOf('link_affiliate', 'link affiliate', 'link');
        const kategoriIndex = indexOf('kategori', 'category');

        allData = rows.map(cols => {
            const nama = (cols[namaIndex] || '').trim();
            const kategoriSheet = kategoriIndex >= 0 ? (cols[kategoriIndex] || '').trim() : '';
            return {
                id: (cols[idIndex] || '').trim(),
                nama,
                harga: (cols[hargaIndex] || '').trim(),
                gambar: (cols[gambarIndex] || '').trim(),
                link: (cols[linkIndex] || '').trim(),
                kategori: kategoriSheet || inferKategori(nama)
            };
        }).filter(item => item.nama && item.link);

        populateKategori();
        applyFilters();
    })
    .catch(err => {
        console.error('Gagal ambil data:', err);
        document.getElementById('produk-list').innerHTML =
            '<p class="empty-state">Data produk gagal dimuat. Pastikan spreadsheet dipublikasikan ke web.</p>';
        renderPagination();
    });

// Parser CSV yang tetap aman untuk koma di dalam tanda kutip.
function parseCSV(text) {
    const rows = [];
    let row = [], value = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && quoted && text[i + 1] === '"') {
            value += '"';
            i++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }
    if (value.length || row.length) {
        row.push(value);
        rows.push(row);
    }
    return rows;
}

// Kategori otomatis berdasarkan kata kunci nama produk.
// Tambahkan kata kunci di sini sesuai jenis produk di spreadsheet kamu.
function inferKategori(nama = '') {
    const text = nama.toLowerCase();
    const rules = [
        ['Elektronik', ['charger', 'kabel data', 'earphone', 'headphone', 'headset', 'speaker', 'powerbank', 'power bank', 'mouse', 'keyboard', 'monitor', 'lampu led', 'kamera', 'elektronik', 'usb', 'ssd', 'flashdisk', 'adaptor', 'adapter']],
        ['HP & Aksesoris', ['iphone', 'samsung galaxy', 'redmi', 'xiaomi', 'case hp', 'casing hp', ' tempered glass', 'anti gores', 'holder hp', 'stand hp', 'smartphone', 'handphone']],
        ['Komputer & Gaming', ['laptop', 'pc gaming', 'gaming', 'gamepad', 'controller', 'joystick', 'webcam', 'keyboard mekanik']],
        ['Rumah Tangga', ['rak ', 'gantungan', 'organizer', 'wadah', 'kotak penyimpanan', 'sapu', 'pel ', 'ember', 'keset', 'sprei', 'bantal', 'selimut', 'tirai', 'gorden', 'peralatan dapur', 'alat dapur']],
        ['Fashion', ['baju', 'kaos', 'kemeja', 'celana', 'jaket', 'hoodie', 'sepatu', 'sandal', 'tas ', 'dompet', 'jam tangan', 'topi', 'fashion', 'dress', 'hijab']],
        ['Kecantikan & Perawatan', ['skincare', 'serum', 'sunscreen', 'lipstik', 'makeup', 'parfum', 'shampoo', 'sampo', 'sabun', 'body lotion', 'facial wash', 'masker wajah', 'kosmetik']],
        ['Makanan & Minuman', ['kopi', 'teh ', 'snack', 'camilan', 'makanan', 'minuman', 'cokelat', 'biskuit', 'susu']],
        ['Olahraga & Outdoor', ['olahraga', 'gym', 'fitness', 'yoga', 'dumbbell', 'barbel', 'tenda camping', 'outdoor', 'sepeda', 'helm']],
        ['Otomotif', ['motor', 'mobil', 'otomotif', 'dashcam', 'ban ', 'oli ', 'spion', 'aksesoris mobil', 'aksesoris motor']],
        ['Bayi & Anak', ['bayi', 'balita', 'anak-anak', 'mainan anak', 'stroller', 'popok', 'diaper']]
    ];
    for (const [kategori, keywords] of rules) {
        if (keywords.some(keyword => text.includes(keyword))) return kategori;
    }
    return 'Lainnya';
}

function populateKategori() {
    const select = document.getElementById('kategori');
    const currentValue = select.value;
    const categories = [...new Set(allData.map(item => item.kategori).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'id'));
    select.innerHTML = '<option value="">Semua kategori</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    if (categories.includes(currentValue)) select.value = currentValue;
}

function applyFilters() {
    const keyword = document.getElementById('search').value.trim().toLowerCase();
    const kategori = document.getElementById('kategori').value;

    filteredData = allData.filter(item => {
        const cocokKeyword = item.nama.toLowerCase().includes(keyword) ||
            item.id.toLowerCase().includes(keyword);
        const cocokKategori = !kategori || item.kategori === kategori;
        return cocokKeyword && cocokKategori;
    });

    currentPage = 1;
    render();
}

function render() {
    renderProduk();
    renderPagination();
}

function renderProduk() {
    const list = document.getElementById('produk-list');
    list.innerHTML = '';

    const sortOrder = document.getElementById('sortHarga').value;
    const sortedData = sortByHarga(filteredData, sortOrder);
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = sortedData.slice(start, start + itemsPerPage);

    if (!pageData.length) {
        list.innerHTML = '<p class="empty-state">Produk tidak ditemukan untuk filter ini.</p>';
        return;
    }

    pageData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'produk';

        // Gambar juga menjadi tautan menuju link affiliate produk.
        const imageLink = document.createElement('a');
        imageLink.className = 'produk-gambar-link';
        imageLink.href = item.link;
        imageLink.target = '_blank';
        imageLink.rel = 'nofollow noopener';
        imageLink.setAttribute('aria-label', `Lihat ${item.nama} di Shopee`);

        const img = document.createElement('img');
        img.src = item.gambar;
        img.loading = 'lazy';
        img.alt = item.nama;
        imageLink.appendChild(img);

        const title = document.createElement('h3');
        title.textContent = item.nama;

        const category = document.createElement('span');
        category.className = 'produk-kategori';
        category.textContent = item.kategori;

        const price = document.createElement('p');
        price.textContent = formatRupiah(item.harga);

        const link = document.createElement('a');
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'nofollow noopener';
        link.textContent = 'Beli di Shopee';

        card.append(imageLink, title, category, price, link);
        list.appendChild(card);
    });
}

document.getElementById('sortHarga').addEventListener('change', () => {
    currentPage = 1;
    render();
});
document.getElementById('kategori').addEventListener('change', applyFilters);
document.getElementById('search').addEventListener('input', applyFilters);

function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    document.getElementById('pageInfo').innerText =
        `Halaman ${currentPage} / ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        render();
    }
});
document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    if (currentPage < totalPages) {
        currentPage++;
        render();
    }
});

function formatRupiah(angka) {
    if (!angka) return '';
    const numeric = Number(String(angka).replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? 'Rp ' + numeric.toLocaleString('id-ID') : angka;
}

function sortByHarga(data, order) {
    if (!order) return [...data];
    return [...data].sort((a, b) => {
        const hargaA = Number(String(a.harga).replace(/[^\d.-]/g, '')) || 0;
        const hargaB = Number(String(b.harga).replace(/[^\d.-]/g, '')) || 0;
        return order === 'asc' ? hargaA - hargaB : hargaB - hargaA;
    });
}
