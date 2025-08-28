import React, { useState } from 'react';
import { getSignedUpload, uploadToR2, saveImageMeta } from '../api';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function doUpload() {
    if (!file) return;
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
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button className="btn" disabled={!file || busy} onClick={doUpload} style={{ marginLeft: 8 }}>
        Upload
      </button>
      <span style={{ marginLeft: 8 }} className="muted">
        {msg}
      </span>
    </div>
  );
}
