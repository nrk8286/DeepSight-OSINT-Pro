import React from 'react';

export default function ThankYouPage() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const sid = params.get('sid');
  return (
    <div className="container">
      <h2>Thank You!</h2>
      <p className="muted">Your DeepSight Pro subscription is now active.</p>
      {sid ? (
        <div className="tag" title={sid}>
          Subscription ID: {sid}
        </div>
      ) : null}
      <div style={{ marginTop: 12 }} className="muted">
        Manage or cancel your subscription anytime in your PayPal account.
      </div>
      <div style={{ marginTop: 8 }}>
        <a
          className="btn ghost"
          href="https://www.paypal.com/myaccount/autopay/"
          target="_blank"
          rel="noreferrer"
        >
          Manage Subscription
        </a>
      </div>
      <div style={{ marginTop: 16 }}>
        <a className="btn" href="/">
          Go to Gallery
        </a>
      </div>
    </div>
  );
}
