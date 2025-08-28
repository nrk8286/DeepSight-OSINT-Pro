import React, { useState } from 'react';
import { searchText } from '../api';

export default function SearchPage() {
  const [q, setQ] = useState('bridge');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);

  const r2url = (k) => `${process.env.REACT_APP_API_ORIGIN}/r2/${encodeURIComponent(k)}`;

  async function go() {
    setBusy(true);
    try {
      const out = await searchText(q, 24);
      const arr = out.matches || out.results || [];
      setResults(arr);
    } catch (e) {
      alert('search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h2>Search</h2>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="query"
          style={{ flex: '0 0 320px' }}
        />
        <button className="btn" onClick={go} disabled={busy} style={{ marginLeft: 8 }}>
          Search
        </button>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        {results.map((r, i) => {
          const m = r?.metadata || r;
          const u = m?.url;
          const k = m?.key || m?.r2_key;
          return (
            <div className="card" key={(m?.id || k || i) + 'k'}>
              {k ? (
                <img src={r2url(k)} alt="" loading="lazy" />
              ) : (
                <div style={{ height: 180, background: '#f3f4f6' }} />
              )}
              <div className="meta">
                <span
                  title={u}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '70%',
                  }}
                >
                  {u ? new URL(u).hostname : '—'}
                </span>
                {u ? (
                  <a className="btn" href={u} target="_blank" rel="noreferrer">
                    Source
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
