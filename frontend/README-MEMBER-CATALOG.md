# Ruang Baca — Member Catalog

Update frontend menambahkan tampilan katalog khusus untuk akun yang memiliki `role = 'member'` (huruf besar/kecil tidak berpengaruh; alias `anggota`, `pembaca`, `patron`, dan `borrower` juga dikenali).

## Fitur member
- Login menggunakan endpoint autentikasi yang sama.
- Setelah login, anggota langsung masuk ke halaman **Katalog Buku**.
- Sidebar anggota hanya menampilkan menu Katalog dan tombol keluar; halaman admin/staf tidak dirender untuk role member.
- Katalog mengambil data dari `GET /api/v1/books` dan menampilkan sampul buku, judul, penulis, kategori, deskripsi singkat, penerbit, tahun terbit, stok tersedia, dan total stok.
- Pencarian mencari judul, penulis, penerbit, deskripsi, ISBN, tahun, dan kategori.
- Filter kategori, detail buku dalam modal, dan pratinjau sampul tersedia.
- Katalog menggunakan field yang sudah disediakan oleh books controller: `cover_image`, `publisher`, `publication_year`, `description`, `available_stock`, `total_stock`, dan `category_name`.

## Pasang di Kali Linux

Backup file yang akan ditimpa:

```bash
cd ~/mini-library/frontend
mkdir -p ../frontend-backup-member-catalog/src
cp -a src/App.jsx src/styles.css ../frontend-backup-member-catalog/src/
```

Ekstrak ZIP ke root frontend (folder yang memiliki `package.json`):

```bash
unzip -o ~/Downloads/mini-library-member-catalog.zip -d .
```

ZIP ini tidak menyertakan atau menimpa `.env` lokal. Pastikan konfigurasi frontend tetap mengarah ke API backend, misalnya:

```env
VITE_API_URL=http://127.0.0.1:3001/api/v1
```

Jalankan frontend:

```bash
npm install
npm run dev
```

## Prasyarat backend

- `POST /api/v1/auth/login` mengembalikan `token` dan `user` dengan field `role`.
- `GET /api/v1/books` mengizinkan token yang valid, termasuk role member.
- Respons daftar buku berbentuk `{ "data": [...] }` atau array langsung.
- File sampul yang diunggah harus disajikan oleh backend melalui URL `cover_image` (misalnya `/uploads/covers/nama-file.webp`).

UI role-based ini adalah pembatas tampilan di frontend, bukan pengganti otorisasi server. Pastikan semua operasi mutasi/admin tetap dilindungi middleware `authorize(...)` pada backend.
