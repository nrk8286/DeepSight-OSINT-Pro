import React, { useEffect, useState } from 'react';
import { listImages } from '../api';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(0, true);
  }, []);

  const r2url = (r2_key) => `${process.env.REACT_APP_API_ORIGIN}/r2/${encodeURIComponent(r2_key)}`;

  async function load(p, reset = false) {
    if (busy) return;
    setBusy(true);
    try {
      const out = await listImages(p, 24);
      setHasMore(out.next_page !== null && out.next_page !== undefined);
      setPage(p);
      setItems(reset ? out.items : [...items, ...out.items]);
    } catch (e) {
      alert('Failed to load images');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Gallery</h2>
        <div className="muted">Page {page + 1}</div>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        {items.map((it) => (
          <div className="card" key={it.id}>
            <img src={r2url(it.r2_key)} alt="" loading="lazy" />
            <div className="meta">
              <span
                title={it.url}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
              >
                {new URL(it.url).hostname}
              </span>
              <a className="btn" href={r2url(it.r2_key)} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn" disabled={busy || page === 0} onClick={() => load(page - 1, true)}>
          Prev
        </button>
        <button className="btn" disabled={busy || !hasMore} onClick={() => load(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
