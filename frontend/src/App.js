import React, { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Gallery from './components/Gallery';
import SearchPage from './components/SearchPage';
import UploadPage from './components/UploadPage';
import CrawlPage from './components/CrawlPage';
import PricingPage from './components/PricingPage';
import ThankYouPage from './components/ThankYouPage';
import ProGate from './components/ProGate';
import AdminFlags from './components/AdminFlags';
import { health, stats, getFlags, track } from './api';

function Header({ isAdmin, onAdminHelp, onRefreshFlags, flags }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [pro, setPro] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('pro') === '1',
  );
  const [hasAdmin, setHasAdmin] = useState(() => {
    try {
      return !!(localStorage.getItem('admin.token') || process.env.REACT_APP_ADMIN_TOKEN);
    } catch {
      return !!process.env.REACT_APP_ADMIN_TOKEN;
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  useEffect(() => {
    const onPro = () => setPro(true);
    window.addEventListener('pro-activated', onPro);
    return () => window.removeEventListener('pro-activated', onPro);
  }, []);
  useEffect(() => {
    const onStorage = () => {
      try {
        setHasAdmin(!!(localStorage.getItem('admin.token') || process.env.REACT_APP_ADMIN_TOKEN));
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  let apiHost = '';
  try {
    apiHost = new URL(process.env.REACT_APP_API_ORIGIN || '').host;
  } catch {}
  return (
    <header className="container" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <img src="/logo.svg" alt="DeepSight" width={28} height={28} />
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Gallery
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => (isActive ? 'active' : '')}>
        Search
      </NavLink>
      {flags?.proOnly?.includes?.('upload') && !pro ? (
        <button className="btn ghost" disabled title="Pro-only feature">
          Upload 🔒
        </button>
      ) : (
        <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
          Upload
        </NavLink>
      )}
      {flags?.proOnly?.includes?.('crawl') && !pro ? (
        <button className="btn ghost" disabled title="Pro-only feature">
          Crawl 🔒
        </button>
      ) : (
        <NavLink to="/crawl" className={({ isActive }) => (isActive ? 'active' : '')}>
          Crawl
        </NavLink>
      )}
      <NavLink to="/pricing" className={({ isActive }) => (isActive ? 'active' : '')}>
        Pricing
      </NavLink>
      {isAdmin || hasAdmin ? (
        <NavLink to="/admin/flags" className={({ isActive }) => (isActive ? 'active' : '')}>
          Admin
        </NavLink>
      ) : (
        <button className="btn ghost" onClick={onAdminHelp} title="How to enable admin mode">
          Admin
        </button>
      )}
      <div style={{ flex: 1 }} />
      {isAdmin || hasAdmin ? <span className="tag">ADMIN</span> : null}
      <button className="btn ghost" onClick={onRefreshFlags} title="Refresh feature flags">
        Refresh Flags
      </button>
      {flagsLoadedAt ? <span className="muted">Flags: {flagsLoadedAt}</span> : null}
      {apiHost ? (
        <span className="tag" title={process.env.REACT_APP_API_ORIGIN}>
          API: {apiHost}
        </span>
      ) : null}
      {pro ? <span className="tag">PRO</span> : null}
      <button className="btn ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? 'Dark' : 'Light'} mode
      </button>
    </header>
  );
}

function Footer({ meta }) {
  return (
    <div className="container muted" style={{ paddingBottom: 40 }}>
      <hr style={{ margin: '24px 0' }} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span>DeepSight OSINT Pro</span>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function TitleSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const map = {
      '/': 'DeepSight — Gallery',
      '/search': 'DeepSight — Search',
      '/upload': 'DeepSight — Upload',
      '/crawl': 'DeepSight — Crawl',
      '/pricing': 'DeepSight — Pricing',
      '/thank-you': 'DeepSight — Thank You',
    };
    document.title = map[pathname] || 'DeepSight OSINT Pro — OSINT Image Search & Gallery';
    try {
      track('pageview', { path: pathname });
    } catch {}
  }, [pathname]);
  return null;
}

export default function App() {
  const [meta, setMeta] = useState('');
  const [announcement, setAnnouncement] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('flags.json') || 'null');
      return cached?.announcement || '';
    } catch {
      return '';
    }
  });
  const [flags, setFlags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('flags.json') || '{}') || {};
    } catch {
      return {};
    }
  });
  const [showAdminHelp, setShowAdminHelp] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return !!(localStorage.getItem('admin.token') || process.env.REACT_APP_ADMIN_TOKEN);
    } catch {
      return !!process.env.REACT_APP_ADMIN_TOKEN;
    }
  });
  const [flagsLoadedAt, setFlagsLoadedAt] = useState(() => {
    try {
      const ts = localStorage.getItem('flags.loadedAt');
      return ts ? new Date(Number(ts)).toLocaleTimeString() : '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const h = await health();
        const s = await stats().catch(() => ({}));
        setMeta(h.ok ? `API OK · imgs: ${s.images ?? '-'}` : 'API error');
        try {
          const f = await getFlags();
          const ff = f?.flags || {};
          setFlags(ff);
          try {
            localStorage.setItem('flags.json', JSON.stringify(ff));
            localStorage.setItem('flags.loadedAt', String(Date.now()));
            setFlagsLoadedAt(new Date().toLocaleTimeString());
          } catch {}
          const msg = ff.announcement || '';
          const dismissed =
            typeof localStorage !== 'undefined' && localStorage.getItem('announce.dismiss') === msg;
          if (msg && !dismissed) setAnnouncement(msg);
        } catch {}
      } catch {
        setMeta('API error');
      }
    })();
  }, []);

  async function refreshFlags() {
    try {
      const f = await getFlags();
      const ff = f?.flags || {};
      setFlags(ff);
      try {
        localStorage.setItem('flags.json', JSON.stringify(ff));
        localStorage.setItem('flags.loadedAt', String(Date.now()));
        setFlagsLoadedAt(new Date().toLocaleTimeString());
      } catch {}
      const msg = ff.announcement || '';
      const dismissed =
        typeof localStorage !== 'undefined' && localStorage.getItem('announce.dismiss') === msg;
      if (msg && !dismissed) setAnnouncement(msg);
    } catch {}
  }

  function UpgradeBanner() {
    const [pro, setPro] = useState(
      () => typeof localStorage !== 'undefined' && localStorage.getItem('pro') === '1',
    );
    useEffect(() => {
      const onPro = () => setPro(true);
      window.addEventListener('pro-activated', onPro);
      return () => window.removeEventListener('pro-activated', onPro);
    }, []);
    if (pro) return null;
    return (
      <div className="container" style={{ marginTop: 8 }}>
        <div
          className="notice"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>Upgrade to DeepSight Pro for unlimited search and uploads.</span>
          <NavLink to="/pricing" className="btn">
            Upgrade
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Header
        isAdmin={isAdmin}
        onAdminHelp={() => setShowAdminHelp(true)}
        onRefreshFlags={refreshFlags}
        flags={flags}
      />
      {showAdminHelp ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAdminHelp(false)}
        >
          <div
            className="card"
            style={{ background: 'var(--bg)', padding: 16, width: 520, borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Enable Admin Mode</h3>
            <ul className="muted">
              <li>Set a token in your browser: paste below and Save.</li>
              <li>
                Or, set <code>REACT_APP_ADMIN_TOKEN</code> in dev or store an{' '}
                <code>ADMIN_TOKEN</code>
                secret in the Worker for production.
              </li>
            </ul>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <input
                type="password"
                placeholder="Paste admin token"
                style={{ flex: 1, minWidth: 280 }}
                onChange={(e) => {
                  try {
                    localStorage.setItem('admin.token', e.target.value);
                    setIsAdmin(!!e.target.value);
                  } catch {}
                }}
              />
              <button className="btn" onClick={() => setShowAdminHelp(false)}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {announcement ? (
        <div className="container" style={{ marginTop: 8 }}>
          <div
            className="notice"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>{announcement}</span>
            <button
              className="btn ghost"
              onClick={() => {
                try {
                  localStorage.setItem('announce.dismiss', announcement);
                } catch {}
                setAnnouncement('');
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <TitleSync />
      <UpgradeBanner />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/search" element={<SearchPage />} />
        <Route
          path="/upload"
          element={
            flags?.proOnly?.includes?.('upload') ? (
              <ProGate>
                <UploadPage />
              </ProGate>
            ) : (
              <UploadPage />
            )
          }
        />
        <Route
          path="/crawl"
          element={
            flags?.proOnly?.includes?.('crawl') ? (
              <ProGate>
                <CrawlPage />
              </ProGate>
            ) : (
              <CrawlPage />
            )
          }
        />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/admin/flags" element={<AdminFlags />} />
      </Routes>
      <Footer meta={meta} />
    </BrowserRouter>
  );
}
