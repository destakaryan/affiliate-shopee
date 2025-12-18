const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStK3XgnItgaxMcWhYeNqSUnMou7rzFpSfAjVkRXWLVxbGy6YTqncHHTs7UB2mQ8Rhdvk2iUX4gH4bN/pub?gid=0&single=true&output=csv';

let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 30;

// =====================
// AMBIL DATA SHEETS
// =====================
fetch(sheetURL)
    .then(res => res.text())
    .then(text => {
        const rows = text.trim().split('\n').slice(1);

        allData = rows.map(row => {
            const cols = row.split(',');

            return {
                id: cols[0]?.trim(),
                nama: cols[1]?.trim(),
                harga: cols[2]?.trim(),
                gambar: cols[3]?.trim(),
                link: cols[4]?.trim()
            };
        }).filter(item => item.nama && item.link); // buang baris kosong

        filteredData = allData;
        render();
    })
    .catch(err => {
        console.error('Gagal ambil data:', err);
    });

// =====================
// RENDER UTAMA
// =====================
function render() {
    renderProduk();
    renderPagination();
}

// =====================
// RENDER PRODUK (GRID)
// =====================
function renderProduk() {
    const list = document.getElementById('produk-list');
    list.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const sortedData = sortByHarga(
    filteredData,
    document.getElementById('sortHarga').value
);

const pageData = sortedData.slice(start, end);


    pageData.forEach(item => {
        list.innerHTML += `
            <div class="produk">
                <img src="${item.gambar}" loading="lazy" alt="${item.nama}">
                <h3>${item.nama}</h3>
                <p>${formatRupiah(item.harga)}</p>
                <a href="${item.link}" target="_blank" rel="nofollow noopener">
                    Beli di Shopee
                </a>
            </div>
        `;
    });
}
document.getElementById('sortHarga').addEventListener('change', function () {
    currentPage = 1;
    render();
});

// =====================
// PAGINATION PREV / NEXT
// =====================
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

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
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        render();
    }
});

// =====================
// FORMAT HARGA
// =====================
function formatRupiah(angka) {
    if (!angka) return '';
    return 'Rp ' + Number(angka).toLocaleString('id-ID');
}
function sortByHarga(data, order) {
    if (!order) return data;

    return [...data].sort((a, b) => {
        const hargaA = Number(a.harga) || 0;
        const hargaB = Number(b.harga) || 0;

        return order === 'asc'
            ? hargaA - hargaB
            : hargaB - hargaA;
    });
}

// =====================
// SEARCH
// =====================
document.getElementById('search').addEventListener('input', function () {
    const keyword = this.value.toLowerCase();

filteredData = allData.filter(item =>
    item.nama.toLowerCase().includes(keyword) ||
    item.id.includes(keyword)
);


    currentPage = 1;
    render();
});
