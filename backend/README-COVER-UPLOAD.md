# Fitur Upload Sampul Buku — Mini Library

Paket ini memuat file frontend untuk memilih/melihat pratinjau sampul dan file backend untuk menerima file gambar, menyimpan sampul di `uploads/covers`, lalu menyimpan path-nya ke `books.cover_image`.

## Frontend

Salin isi folder `frontend/` ke `~/mini-library/frontend/` dengan mempertahankan path `src/App.jsx`, `src/api.js`, `src/styles.css`.

## Backend

Salin isi folder `backend/` ke `~/mini-library/backend/` dengan mempertahankan path. Jalankan dari folder backend:

```bash
npm install multer
mkdir -p uploads/covers
```

Pastikan `server.js` sudah melayani direktori cover seperti ini (server lo sebelumnya sudah punya baris static ini):

```js
app.use('/uploads/covers', express.static(path.resolve(root, process.env.UPLOAD_DIR || 'uploads/covers')));
```

Agar browser frontend `http://127.0.0.1:5173` bisa menampilkan gambar dari API `http://127.0.0.1:3001`, ubah konfigurasi Helmet dari `app.use(helmet());` menjadi:

```js
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
```

Ini diperlukan karena port frontend dan backend berbeda sehingga resource policy `same-origin` bawaan Helmet dapat memblokir gambar. Pertahankan konfigurasi CORS, auth, database, dan route lain yang sudah dimiliki project.

## Upload API

Endpoint tetap sama:
- `POST /api/v1/books` — multipart/form-data dengan field file `cover` dan metadata buku.
- `PATCH /api/v1/books/:id` — multipart/form-data; jika tidak mengirim field `cover`, sampul lama dipertahankan.
- `GET /api/v1/books` — respons menyertakan `cover_image`, misalnya `/uploads/covers/<nama-file>.jpg`.

Field file yang digunakan frontend bernama `cover`. Format yang diterima: JPG/JPEG, PNG, WebP; maksimum 5 MB. Endpoint create/update tetap melewati middleware autentikasi dan peran admin/staff.

## Menjalankan

Terminal backend: `npm run dev`
Terminal frontend: `npm run dev`

Cek gambar yang diupload dengan membuka URL `http://127.0.0.1:3001/uploads/covers/NAMA_FILE` (gunakan nama file dari kolom `cover_image`).
