# Mini Library Frontend — Loans Integration

This archive contains the Vite + React frontend with the Loans feature connected to the backend API.

## What changed
- Dashboard: shows loan activity from the API, uses a live Indonesian date, and adds a shortcut to the Loans page.
- Sidebar: Peminjaman menu badge now reflects the number of active (`borrowed`) transactions instead of a hardcoded number.
- Loans page: creates a loan with member, book, quantity, and due date; lists member/book information from `loans.items`; and supports returns through `PATCH /api/v1/loans/:id/return`.
- Due-date display: detects overdue transactions by comparing dates at local midnight.

## Setup
1. Extract/merge these files into the frontend project directory, keeping the `src/` folder structure.
2. Check `.env` and set `VITE_API_URL=http://127.0.0.1:3001/api/v1` for local development.
3. Install dependencies in the frontend project: `npm install`.
4. Start the Vite development server: `npm run dev`.

The API is expected to expose `GET /loans`, `POST /loans`, `GET /members`, `GET /books`, and `PATCH /loans/:id/return` under `/api/v1`.

## Dark enterprise theme
- The UI now uses an ink/graphite foundation with restrained sage/lime accents, high-contrast typography, quieter borders, and consistent dark surfaces across the login screen, sidebar, dashboard, data tables, forms, dialogs, alerts, and mobile layout.
- Native inputs use a dark color scheme to keep date pickers and select controls visually consistent.
- `index.html` theme color is set to `#0c100e` to match the application shell.

## Borrower name in the form and dashboard
- The loan form labels the member selector as **Nama peminjam**, shows the selected member's name and member code, and explains that the registered member name appears in history and the dashboard.
- The Dashboard's recent loan activity now has separate **Nama peminjam** and **Buku dipinjam** columns, so borrower identity is not hidden under the book title.
- The loans page uses the same separate columns. Borrower names come from the `members` relation through the Loans API; the form submits `member_id` rather than arbitrary free text to preserve database relationships.
