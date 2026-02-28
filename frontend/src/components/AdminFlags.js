import React, { useEffect, useState } from 'react';
import { getFlags, track } from '../api';

export default function AdminFlags() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [domains, setDomains] = useState([]);
  const [status, setStatus] = useState({});
  const [stack, setStack] = useState({ kv: false, r2: false, d1: false, analytics: false });
  const apiOrigin = process.env.REACT_APP_API_ORIGIN || '';
  const [copied, setCopied] = useState(false);
  const [ann, setAnn] = useState('');
  const [loadedAt, setLoadedAt] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const f = await getFlags();
        const flags = f?.flags || {};
        setText(JSON.stringify(flags, null, 2));
        setAnn(flags?.announcement || '');
        try {
          setLoadedAt(new Date().toLocaleTimeString());
        } catch {}
        const ds =
          Array.isArray(flags.domains) && flags.domains.length
            ? flags.domains
            : [process.env.REACT_APP_API_ORIGIN, window.location.origin].filter(Boolean);
        setDomains(ds);
        // kick off checks
        checkDomains(ds);
      } catch {
        setText('{}');
      }
      // fetch stack status
      try {
        const r = await fetch(`${process.env.REACT_APP_API_ORIGIN}/api/status`, {
          headers: { accept: 'application/json' },
        });
        if (r.ok) {
          const j = await r.json();
          setStack(j?.info || {});
        }
      } catch {}
    })();
  }, []);

  async function checkDomains(ds) {
    const out = {};
    await Promise.all(
      ds.map(async (d) => {
        try {
          const url = d.replace(/\/$/, '');
          if (/\bapi\./.test(url)) {
            const r = await fetch(`${url}/api/health`, { headers: { accept: 'application/json' } });
            out[url] = r.ok ? 'ok' : `err:${r.status}`;
          } else {
            // best-effort check for pages: logo.svg no-cors
            await fetch(`${url}/logo.svg`, { mode: 'no-cors' });
            out[url] = 'ok';
          }
        } catch (e) {
          out[d] = 'err';
        }
      }),
    );
    setStatus(out);
  }

  async function refreshFlags() {
    setMsg('refreshing flags...');
    try {
      const f = await getFlags();
      const flags = f?.flags || {};
      setText(JSON.stringify(flags, null, 2));
      setAnn(flags?.announcement || '');
      try {
        setLoadedAt(new Date().toLocaleTimeString());
      } catch {}
      try {
        localStorage.setItem('flags.json', JSON.stringify(flags));
      } catch {}
      setMsg('flags refreshed');
    } catch (e) {
      setMsg('failed to refresh flags');
    }
  }

  function updateAnnouncement(next) {
    setAnn(next);
    try {
      const obj = JSON.parse(text || '{}') || {};
      obj.announcement = next || '';
      setText(JSON.stringify(obj, null, 2));
    } catch {}
  }

  async function save() {
    setMsg('saving...');
    try {
      const body = JSON.parse(text || '{}');
      const token =
        (typeof localStorage !== 'undefined' && localStorage.getItem('admin.token')) ||
        process.env.REACT_APP_ADMIN_TOKEN ||
        '';
      const r = await fetch(`${process.env.REACT_APP_API_ORIGIN}/api/flags`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ flags: body }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsg('saved');
      try {
        localStorage.setItem('flags.json', JSON.stringify(body));
      } catch {}
      try {
        track('admin_flags_save', { size: (text || '').length });
      } catch {}
      // refresh domain list on save
      try {
        const ds =
          Array.isArray(body.domains) && body.domains.length
            ? body.domains
            : [process.env.REACT_APP_API_ORIGIN, window.location.origin].filter(Boolean);
        setDomains(ds);
        checkDomains(ds);
      } catch {}
    } catch (e) {
      setMsg('failed');
      alert('Save failed. Ensure ADMIN token is set and JSON is valid.');
    }
  }

  return (
    <div className="container">
      <h2>Admin Flags</h2>
      <div className="muted">
        Requires ADMIN token. In dev, set REACT_APP_ADMIN_TOKEN and ADMIN_TOKEN.
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Service Info</strong>
          </div>
          {loadedAt ? (
            <div className="muted" style={{ marginTop: 4 }}>
              Flags loaded at {loadedAt}
            </div>
          ) : null}
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">API Origin</span>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span
                  className="muted"
                  style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={apiOrigin}
                >
                  {apiOrigin || '-'}
                </span>
                <button
                  className="btn ghost"
                  title="Copy API URL"
                  onClick={async () => {
                    try {
                      if (apiOrigin) {
                        await navigator.clipboard.writeText(apiOrigin);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }
                    } catch {}
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Announcement</strong>
            <button
              className="btn ghost"
              onClick={() => updateAnnouncement('')}
              title="Clear announcement"
            >
              Clear
            </button>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="Banner message shown on load"
              value={ann}
              onChange={(e) => updateAnnouncement(e.target.value)}
              style={{ flex: 1, minWidth: 280 }}
            />
            <span className="muted">Edit and click Save below to persist.</span>
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Stack Status</strong>
            <span className="muted">Worker bindings</span>
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">KV</span>
              <span className="tag">{stack.kv ? 'ok' : 'off'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">D1</span>
              <span className="tag">{stack.d1 ? 'ok' : 'off'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">R2</span>
              <span className="tag">{stack.r2 ? 'ok' : 'off'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Analytics</span>
              <span className="tag">{stack.analytics ? 'ok' : 'off'}</span>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Domains</strong>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn ghost"
                onClick={refreshFlags}
                title="Reload feature flags from KV"
              >
                Refresh Flags
              </button>
              <button
                className="btn ghost"
                onClick={() => checkDomains(domains)}
                title="Recheck endpoints"
              >
                Recheck
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {domains.map((d) => (
              <div key={d} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{d}</span>
                <span className="tag">{status[d] || '...'}</span>
              </div>
            ))}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn ghost"
                onClick={() => {
                  try {
                    const cur = JSON.parse(text || '{}') || {};
                    const sugg = [process.env.REACT_APP_API_ORIGIN, window.location.origin].filter(
                      Boolean,
                    );
                    cur.domains = sugg;
                    const next = JSON.stringify(cur, null, 2);
                    setText(next);
                    setDomains(sugg);
                    checkDomains(sugg);
                  } catch {
                    alert('Could not update domains in JSON');
                  }
                }}
              >
                Use Suggested
              </button>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <strong>Flags Summary</strong>
          <div className="row" style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {(() => {
              try {
                const f = JSON.parse(text || '{}') || {};
                const rl = f?.rateLimit || {};
                const lim = f?.limits?.free || {};
                return (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">Pro-only</span>
                      <span className="tag">
                        {Array.isArray(f.proOnly) ? f.proOnly.join(', ') || '-' : '-'}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">Search RL</span>
                      <span className="tag">
                        {rl.search
                          ? `${rl.search.limit || '-'}/${rl.search.windowSec || '-'}s`
                          : '-'}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">Upload RL</span>
                      <span className="tag">
                        {rl.upload
                          ? `${rl.upload.limit || '-'}/${rl.upload.windowSec || '-'}s`
                          : '-'}
                      </span>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="muted">Free Limits</span>
                      <span className="tag">
                        {lim.maxBytes ? `${Math.round(lim.maxBytes / 1e6)}MB` : '-'} ·{' '}
                        {lim.dailyUploads ?? '-'} / day
                      </span>
                    </div>
                  </div>
                );
              } catch {
                return <div className="muted">Invalid JSON</div>;
              }
            })()}
          </div>
        </div>
        <div className="row">
          <input
            type="password"
            placeholder="Admin token"
            style={{ minWidth: 280 }}
            onChange={(e) => {
              try {
                localStorage.setItem('admin.token', e.target.value);
              } catch {}
            }}
          />
          <span className="muted">Token saved locally for this browser.</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          style={{
            width: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            background: 'var(--card)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 12,
          }}
        />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">
            Example:{' '}
            {`{"announcement":"New model!","proOnly":["crawl"],"limits":{"free":{"maxBytes":1000000,"dailyUploads":3}}}`}
          </span>
          <button className="btn" onClick={save}>
            Save
          </button>
        </div>
        <div className="muted">{msg}</div>
      </div>
    </div>
  );
}
