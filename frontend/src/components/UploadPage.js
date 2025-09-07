import React, { useState } from 'react';
import { getSignedUpload, uploadToR2, saveImageMeta } from '../api';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState('');
  const [limits] = useState(() => {
    try {
      const s = localStorage.getItem('flags.json');
      if (s) {
        const f = JSON.parse(s);
        return f?.limits || {};
      }
    } catch {}
    return {};
  });
  const isPro = typeof localStorage !== 'undefined' && localStorage.getItem('pro') === '1';

  function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function getDailyCount() {
    try {
      const k = 'upload.count.' + todayKey();
      return parseInt(localStorage.getItem(k) || '0', 10) || 0;
    } catch {
      return 0;
    }
  }
  function incDailyCount() {
    try {
      const k = 'upload.count.' + todayKey();
      localStorage.setItem(k, String(getDailyCount() + 1));
    } catch {}
  }

  async function doUpload() {
    if (!file) return;
    // Soft gates for FREE users
    const freeMax = limits?.free?.maxBytes ?? 1_000_000; // 1MB default
    const freeDaily = limits?.free?.dailyUploads ?? 3;
    if (!isPro) {
      if (file.size > freeMax) {
        setMsg('File too large for free tier.');
        alert('This file exceeds the free tier size limit. Upgrade to Pro for larger uploads.');
        return;
      }
      if (getDailyCount() >= freeDaily) {
        setMsg('Daily upload limit reached.');
        alert('Daily free upload limit reached. Upgrade to Pro for higher limits.');
        return;
      }
    }
    setBusy(true);
    setMsg('uploading...');
    try {
      const key = `uploads/${Date.now()}_${file.name}`;
      const { put, get } = await getSignedUpload(key);
      await uploadToR2(put, file);
      const meta = {
        id: crypto.randomUUID(),
        url: get,
        r2_key: key,
        bytes: file.size,
        text: file.name,
      };
      await saveImageMeta(meta);
      setMsg('done');
      if (!isPro) incDailyCount();
    } catch (e) {
      setMsg('failed');
      alert('upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h2>Upload</h2>
      {!isPro ? (
        <div className="notice" style={{ margin: '8px 0' }}>
          Free tier: up to {(limits?.free?.maxBytes ?? 1_000_000) / 1000000}MB per file and{' '}
          {limits?.free?.dailyUploads ?? 3} uploads/day.{' '}
          <a className="btn ghost" href="/pricing">
            Upgrade
          </a>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          setFile(f);
          setPreview(f ? URL.createObjectURL(f) : '');
        }}
      />
      <button className="btn" disabled={!file || busy} onClick={doUpload} style={{ marginLeft: 8 }}>
        Upload
      </button>
      <span style={{ marginLeft: 8 }} className="muted">
        {msg}
      </span>
      {preview ? (
        <div style={{ marginTop: 12 }}>
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: 320, borderRadius: 12, border: '1px solid var(--border)' }}
          />
        </div>
      ) : null}
    </div>
  );
}
