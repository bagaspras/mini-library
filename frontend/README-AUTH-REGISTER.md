# Ruang Baca — Halaman Register Member

Perubahan ini menambahkan halaman/form registrasi yang mengikuti layout login existing (panel cerita di kiri, form dark enterprise di kanan, tipografi, tombol, dan field yang sama). Tombol **Daftar sebagai anggota** di halaman login beralih ke form register; link **Masuk** pada register kembali ke login.

## Fitur
- Nama lengkap, email, kata sandi, dan konfirmasi kata sandi.
- Validasi nama minimal 2 karakter, password minimal 12 karakter, batas 72 byte, dan konfirmasi harus sama.
- Submit ke `POST /api/v1/auth/register`.
- Pesan sukses setelah registrasi dan beralih kembali ke login dengan email terisi.
- Tetap menggunakan layout responsif yang sama dengan login, dengan CSS penyesuaian untuk layar kecil.

## Pasang (patch)
Backup dulu file yang ditimpa, dari root `~/mini-library/frontend`:

```bash
mkdir -p ../frontend-backup-register/src
cp -a src/App.jsx src/api.js src/styles.css ../frontend-backup-register/src/
unzip -o ~/Downloads/mini-library-register-page-patch.zip -d .
npm run dev
```

Patch ini mengganti `src/App.jsx`, `src/api.js`, dan `src/styles.css`; tidak mengganti `.env`, `package.json`, atau backend.

## API yang diperlukan
Backend harus sudah menyediakan `POST /api/v1/auth/register` dengan JSON `{ "name": "...", "email": "...", "password": "..." }` dan mengembalikan respons JSON sukses. Endpoint register harus selalu membuat role `member` di backend (jangan menerima role dari payload publik). Login tetap menggunakan `POST /api/v1/auth/login`.

Jika ada error, cek terminal backend untuk pesan asli. Registrasi sukses diikuti login manual, karena endpoint register tidak diasumsikan mengembalikan token sesi.
