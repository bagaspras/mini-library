import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookMarked, BookOpen,
  CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Command, LayoutDashboard,
  LogOut, Menu, Search, Settings2, ShieldCheck, Users, X, Tags, Plus, RotateCcw,
  MoreHorizontal, LibraryBig, Sparkles, AlertCircle, LoaderCircle, BookCopy,
  TrendingUp, UserRound, ChartNoAxesColumn, CheckCircle2, CircleAlert, ImagePlus, Upload, Trash2
} from 'lucide-react';
import { api, assetUrl, clearSession, getSavedUser, getToken, login, register as registerMember } from './api';

const seedBooks = [
  { id: 1, title: 'Atomic Habits', author: 'James Clear', category_name: 'Pengembangan Diri', available_stock: 4, total_stock: 6, status: 'Tersedia', isbn: '9780735211292' },
  { id: 2, title: 'Filosofi Teras', author: 'Henry Manampiring', category_name: 'Filsafat', available_stock: 2, total_stock: 5, status: 'Tersedia', isbn: '9786024125189' },
  { id: 3, title: 'Laut Bercerita', author: 'Leila S. Chudori', category_name: 'Fiksi', available_stock: 0, total_stock: 4, status: 'Dipinjam', isbn: '9786024246945' },
  { id: 4, title: 'Sebuah Seni untuk Bersikap Bodo Amat', author: 'Mark Manson', category_name: 'Pengembangan Diri', available_stock: 3, total_stock: 3, status: 'Tersedia', isbn: '9786024526986' },
];
const seedMembers = [
  { id: 1, name: 'Nadia Putri', member_code: 'MBR-001', email: 'nadia@example.com', status: 'active' },
  { id: 2, name: 'Raka Pratama', member_code: 'MBR-002', email: 'raka@example.com', status: 'active' },
  { id: 3, name: 'Siti Rahma', member_code: 'MBR-003', email: 'siti@example.com', status: 'active' },
];
const seedLoans = [
  { id: 1, member_name: 'Nadia Putri', book_title: 'Laut Bercerita', loan_date: '2026-10-18', due_date: '2026-10-25', status: 'borrowed' },
  { id: 2, member_name: 'Raka Pratama', book_title: 'Atomic Habits', loan_date: '2026-10-16', due_date: '2026-10-23', status: 'borrowed' },
  { id: 3, member_name: 'Siti Rahma', book_title: 'Filosofi Teras', loan_date: '2026-10-10', due_date: '2026-10-17', status: 'returned' },
];
const seedCategories = [
  { id: 1, name: 'Fiksi', description: 'Novel, cerpen, dan karya naratif' },
  { id: 2, name: 'Pengembangan Diri', description: 'Kebiasaan, karier, dan refleksi' },
  { id: 3, name: 'Filsafat', description: 'Pemikiran dan cara memandang dunia' },
];
const navItems = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'books', label: 'Koleksi buku', icon: BookOpen },
  { id: 'categories', label: 'Kategori', icon: Tags },
  { id: 'members', label: 'Anggota', icon: Users },
  { id: 'loans', label: 'Peminjaman', icon: RotateCcw },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'items', 'books', 'categories', 'members', 'loans', 'results']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}
function dateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
function isOverdue(loan) {
  if ((loan?.status || '').toLowerCase() !== 'borrowed' || !loan?.due_date) return false;
  const due = new Date(`${String(loan.due_date).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(due.getTime()) && due < today;
}
function loanBooksLabel(loan) {
  if (loan?.book_title) return loan.book_title;
  if (Array.isArray(loan?.items) && loan.items.length) {
    return loan.items.map(item => {
      const title = item.title || item.book_title || `Buku #${item.book_id}`;
      return Number(item.quantity) > 1 ? `${title} × ${item.quantity}` : title;
    }).join(', ');
  }
  return `Peminjaman #${loan?.id ?? '—'}`;
}
function initials(name = 'Admin') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function isMemberRole(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  return ['member', 'anggota', 'pembaca', 'patron', 'borrower'].includes(role);
}
function roleLabel(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['member', 'anggota', 'pembaca', 'patron', 'borrower'].includes(value)) return 'Anggota';
  if (value === 'staff' || value === 'librarian') return 'Staf perpustakaan';
  if (value === 'admin' || value === 'administrator') return 'Administrator';
  return role || 'Pengguna';
}
function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}><i />{children}</span>;
}
function EmptyState({ title, body }) {
  return <div className="empty-state"><div className="empty-icon"><BookCopy size={20}/></div><strong>{title}</strong><span>{body}</span></div>;
}
function Toast({ message, kind = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3600); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${kind}`}><span className="toast-icon">{kind === 'success' ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}</span><span>{message}</span><button onClick={onClose} aria-label="Tutup"><X size={16}/></button></div>;
}

function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        if (cleanName.length < 2) throw new Error('Nama lengkap minimal 2 karakter.');
        if (password.length < 12) throw new Error('Password minimal 12 karakter.');
        if (new TextEncoder().encode(password).length > 72) throw new Error('Password terlalu panjang. Maksimal 72 byte.');
        if (password !== confirmPassword) throw new Error('Konfirmasi password belum cocok.');

        const result = await onRegister(cleanName, cleanEmail, password);
        setEmail(cleanEmail);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccess(result?.message || 'Registrasi berhasil. Silakan masuk dengan akun baru.');
      } else {
        await onLogin(email.trim(), password);
      }
    } catch (e) {
      setError(e.message || (mode === 'register' ? 'Registrasi belum berhasil. Coba lagi.' : 'Tidak bisa masuk. Coba periksa koneksi dan kredensial.'));
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === 'register';

  return <main className={`login-shell ${registering ? 'auth-register-mode' : ''}`}>
    <section className="login-story">
      <div className="brand brand-light"><span className="brand-mark"><LibraryBig size={21}/></span><span>ruang<span className="brand-serif">baca</span></span></div>
      <div className="story-copy">
        <span className="eyebrow eyebrow-light"><span className="eyebrow-dot"/> RUANG UNTUK BERTUMBUH</span>
        <h1>Setiap buku<br/>membuka <em>kemungkinan.</em></h1>
        <p>Tempat kecil untuk merawat rasa ingin tahu. Temukan bacaan baru atau rawat koleksi sesuai peranmu di ruang baca.</p>
      </div>
      <div className="story-bottom">
        <div className="book-stack" aria-hidden="true">
          <div className="stack-book stack-one"><span>the creative act</span><small>RICK RUBIN</small></div>
          <div className="stack-book stack-two"><span>berjalan jauh</span><small>ANTONIUS W.</small></div>
          <div className="stack-book stack-three"><span>the art of noticing</span><small>ROB WALKER</small></div>
        </div>
        <div className="quote"><span>“</span><p>Reading is a way of travelling<br/>without moving your feet.</p><small>CATATAN DI RUANG BACA</small></div>
      </div>
      <div className="story-grain"/>
    </section>
    <section className="login-panel">
      <div className="login-mobile-brand brand"><span className="brand-mark"><LibraryBig size={21}/></span><span>ruang<span className="brand-serif">baca</span></span></div>
      <div className={`login-card ${registering ? 'auth-register-card' : ''}`}>
        <div className="login-heading">
          <span className="eyebrow">{registering ? 'MULAI DARI SATU HALAMAN' : 'SELAMAT DATANG KEMBALI'}</span>
          <h2>{registering ? 'Buat akun ruang baca.' : 'Masuk ke ruangmu.'}</h2>
          <p>{registering ? 'Daftar sebagai anggota untuk menjelajahi koleksi, membaca deskripsi buku, dan melihat ketersediaan.' : 'Masuk dengan akun perpustakaan untuk menjelajahi katalog atau mengelola koleksi sesuai aksesmu.'}</p>
        </div>
        <form onSubmit={submit} className="login-form">
          {registering && <>
            <label htmlFor="register-name">Nama lengkap</label>
            <div className="field-wrap"><UserRound size={17}/><input id="register-name" type="text" autoComplete="name" placeholder="Nama sesuai identitas" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required/></div>
          </>}
          <label htmlFor={registering ? 'register-email' : 'email'}>Alamat email</label>
          <div className="field-wrap"><UserRound size={17}/><input id={registering ? 'register-email' : 'email'} type="email" autoComplete="email" placeholder="email@perpustakaan.id" value={email} onChange={e => setEmail(e.target.value)} required/></div>
          <div className="label-row"><label htmlFor={registering ? 'register-password' : 'password'}>Kata sandi</label><span className="muted-small">{registering ? 'Minimal 12 karakter' : 'Akun anggota / staf'}</span></div>
          <div className="field-wrap"><ShieldCheck size={17}/><input id={registering ? 'register-password' : 'password'} type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Buat kata sandi yang kuat' : 'Masukkan kata sandi'} value={password} onChange={e => setPassword(e.target.value)} minLength={registering ? 12 : undefined} required/><button type="button" className="show-password" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Sembunyikan' : 'Lihat'}</button></div>
          {registering && <>
            <div className="label-row"><label htmlFor="register-confirm-password">Konfirmasi kata sandi</label></div>
            <div className="field-wrap"><ShieldCheck size={17}/><input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Ulangi kata sandi" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={12} required/><button type="button" className="show-password" onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? 'Sembunyikan' : 'Lihat'}</button></div>
          </>}
          {success && <div className="form-success"><CheckCircle2 size={16}/><span>{success}</span></div>}
          {error && <div className="form-error"><AlertCircle size={16}/><span>{error}</span></div>}
          <button className="button button-dark login-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17}/>{registering ? 'Membuat akun...' : 'Memeriksa akun...'}</> : registering ? <>Buat akun anggota <ArrowRight size={17}/></> : <>Masuk ke ruang baca <ArrowRight size={17}/></>}</button>
        </form>
        <div className="auth-switch">
          {registering ? <><span>Sudah punya akun?</span> <button type="button" onClick={() => switchMode('login')}>Masuk</button></> : <><span>Belum punya akun?</span> <button type="button" onClick={() => switchMode('register')}>Daftar sebagai anggota</button></>}
        </div>
        <div className="login-note"><ShieldCheck size={16}/><span>{registering ? 'Pendaftaran membuat akun dengan akses anggota perpustakaan.' : 'Akses dibatasi untuk akun yang terdaftar.'}</span></div>
      </div>
      <footer className="login-footer"><span>© 2026 Ruang Baca</span><span><CircleHelp size={14}/> Butuh bantuan? Hubungi pengelola.</span></footer>
    </section>
  </main>;
}

function Sidebar({ page, setPage, onLogout, user, mobileOpen, closeMobile, loans = [] }) {
  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Tutup menu" onClick={closeMobile}/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><LibraryBig size={21}/></span><span>ruang<span className="brand-serif">baca</span></span></div>
      <div className="workspace"><div className="workspace-icon"><BookMarked size={18}/></div><div><strong>Perpustakaan</strong><small>{isMemberRole(user) ? 'Ruang jelajah bacaan' : 'Workspace utama'}</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">{isMemberRole(user) ? 'JELAJAHI' : 'MENU UTAMA'}</div>
      <nav className="side-nav">
        {(isMemberRole(user) ? [{ id: 'catalog', label: 'Katalog buku', icon: BookOpen }] : navItems).map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'nav-active' : ''}`} onClick={() => {setPage(item.id); closeMobile();}}><item.icon size={18}/><span>{item.label}</span>{!isMemberRole(user) && item.id === 'loans' && loans.filter(loan => (loan.status || '').toLowerCase() === 'borrowed').length > 0 && <span className="nav-count">{loans.filter(loan => (loan.status || '').toLowerCase() === 'borrowed').length}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        {!isMemberRole(user) && <>
          <div className="help-card"><div className="help-icon"><Sparkles size={16}/></div><strong>Ruang yang teratur</strong><p>Koleksi rapi, pengalaman membaca lebih baik.</p><button onClick={() => setPage('books')}>Lihat koleksi <ArrowRight size={14}/></button></div>
          <button className={`nav-item quiet-nav ${page === 'settings' ? 'nav-active' : ''}`} onClick={() => setPage('settings')}><Settings2 size={18}/><span>Pengaturan</span></button>
        </>}
        <div className="sidebar-profile"><div className="avatar avatar-ink">{initials(user?.name || user?.email)}</div><div className="profile-info"><strong>{user?.name || (isMemberRole(user) ? 'Anggota Perpustakaan' : 'Admin Perpustakaan')}</strong><small>{roleLabel(user?.role)}</small></div><button className="icon-button" title="Keluar" onClick={onLogout}><LogOut size={17}/></button></div>
      </div>
    </aside>
  </>;
}

function Topbar({ title, subtitle, onMenu, user, search, setSearch }) {
  return <header className="topbar">
    <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Buka menu"><Menu size={20}/></button>
    <div className="topbar-heading"><h1>{title}</h1><p>{subtitle}</p></div>
    <div className="topbar-actions">
      <label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={isMemberRole(user) ? "Cari judul, penulis, penerbit..." : "Cari apa saja..."}/><kbd>⌘ K</kbd></label>
      {!isMemberRole(user) && <button className="icon-button notification-button" aria-label="Notifikasi"><Bell size={18}/><i/></button>}
      <div className="topbar-divider"/>
      <div className="topbar-user"><div className="avatar avatar-terracotta">{initials(user?.name || user?.email)}</div><div><strong>{user?.name || 'Pengguna'}</strong><small>{roleLabel(user?.role)}</small></div></div>
    </div>
  </header>;
}

function StatCard({ label, value, note, icon: Icon, tone = 'sage', trend, down = false }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon stat-${tone}`}><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className="stat-foot"><span className={`trend ${down ? 'trend-down' : ''}`}>{trend && (down ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>)}{trend}</span><span>{note}</span></div></article>;
}

function BookCover({ book, className = 'book-cover-thumb', iconSize = 20 }) {
  const src = assetUrl(book?.cover_image);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <div className={`book-cover-thumb ${className}`}>
    {src && !failed
      ? <img src={src} alt={`Sampul ${book?.title || 'buku'}`} loading="lazy" onError={() => setFailed(true)} />
      : <span className="book-cover-placeholder"><BookOpen size={iconSize} /></span>}
  </div>;
}

function MemberCatalog({ books, query, loading, onRefresh, setSearch }) {
  const [category, setCategory] = useState('all');
  const [selectedBook, setSelectedBook] = useState(null);
  const categories = useMemo(() => [...new Set(books.map(book => book.category_name || (book.category_id ? `Kategori ${book.category_id}` : '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')), [books]);
  const filteredBooks = useMemo(() => books.filter(book => {
    const haystack = [book.title, book.author, book.publisher, book.description, book.isbn, book.publication_year, book.category_name].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const bookCategory = book.category_name || (book.category_id ? `Kategori ${book.category_id}` : '');
    return matchesQuery && (category === 'all' || bookCategory === category);
  }), [books, query, category]);
  const availableCopies = books.reduce((sum, book) => sum + Math.max(0, Number(book.available_stock) || 0), 0);

  return <div className="page-content member-catalog-page">
    <section className="member-catalog-hero">
      <div className="member-catalog-hero-copy">
        <span className="eyebrow"><span className="catalog-live-dot"/> KATALOG ANGGOTA / RUANG BACA</span>
        <h2>Temukan cerita<br/>yang <em>menemukanmu.</em></h2>
        <p>Jelajahi koleksi, baca sinopsis, dan cek ketersediaan sebelum mampir ke meja perpustakaan.</p>
      </div>
      <div className="catalog-hero-index"><span>KOLEKSI SAAT INI</span><strong>{String(books.length).padStart(2, '0')}</strong><small>judul tercatat</small><i/></div>
      <div className="catalog-hero-ornament" aria-hidden="true"><span/><span/><span/></div>
    </section>

    <div className="member-catalog-toolbar">
      <div className="catalog-results"><span className="eyebrow">JELAJAHI RAK</span><strong>{filteredBooks.length} <span>judul ditemukan</span></strong><small>{availableCopies.toLocaleString('id-ID')} eksemplar tersedia di seluruh koleksi</small></div>
      <label className="catalog-category-filter"><span>Kategori</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="all">Semua kategori</option>{categories.map(name => <option value={name} key={name}>{name}</option>)}</select></label>
      <button className="button button-outline catalog-refresh" onClick={onRefresh}><RotateCcw size={15}/> Perbarui</button>
    </div>

    {loading && books.length === 0 ? <div className="panel catalog-empty"><LoaderCircle className="spin" size={22}/><strong>Memuat katalog</strong><span>Mengambil data buku dari perpustakaan...</span></div> : filteredBooks.length ? <div className="member-catalog-grid">
      {filteredBooks.map(book => {
        const available = Math.max(0, Number(book.available_stock) || 0);
        const total = Math.max(0, Number(book.total_stock) || 0);
        const bookCategory = book.category_name || (book.category_id ? `Kategori ${book.category_id}` : 'Koleksi umum');
        return <article className="member-catalog-card" key={book.id}>
          <button className="member-catalog-cover-button" onClick={() => setSelectedBook(book)} aria-label={`Lihat detail ${book.title}`}><BookCover book={book} className="member-catalog-cover" iconSize={30}/><span className="cover-view-label">LIHAT BUKU <ArrowRight size={12}/></span></button>
          <div className="member-catalog-card-content">
            <span className="catalog-book-category">{bookCategory}</span>
            <h3>{book.title}</h3>
            <p className="catalog-book-author">{book.author || 'Penulis tidak dicantumkan'}</p>
            <div className="catalog-book-facts"><div><span>PENERBIT</span><strong>{book.publisher || 'Tidak dicantumkan'}</strong></div><div><span>TAHUN TERBIT</span><strong>{book.publication_year || '—'}</strong></div></div>
            <p className="catalog-book-description">{book.description || 'Deskripsi untuk buku ini belum ditambahkan.'}</p>
            <div className="catalog-card-bottom"><Badge tone={available > 0 ? 'success' : 'warning'}>{available > 0 ? `${available} tersedia` : 'Sedang dipinjam'}</Badge><span className="catalog-stock-total">dari {total} eksemplar</span></div>
            <button className="catalog-detail-link" onClick={() => setSelectedBook(book)}>Baca detail <ArrowRight size={15}/></button>
          </div>
        </article>;
      })}
    </div> : <div className="panel catalog-empty"><div className="empty-icon"><BookOpen size={21}/></div><strong>{books.length ? 'Tidak ada buku yang cocok' : 'Katalog belum memiliki buku'}</strong><span>{books.length ? 'Coba kata kunci atau kategori yang berbeda.' : 'Buku yang ditambahkan pengelola akan muncul di halaman ini.'}</span>{(query || category !== 'all') && <button className="button button-outline" onClick={() => { setCategory('all'); setSearch(''); }}>Reset pencarian</button>}</div>}

    {selectedBook && <Modal className="catalog-detail-modal" title={selectedBook.title} subtitle={`${selectedBook.author || 'Penulis tidak dicantumkan'} · ${selectedBook.category_name || 'Koleksi umum'}`} onClose={() => setSelectedBook(null)}>
      <div className="catalog-detail-layout"><BookCover book={selectedBook} className="catalog-detail-cover" iconSize={38}/><div className="catalog-detail-copy">
        <span className="catalog-detail-kicker">INFORMASI BUKU</span>
        <h4>{selectedBook.title}</h4>
        <p className="catalog-detail-author">Oleh {selectedBook.author || 'penulis tidak dicantumkan'}</p>
        <div className="catalog-detail-metadata"><div><span>Penerbit</span><strong>{selectedBook.publisher || 'Tidak dicantumkan'}</strong></div><div><span>Tahun terbit</span><strong>{selectedBook.publication_year || 'Tidak diketahui'}</strong></div><div><span>Kategori</span><strong>{selectedBook.category_name || 'Koleksi umum'}</strong></div><div><span>ISBN</span><strong>{selectedBook.isbn || 'Tidak dicantumkan'}</strong></div></div>
        <div className="catalog-detail-stock"><Badge tone={Number(selectedBook.available_stock) > 0 ? 'success' : 'warning'}>{Number(selectedBook.available_stock) > 0 ? `${Number(selectedBook.available_stock)} eksemplar tersedia` : 'Tidak tersedia saat ini'}</Badge><span>Total koleksi: {Number(selectedBook.total_stock) || 0}</span></div>
      </div></div>
      <section className="catalog-detail-description"><span className="eyebrow">TENTANG BUKU</span><p>{selectedBook.description || 'Belum ada deskripsi untuk buku ini.'}</p></section>
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setSelectedBook(null)}>Tutup detail</button></div>
    </Modal>}
  </div>;
}

function Overview({ books, members, loans, categories, onPage, loading, refresh }) {
  const activeLoans = loans.filter(l => (l.status || '').toLowerCase() === 'borrowed').length;
  const available = books.reduce((sum, book) => sum + Number(book.available_stock ?? book.availableStock ?? 0), 0);
  const overdue = loans.filter(isOverdue).length;
  const latest = [...loans].sort((a,b) => new Date(b.loan_date || b.created_at || 0) - new Date(a.loan_date || a.created_at || 0)).slice(0,4);
  const chart = [28, 42, 35, 58, 46, 68, 54, 75, 62, 82, 69, 91];
  return <div className="page-content">
    <div className="welcome-row"><div><div className="eyebrow">{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toLocaleUpperCase('id-ID')}</div><h2>Selamat datang di ruang baca. <span>☀</span></h2><p>Ini yang sedang terjadi di perpustakaanmu hari ini.</p></div><div className="welcome-actions"><button className="button button-outline" onClick={refresh}><RotateCcw size={15}/> Perbarui data</button><button className="button button-dark" onClick={() => onPage('loans')}><Plus size={15}/> Catat peminjaman</button></div></div>
    {loading && <div className="sync-note"><LoaderCircle size={14} className="spin"/> Mengambil data dari server...</div>}
    <div className="stats-grid">
      <StatCard label="Total judul buku" value={books.length.toLocaleString('id-ID')} note="dalam katalog" icon={BookOpen} tone="sage" trend="Koleksi"/>
      <StatCard label="Buku tersedia" value={available.toLocaleString('id-ID')} note="eksemplar siap dibaca" icon={BookMarked} tone="blue" trend="Stok"/>
      <StatCard label="Sedang dipinjam" value={activeLoans.toLocaleString('id-ID')} note="transaksi aktif" icon={RotateCcw} tone="amber" trend={overdue ? `${overdue} terlambat` : 'Terkelola'} down={!!overdue}/>
      <StatCard label="Anggota terdaftar" value={members.length.toLocaleString('id-ID')} note="pembaca di ruang ini" icon={Users} tone="rose" trend="Anggota"/>
    </div>
    <section className="panel dashboard-covers-panel">
      <div className="panel-heading"><div><span className="eyebrow">DARI RAK BUKU</span><h3>Sampul koleksi</h3></div><button className="text-button" onClick={() => onPage('books')}>Buka katalog <ArrowRight size={15}/></button></div>
      {books.length ? <div className="dashboard-cover-grid">{[...books].sort((a,b) => Number(b.id || 0) - Number(a.id || 0)).slice(0,5).map(book => <button className="dashboard-book-card" key={book.id} onClick={() => onPage('books')} title={`Lihat ${book.title}`}><BookCover book={book} className="dashboard-book-cover" iconSize={24}/><span className="dashboard-book-meta"><strong>{book.title}</strong><small>{book.author || 'Penulis belum diisi'}</small></span></button>)}</div> : <EmptyState title="Belum ada sampul buku" body="Tambahkan buku dan unggah sampulnya untuk menampilkannya di sini."/>}
    </section>
    <div className="overview-grid">
      <section className="panel collection-panel">
        <div className="panel-heading"><div><span className="eyebrow">GAMBARAN KOLEKSI</span><h3>Aktivitas perpustakaan</h3></div><button className="text-button" onClick={() => onPage('books')}>Lihat koleksi <ArrowRight size={15}/></button></div>
        <div className="chart-summary"><strong>{books.length}</strong><span>judul di katalog</span><span className="chart-period"><CalendarDays size={14}/> Ringkasan saat ini</span></div>
        <div className="mini-chart" aria-label="Grafik ilustratif aktivitas"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area"><div className="chart-gridlines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 620 170" preserveAspectRatio="none" role="img" aria-label="Ilustrasi tren aktivitas"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#91a88c" stopOpacity=".28"/><stop offset="100%" stopColor="#91a88c" stopOpacity="0"/></linearGradient></defs><path d={`M ${chart.map((v,i)=>`${i*56},${160-v*1.45}`).join(' L ')} L 616,170 L 0,170 Z`} fill="url(#chartFill)"/><path d={`M ${chart.map((v,i)=>`${i*56},${160-v*1.45}`).join(' L ')}`} fill="none" stroke="#6e8c70" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{chart.map((v,i)=><circle key={i} cx={i*56} cy={160-v*1.45} r="3" fill="#6e8c70" stroke="#fff" strokeWidth="2"/>)}</svg><div className="chart-x"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span><span>Nov</span><span>Des</span></div></div></div>
        <div className="chart-footnote"><span><i className="legend-dot"/> Aktivitas ilustratif</span><span>Grafik contoh · belum terhubung ke data historis</span></div>
      </section>
      <section className="panel category-panel">
        <div className="panel-heading"><div><span className="eyebrow">JELAJAHI</span><h3>Kategori buku</h3></div><button className="icon-button" onClick={() => onPage('categories')} aria-label="Lihat kategori"><ArrowRight size={17}/></button></div>
        {categories.length ? <div className="category-list">{categories.slice(0,4).map((cat,i)=><div className="category-row" key={cat.id ?? cat.name}><div className={`category-cover category-cover-${i%4}`}><BookOpen size={18}/></div><div className="category-name"><strong>{cat.name}</strong><small>{cat.description || 'Kategori koleksi'}</small></div><span className="category-number">{books.filter(b => b.category_id === cat.id || b.category_name === cat.name).length.toString().padStart(2,'0')}</span></div>)}</div> : <EmptyState title="Belum ada kategori" body="Tambahkan kategori untuk merapikan koleksi."/>}
        <button className="button button-soft category-action" onClick={() => onPage('categories')}>Kelola kategori <ArrowRight size={15}/></button>
      </section>
    </div>
    <section className="panel recent-panel">
      <div className="panel-heading"><div><span className="eyebrow">YANG TERBARU</span><h3>Aktivitas peminjaman</h3></div><button className="text-button" onClick={() => onPage('loans')}>Semua peminjaman <ArrowRight size={15}/></button></div>
      <LoansTable loans={latest} compact onReturn={refresh}/>
    </section>
  </div>;
}

function BooksPage({ books, categories, onRefresh, notify, query }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title:'', author:'', isbn:'', category_id:'', publisher:'', publication_year:'', description:'', total_stock:'1' });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [error, setError] = useState('');
  const filtered = books.filter(b => `${b.title} ${b.author} ${b.isbn} ${b.category_name}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (coverPreview.startsWith('blob:')) return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  function openForm(book = null) {
    setEditing(book);
    setForm(book ? { title:book.title||'', author:book.author||'', isbn:book.isbn||'', category_id:book.category_id||'', publisher:book.publisher||'', publication_year:book.publication_year||'', description:book.description||'', total_stock:book.total_stock ?? 1 } : { title:'', author:'', isbn:'', category_id:categories[0]?.id || '', publisher:'', publication_year:'', description:'', total_stock:'1' });
    setCoverFile(null);
    setCoverPreview(book?.cover_image ? assetUrl(book.cover_image) : '');
    setError(''); setModal(true);
  }

  function chooseCover(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Format sampul harus JPG, PNG, atau WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran sampul maksimal 5 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    const payload = new FormData();
    for (const [key, value] of Object.entries(form)) payload.append(key, value ?? '');
    if (coverFile) payload.append('cover', coverFile);
    try {
      await api(editing ? `/books/${editing.id}` : '/books', { method: editing ? 'PATCH' : 'POST', body: payload });
      setModal(false); notify(editing ? 'Data buku diperbarui.' : 'Buku dan sampul berhasil ditambahkan.'); await onRefresh();
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function remove(book) {
    if (!window.confirm(`Hapus "${book.title}" dari katalog?`)) return;
    try { await api(`/books/${book.id}`, { method:'DELETE' }); notify('Buku dihapus dari katalog.'); onRefresh(); }
    catch(err) { notify(err.message, 'error'); }
  }

  return <div className="page-content">
    <div className="page-intro"><div><span className="eyebrow">KATALOG PERPUSTAKAAN</span><h2>Koleksi buku</h2><p>Rawat katalog, perbarui informasi, unggah sampul, dan pastikan stok selalu akurat.</p></div><button className="button button-dark" onClick={() => openForm()}><Plus size={17}/> Tambah buku</button></div>
    <div className="list-toolbar"><div className="toolbar-count"><strong>{filtered.length}</strong> judul ditemukan</div><span className="toolbar-hint"><Command size={14}/> Sampul ditampilkan langsung dari katalog</span></div>
    <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>JUDUL / ISBN</th><th>KATEGORI</th><th>STOK</th><th>KETERSEDIAAN</th><th className="right">AKSI</th></tr></thead><tbody>
      {filtered.map(book=><tr key={book.id}><td><div className="book-cell"><BookCover book={book} className={`book-thumb thumb-${Number(book.id)%4}`} iconSize={20}/><div><strong>{book.title}</strong><small>{book.author || 'Penulis belum diisi'} · {book.isbn || 'ISBN belum diisi'}</small></div></div></td><td><span className="category-pill">{book.category_name || categories.find(c=>String(c.id)===String(book.category_id))?.name || 'Tanpa kategori'}</span></td><td><strong>{book.total_stock ?? 0}</strong><small className="cell-sub">eksemplar</small></td><td><Badge tone={Number(book.available_stock)>0?'success':'warning'}>{Number(book.available_stock)>0?'Tersedia':'Habis dipinjam'}</Badge></td><td><div className="row-actions"><button className="icon-button" title="Edit buku dan sampul" onClick={()=>openForm(book)}><Settings2 size={16}/></button><button className="icon-button danger-hover" title="Hapus buku" onClick={()=>remove(book)}><X size={16}/></button></div></td></tr>)}
      {!filtered.length && <tr><td colSpan="5"><EmptyState title="Belum ada buku di sini" body="Tambahkan buku pertama atau ubah kata pencarian." /></td></tr>}
    </tbody></table></div></div>
    {modal && <Modal title={editing?'Perbarui data buku':'Tambah buku baru'} subtitle="Lengkapi metadata dan unggah sampul untuk katalog." onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}>
      <div className="cover-upload-layout">
        <div className="cover-upload-preview">{coverPreview ? <img src={coverPreview} alt="Pratinjau sampul buku"/> : <div className="cover-upload-empty"><ImagePlus size={28}/><span>Pratinjau sampul</span></div>}</div>
        <div className="cover-upload-copy"><strong>Sampul buku</strong><p>JPG, PNG, atau WebP. Maksimal 5 MB. Rasio portrait paling cocok untuk sampul buku.</p><label className="button button-outline cover-upload-button"><Upload size={15}/>{coverFile ? 'Ganti gambar' : (editing?.cover_image ? 'Ganti sampul' : 'Pilih gambar')}<input className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseCover}/></label>{coverFile && <span className="cover-file-name">{coverFile.name}</span>}{coverFile && <button type="button" className="cover-clear-button" onClick={()=>{setCoverFile(null);setCoverPreview(editing?.cover_image ? assetUrl(editing.cover_image) : '');}}><Trash2 size={13}/>Hapus pilihan</button>}</div>
      </div>
      <label>Judul buku<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Contoh: Laut Bercerita"/></label>
      <div className="form-two"><label>Penulis<input required value={form.author} onChange={e=>setForm({...form,author:e.target.value})} placeholder="Nama penulis"/></label><label>ISBN<input value={form.isbn} onChange={e=>setForm({...form,isbn:e.target.value})} placeholder="Nomor ISBN"/></label></div>
      <div className="form-two"><label>Kategori<select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Pilih kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Penerbit<input value={form.publisher} onChange={e=>setForm({...form,publisher:e.target.value})} placeholder="Nama penerbit"/></label></div>
      <div className="form-two"><label>Tahun terbit<input type="number" min="1000" max="2100" value={form.publication_year} onChange={e=>setForm({...form,publication_year:e.target.value})} placeholder="2024"/></label><label>Total stok<input type="number" min="0" required value={form.total_stock} onChange={e=>setForm({...form,total_stock:e.target.value})}/></label></div>
      <label>Deskripsi<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Catatan singkat tentang buku"/></label>
      {error && <div className="form-error"><AlertCircle size={15}/>{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={()=>setModal(false)}>Batal</button><button className="button button-dark" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} {busy?'Menyimpan...':'Simpan buku'}</button></div>
    </form></Modal>}
  </div>;
}

function CategoriesPage({ categories, books, onRefresh, notify, query }) {
  const [modal,setModal]=useState(false); const [editing,setEditing]=useState(null); const [name,setName]=useState(''); const [description,setDescription]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const filtered=categories.filter(c=>`${c.name} ${c.description||''}`.toLowerCase().includes(query.toLowerCase()));
  function open(cat=null){setEditing(cat);setName(cat?.name||'');setDescription(cat?.description||'');setError('');setModal(true);}
  async function save(e){e.preventDefault();setBusy(true);setError('');try{await api(editing?`/categories/${editing.id}`:'/categories',{method:editing?'PATCH':'POST',body:JSON.stringify({name,description})});setModal(false);notify(editing?'Kategori diperbarui.':'Kategori ditambahkan.');await onRefresh();}catch(err){setError(err.message)}finally{setBusy(false)}}
  async function remove(cat){if(!window.confirm(`Hapus kategori "${cat.name}"?`))return;try{await api(`/categories/${cat.id}`,{method:'DELETE'});notify('Kategori dihapus.');onRefresh()}catch(err){notify(err.message,'error')}}
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">SUSUN KOLEKSI</span><h2>Kategori</h2><p>Kelompokkan buku agar pembaca lebih mudah menemukan yang mereka cari.</p></div><button className="button button-dark" onClick={()=>open()}><Plus size={17}/> Kategori baru</button></div>
    <div className="category-cards">{filtered.map((cat,i)=><article className="category-card" key={cat.id}><div className={`category-card-art art-${i%4}`}><div className="art-orbit"/><BookOpen size={29}/><span>{String(i+1).padStart(2,'0')}</span></div><div className="category-card-body"><div className="category-card-top"><span className="eyebrow">KATEGORI</span><button className="icon-button" onClick={()=>open(cat)} aria-label="Edit kategori"><MoreHorizontal size={18}/></button></div><h3>{cat.name}</h3><p>{cat.description || 'Belum ada deskripsi untuk kategori ini.'}</p><div className="category-card-foot"><span><BookMarked size={15}/>{books.filter(b=>String(b.category_id)===String(cat.id)||b.category_name===cat.name).length} judul</span><div><button className="mini-text-button" onClick={()=>open(cat)}>Edit</button><button className="mini-text-button danger-text" onClick={()=>remove(cat)}>Hapus</button></div></div></div></article>)}{!filtered.length&&<div className="panel empty-panel"><EmptyState title="Belum ada kategori" body="Buat kategori pertama untuk mengatur katalog buku."/></div>}</div>
    {modal&&<Modal title={editing?'Edit kategori':'Kategori baru'} subtitle="Nama yang jelas membantu katalog tetap rapi." onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}><label>Nama kategori<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Contoh: Sejarah"/></label><label>Deskripsi<textarea rows="3" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Apa jenis buku yang masuk di sini?"/></label>{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={()=>setModal(false)}>Batal</button><button className="button button-dark" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} Simpan kategori</button></div></form></Modal>}
  </div>;
}

function MembersPage({ members, onRefresh, notify, query }) {
  const [modal,setModal]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState({name:'',member_code:'',email:'',phone:'',address:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const filtered=members.filter(m=>`${m.name} ${m.member_code} ${m.email} ${m.phone||''}`.toLowerCase().includes(query.toLowerCase()));
  function open(m=null){setEditing(m);setForm(m?{name:m.name||'',member_code:m.member_code||'',email:m.email||'',phone:m.phone||'',address:m.address||''}:{name:'',member_code:'',email:'',phone:'',address:''});setError('');setModal(true);}
  async function save(e){e.preventDefault();setBusy(true);setError('');try{await api(editing?`/members/${editing.id}`:'/members',{method:editing?'PATCH':'POST',body:JSON.stringify(form)});setModal(false);notify(editing?'Data anggota diperbarui.':'Anggota berhasil ditambahkan.');await onRefresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  async function remove(m){if(!window.confirm(`Hapus anggota ${m.name}?`))return;try{await api(`/members/${m.id}`,{method:'DELETE'});notify('Anggota dihapus.');onRefresh()}catch(err){notify(err.message,'error')}}
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">KOMUNITAS PEMBACA</span><h2>Anggota</h2><p>Data anggota yang membantu setiap buku menemukan pembacanya.</p></div><button className="button button-dark" onClick={()=>open()}><Plus size={17}/> Tambah anggota</button></div>
    <div className="member-summary"><div><span className="eyebrow">TOTAL ANGGOTA</span><strong>{members.length.toLocaleString('id-ID')}</strong></div><div><span className="eyebrow">ANGGOTA AKTIF</span><strong>{members.filter(m=>(m.status||'active')==='active').length.toLocaleString('id-ID')}</strong></div><div className="member-summary-note"><Users size={19}/><span>Setiap anggota punya cerita. Jaga datanya tetap terbaru.</span></div></div>
    <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>NAMA ANGGOTA</th><th>KODE</th><th>EMAIL / TELEPON</th><th>STATUS</th><th className="right">AKSI</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td><div className="member-cell"><div className="avatar avatar-member">{initials(m.name)}</div><strong>{m.name}</strong></div></td><td><span className="code-pill">{m.member_code||`MBR-${m.id}`}</span></td><td><div className="stacked-cell"><span>{m.email||'—'}</span><small>{m.phone||'Nomor belum diisi'}</small></div></td><td><Badge tone={(m.status||'active')==='active'?'success':'neutral'}>{(m.status||'active')==='active'?'Aktif':'Nonaktif'}</Badge></td><td><div className="row-actions"><button className="icon-button" title="Edit anggota" onClick={()=>open(m)}><Settings2 size={16}/></button><button className="icon-button danger-hover" title="Hapus anggota" onClick={()=>remove(m)}><X size={16}/></button></div></td></tr>)}{!filtered.length&&<tr><td colSpan="5"><EmptyState title="Belum ada anggota" body="Tambahkan anggota untuk mulai mencatat peminjaman."/></td></tr>}</tbody></table></div></div>
    {modal&&<Modal title={editing?'Perbarui anggota':'Anggota baru'} subtitle="Lengkapi data dasar anggota perpustakaan." onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}><label>Nama lengkap<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama sesuai identitas"/></label><div className="form-two"><label>Kode anggota<input value={form.member_code} onChange={e=>setForm({...form,member_code:e.target.value})} placeholder="MBR-004"/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@contoh.id"/></label></div><div className="form-two"><label>Nomor telepon<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx"/></label><label>Alamat<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Alamat domisili"/></label></div>{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={()=>setModal(false)}>Batal</button><button className="button button-dark" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} Simpan anggota</button></div></form></Modal>}
  </div>;
}

function LoansTable({ loans, compact = false, onReturn, notify }) {
  async function returnLoan(loan) {
    if (!window.confirm(`Proses pengembalian pinjaman #${loan.id}?`)) return;
    try {
      await api(`/loans/${loan.id}/return`, { method: 'PATCH' });
      notify?.('Pengembalian berhasil diproses.');
      await onReturn?.();
    } catch (err) {
      notify?.(err.message, 'error');
    }
  }

  return <div className="table-scroll"><table><thead><tr><th>NAMA PEMINJAM</th><th>BUKU DIPINJAM</th>{!compact && <th>TANGGAL PINJAM</th>}<th>JATUH TEMPO</th><th>STATUS</th>{!compact && <th className="right">AKSI</th>}</tr></thead><tbody>
    {loans.map(loan => {
      const active = (loan.status || '').toLowerCase() === 'borrowed';
      const late = isOverdue(loan);
      const borrowerName = loan.member_name || loan.name || loan.member?.name || 'Nama tidak tersedia';
      const borrowerCode = loan.member_code || (loan.member_id ? `Anggota #${loan.member_id}` : 'Anggota terdaftar');
      return <tr key={loan.id}>
        <td><div className="borrower-cell"><span className="borrower-avatar">{initials(borrowerName)}</span><div><strong>{borrowerName}</strong><small>{borrowerCode}</small></div></div></td>
        <td><div className="loan-cell"><div className="loan-icon"><BookOpen size={17}/></div><div><strong>{loanBooksLabel(loan)}</strong><small>{Array.isArray(loan.items) ? `${loan.items.length} judul buku · transaksi #${loan.id}` : `Transaksi #${loan.id}`}</small></div></div></td>
        {!compact && <td>{dateLabel(loan.loan_date || loan.created_at)}</td>}
        <td>{dateLabel(loan.due_date)}</td>
        <td><Badge tone={late ? 'warning' : active ? 'blue' : 'success'}>{late ? 'Terlambat' : active ? 'Dipinjam' : 'Dikembalikan'}</Badge></td>
        {!compact && <td><div className="row-actions">{active && <button className="button button-soft button-small" onClick={() => returnLoan(loan)}><Check size={14}/> Kembalikan</button>}</div></td>}
      </tr>;
    })}
    {!loans.length && <tr><td colSpan={compact ? 4 : 6}><EmptyState title="Belum ada peminjaman" body="Transaksi baru akan muncul di sini."/></td></tr>}
  </tbody></table></div>;
}
function LoansPage({ loans, onRefresh, notify, query }) {
  const [modal,setModal]=useState(false); const [members,setMembers]=useState([]); const [books,setBooks]=useState([]); const [form,setForm]=useState({member_id:'',book_id:'',quantity:1,due_date:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const filtered = loans.filter(loan => `${loan.member_name || ''} ${loan.member_code || ''} ${loanBooksLabel(loan)} ${loan.status || ''} ${loan.id}`.toLowerCase().includes(query.toLowerCase()));
  const selectedMember = members.find(member => String(member.id) === String(form.member_id));
  async function open(){setError('');try{const [m,b]=await Promise.all([api('/members'),api('/books')]);setMembers(normalizeList(m));setBooks(normalizeList(b));setForm({member_id:'',book_id:'',quantity:1,due_date:''});setModal(true)}catch(e){notify(e.message,'error')}}
  async function save(e){e.preventDefault();setBusy(true);setError('');try{await api('/loans',{method:'POST',body:JSON.stringify({member_id:Number(form.member_id),items:[{book_id:Number(form.book_id),quantity:Number(form.quantity)}],due_date:form.due_date})});setModal(false);notify('Peminjaman berhasil dicatat. Nama peminjam akan tampil di Dashboard.');await onRefresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const active=loans.filter(l=>(l.status||'').toLowerCase()==='borrowed').length;
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">SIRKULASI BUKU</span><h2>Peminjaman</h2><p>Catat buku yang keluar dan pastikan kembali tepat waktu.</p></div><button className="button button-dark" onClick={open}><Plus size={17}/> Catat peminjaman</button></div>
    <div className="loan-summary"><div><div className="summary-icon summary-blue"><RotateCcw size={18}/></div><span className="eyebrow">PEMINJAMAN AKTIF</span><strong>{active}</strong><small>transaksi belum kembali</small></div><div><div className="summary-icon summary-amber"><Clock3 size={18}/></div><span className="eyebrow">TERLAMBAT</span><strong>{loans.filter(isOverdue).length}</strong><small>perlu ditindaklanjuti</small></div><div><div className="summary-icon summary-sage"><CheckCircle2 size={18}/></div><span className="eyebrow">SELESAI</span><strong>{loans.filter(l=>(l.status||'').toLowerCase()==='returned').length}</strong><small>sudah dikembalikan</small></div></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">DAFTAR TRANSAKSI</span><h3>Riwayat peminjaman</h3></div><span className="small-muted">{filtered.length} transaksi</span></div><LoansTable loans={filtered} onReturn={async()=>{await onRefresh()}} notify={notify}/></section>
    {modal&&<Modal title="Catat peminjaman" subtitle="Tentukan siapa yang meminjam, buku yang dibawa, dan tanggal pengembalian." onClose={()=>setModal(false)}><form className="modal-form" onSubmit={save}><label>Nama peminjam<select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}><option value="">Pilih nama peminjam</option>{members.filter(m=>(m.status||'active')==='active').map(m=><option key={m.id} value={m.id}>{m.name} — {m.member_code}</option>)}</select><small className="field-hint">Pilih anggota terdaftar. Nama ini akan tercatat di riwayat dan Dashboard.</small></label>{selectedMember&&<div className="selected-borrower"><span className="borrower-avatar">{initials(selectedMember.name)}</span><div><strong>{selectedMember.name}</strong><small>{selectedMember.member_code || `Anggota #${selectedMember.id}`}</small></div><span className="selection-confirm"><Check size={14}/> Dipilih</span></div>}<label>Buku yang dipinjam<select required value={form.book_id} onChange={e=>setForm({...form,book_id:e.target.value})}><option value="">Pilih buku</option>{books.filter(b=>Number(b.available_stock)>0).map(b=><option key={b.id} value={b.id}>{b.title} (tersedia {b.available_stock})</option>)}</select></label><div className="form-two"><label>Jumlah eksemplar<input type="number" min="1" max={Math.max(1, Number(books.find(book => String(book.id) === String(form.book_id))?.available_stock || 1))} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label><label>Jatuh tempo<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} required/></label></div>{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={()=>setModal(false)}>Batal</button><button className="button button-dark" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} Simpan transaksi</button></div></form></Modal>}
  </div>;
}
function Modal({ title, subtitle, onClose, children, className = '' }) {
  useEffect(()=>{function esc(e){if(e.key==='Escape')onClose()}window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className={`modal ${className}`}><div className="modal-heading"><div><span className="eyebrow">RUANG BACA / DATA</span><h3>{title}</h3><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup modal"><X size={18}/></button></div>{children}</section></div>;
}

function SettingsPage({ user, notify }) {
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">PREFERENSI</span><h2>Pengaturan</h2><p>Informasi akun yang sedang digunakan.</p></div></div><section className="panel settings-card"><div className="settings-avatar avatar avatar-terracotta">{initials(user?.name||user?.email)}</div><div className="settings-user"><h3>{user?.name||'Pengelola perpustakaan'}</h3><p>{user?.email||'Email akun tidak tersedia'}</p><Badge tone="success">{user?.role||'admin'}</Badge></div><div className="settings-line"/><div className="settings-detail"><span>Nama pengguna</span><strong>{user?.name||'—'}</strong></div><div className="settings-detail"><span>Email</span><strong>{user?.email||'—'}</strong></div><div className="settings-detail"><span>Role</span><strong>{user?.role||'admin'}</strong></div><div className="settings-info"><ShieldCheck size={17}/><span>Autentikasi dikelola oleh API backend. Untuk mengganti password, tambahkan alur reset password di backend.</span></div></section></div>;
}

export default function App() {
  const [authed,setAuthed]=useState(Boolean(getToken()));
  const [user,setUser]=useState(getSavedUser());
  const [page,setPage]=useState(() => isMemberRole(getSavedUser()) ? 'catalog' : 'overview');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(false);
  const [data,setData]=useState({books:[],categories:[],members:[],loans:[]});
  const [apiError,setApiError]=useState('');
  const notify=(message,kind='success')=>setToast({message,kind});
  const refresh=async({quiet=false, userOverride=null}={})=>{
    if(!getToken())return;
    const activeUser = userOverride || user || getSavedUser();
    const memberMode = isMemberRole(activeUser);
    setLoading(true); if(!quiet)setApiError('');
    // Anggota hanya perlu membaca katalog. Data admin/staf tidak diminta ke API.
    const specs = memberMode ? [['books','/books']] : [['books','/books'],['categories','/categories'],['members','/members'],['loans','/loans']];
    const results=await Promise.allSettled(specs.map(([,path])=>api(path)));
    const next=memberMode ? {books:[],categories:[],members:[],loans:[]} : {...data}; let failures=[];
    results.forEach((result,i)=>{const [key,path]=specs[i];if(result.status==='fulfilled')next[key]=normalizeList(result.value);else{failures.push(`${key}: ${result.reason.message}`);}});
    setData(next);
    if(failures.length===specs.length)setApiError('Belum bisa memuat katalog dari API. Periksa koneksi backend dan akses akun.');
    else if(failures.length && !quiet)setApiError(`Sebagian data belum tersedia — ${failures.join(' · ')}`);
    else if (!failures.length)setApiError('');
    setLoading(false);
  };
  async function handleLogin(email,password){const nextUser=await login(email,password);setUser(nextUser);setAuthed(true);setPage(isMemberRole(nextUser)?'catalog':'overview');setSearch('');await refresh({quiet:true,userOverride:nextUser});}
  function logout(){clearSession();setAuthed(false);setData({books:[],categories:[],members:[],loans:[]});setUser({});setPage('overview');}
  useEffect(()=>{const expire=()=>{setAuthed(false);setUser({});setToast({message:'Sesi berakhir. Silakan masuk kembali.',kind:'error'});};window.addEventListener('auth-expired',expire);return()=>window.removeEventListener('auth-expired',expire)},[]);
  useEffect(()=>{if(authed)refresh({quiet:true})},[authed]);
  useEffect(()=>{function key(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('.global-search input')?.focus()}if(e.key==='Escape')setMobileOpen(false)}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
  const memberView = isMemberRole(user);
  const currentPage = memberView ? 'catalog' : page;
  const pageMeta={overview:['Ringkasan','Sekilas kabar dari perpustakaanmu'],catalog:['Katalog buku','Jelajahi koleksi dan cek ketersediaan'],books:['Koleksi buku','Semua judul dalam satu katalog'],categories:['Kategori','Susun koleksi agar mudah dijelajahi'],members:['Anggota','Kenali komunitas pembaca'],loans:['Peminjaman','Sirkulasi buku dan tanggal kembali'],settings:['Pengaturan','Preferensi dan informasi akun']};
  if(!authed)return <><LoginPage onLogin={handleLogin} onRegister={registerMember}/>{toast&&<Toast message={toast.message} kind={toast.kind} onClose={()=>setToast(null)}/>}</>;
  return <div className="app-shell">
    <Sidebar page={currentPage} setPage={setPage} onLogout={logout} user={user} mobileOpen={mobileOpen} closeMobile={()=>setMobileOpen(false)} loans={data.loans}/>
    <main className="main-area"><Topbar title={pageMeta[currentPage]?.[0]||'Ringkasan'} subtitle={pageMeta[currentPage]?.[1]||''} onMenu={()=>setMobileOpen(true)} user={user} search={search} setSearch={setSearch}/>
      {apiError&&<div className="api-warning"><AlertCircle size={17}/><div><strong>Data belum sepenuhnya tersinkron</strong><span>{apiError}</span></div><button className="icon-button" onClick={()=>setApiError('')}><X size={16}/></button></div>}
      {currentPage==='overview'&&<Overview books={data.books} members={data.members} loans={data.loans} categories={data.categories} onPage={setPage} loading={loading} refresh={()=>refresh()}/>}
      {currentPage==='catalog'&&<MemberCatalog books={data.books} query={search} loading={loading} onRefresh={()=>refresh()} setSearch={setSearch}/>}
      {currentPage==='books'&&<BooksPage books={data.books} categories={data.categories} onRefresh={()=>refresh({quiet:true})} notify={notify} query={search}/>}
      {currentPage==='categories'&&<CategoriesPage categories={data.categories} books={data.books} onRefresh={()=>refresh({quiet:true})} notify={notify} query={search}/>}
      {currentPage==='members'&&<MembersPage members={data.members} onRefresh={()=>refresh({quiet:true})} notify={notify} query={search}/>}
      {currentPage==='loans'&&<LoansPage loans={data.loans} onRefresh={()=>refresh({quiet:true})} notify={notify} query={search}/>}
      {currentPage==='settings'&&<SettingsPage user={user} notify={notify}/>}
      <footer className="app-footer"><span>Ruang Baca <span className="footer-separator">/</span> Sistem manajemen perpustakaan</span><span><span className="online-dot"/> API connection ready <span className="footer-separator">·</span> v1.0</span></footer>
    </main>
    {toast&&<Toast message={toast.message} kind={toast.kind} onClose={()=>setToast(null)}/>}
  </div>;
}