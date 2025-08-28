import React, { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import Gallery from './components/Gallery';
import SearchPage from './components/SearchPage';
import UploadPage from './components/UploadPage';
import CrawlPage from './components/CrawlPage';
import { health, stats } from './api';

function Header() {
  return (
    <header>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Gallery
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => (isActive ? 'active' : '')}>
        Search
      </NavLink>
      <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
        Upload
      </NavLink>
      <NavLink to="/crawl" className={({ isActive }) => (isActive ? 'active' : '')}>
        Crawl
      </NavLink>
    </header>
  );
}

function Footer({ meta }) {
  return (
    <div className="container muted" style={{ paddingBottom: 40 }}>
      <hr style={{ margin: '24px 0', border: '0', borderTop: '1px solid #e5e7eb' }} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span>DeepSight OSINT Pro</span>
        <span>{meta}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [meta, setMeta] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const h = await health();
        const s = await stats().catch(() => ({}));
        setMeta(h.ok ? `API OK • imgs: ${s.images ?? '—'}` : 'API error');
      } catch {
        setMeta('API error');
      }
    })();
  }, []);

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/crawl" element={<CrawlPage />} />
      </Routes>
      <Footer meta={meta} />
    </BrowserRouter>
  );
}
