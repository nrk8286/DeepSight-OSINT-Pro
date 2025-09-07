import React, { useState } from 'react';
import { enqueueCrawl } from '../api';

export default function CrawlPage() {
  const [seed, setSeed] = useState('https://example.com');
  const [depth, setDepth] = useState(1);
  const [tor, setTor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setBusy(true);
    setMsg('queueing...');
    try {
      const out = await enqueueCrawl({ seed, depth, tor });
      setMsg(out?.queued ? 'queued' : 'failed');
    } catch (e) {
      setMsg('failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h2>Crawl</h2>
      <div className="row">
        <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ minWidth: 360 }} />
        <input
          type="number"
          min="0"
          max="5"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        />
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={tor} onChange={(e) => setTor(e.target.checked)} /> Tor
        </label>
        <button className="btn" disabled={busy} onClick={submit}>
          Queue
        </button>
        <span className="muted" style={{ marginLeft: 8 }}>
          {msg}
        </span>
      </div>
    </div>
  );
}
