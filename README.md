# React + Vite
## Demo
** <a href'https://6txmv9-5173.csb.app/'>bookfinder</a>

## BookFinder

**Simple book search app for Alex (college student).**

---

## What it does
- Search books by **title** using the Open Library API.  
- Show book **cover**, **authors**, **first published year**, **subjects**, and **edition count**.  
- Save **favorites** (stored in browser).  
- Keep **recent searches** as chips (click to reuse).  
- Pagination (Prev / Next) and simple sorting (relevance / year).  
- Responsive UI: works on mobile and desktop (favorites drawer on mobile, panel on desktop).

---

## Tech
- **React** (functional components + hooks)  
- **Open Library Search API** (`https://openlibrary.org/search.json?title={title}`) — no auth  
- **Tailwind CSS** (recommended for exact styles) — component works without it but will need CSS adjustments

---

## Quick setup (basic)
1. Create a React app (Create React App or Vite).  
2. Copy `App.jsx` into your project (replace default App).  
3. (Optional) Install and enable Tailwind if you want the same look.  
4. Run:
   ```bash
   npm install
   npm start   # or `npm run dev` for Vite
