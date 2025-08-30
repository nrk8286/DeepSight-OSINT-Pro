import React, { useEffect, useState, useCallback } from 'react';
import { listImages, deleteImage } from '../api';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (p = 0, reset = false) => {
      if (busy) return;
      setBusy(true);
      try {
        const out = await listImages(p, 24);
        setHasMore(out.next_page !== null && out.next_page !== undefined);
        setPage(p);
        setItems((prev) => (reset ? out.items : [...prev, ...out.items]));
      } catch (e) {
        alert('Failed to load images');
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  useEffect(() => {
    load(0, true);
  }, [load]);

  const r2url = (r2_key) => `${process.env.REACT_APP_API_ORIGIN}/r2/${encodeURIComponent(r2_key)}`;

  async function remove(id) {
    if (!window.confirm('Delete this image?')) return;
    try {
      await deleteImage(id);
      setItems(items.filter((x) => x.id !== id));
    } catch (e) {
      alert('Delete failed');
    }
  }

  return (
    <div className="container">
      <div className="spaced">
        <h2 style={{ margin: 0 }}>Gallery</h2>
        <div className="muted">Page {page + 1}</div>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        {items.length === 0 && (
          <div className="notice" style={{ gridColumn: '1/-1' }}>
            No images yet. Try the Upload page to add some.
          </div>
        )}
        {items.map((it) => (
          <div className="card" key={it.id}>
            <img src={r2url(it.r2_key)} alt={it.text || 'image'} loading="lazy" />
            <div className="meta">
              <span
                title={it.url}
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60%',
                }}
              >
                {(() => {
                  try {
                    return new URL(it.url).hostname;
                  } catch {
                    return '-';
                  }
                })()}
              </span>
              <div className="toolbar">
                <a className="btn ghost" href={r2url(it.r2_key)} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button
                  className="btn ghost"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(`${window.location.origin}/i/${it.id}`);
                      alert('Link copied');
                    } catch {
                      alert('Copy failed');
                    }
                  }}
                >
                  Copy Link
                </button>
                <button className="btn danger" onClick={() => remove(it.id)}>
                  Delete
                </button>
              </div>
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
