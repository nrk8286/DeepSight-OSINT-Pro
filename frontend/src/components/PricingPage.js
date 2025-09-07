import React, { useEffect, useRef } from 'react';
import { track } from '../api';
import { useNavigate } from 'react-router-dom';

function loadPayPal(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription`;
    s.async = true;
    s.onload = () => resolve(window.paypal);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function PricingPage() {
  const planId = process.env.REACT_APP_PAYPAL_PLAN_ID;
  const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
  const hostEmail = 'mossy8286@gmail.com';
  const ref = useRef(null);
  const [err, setErr] = React.useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!clientId || !planId) {
        setErr('Payment is not configured yet.');
        return;
      }
      try {
        const paypal = await loadPayPal(clientId);
        if (stop) return;
        if (!paypal || !ref.current) return;
        paypal
          .Buttons({
            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'subscribe' },
            createSubscription: function (data, actions) {
              return actions.subscription.create({ plan_id: planId });
            },
            onApprove: function (data) {
              try {
                localStorage.setItem('pro', '1');
                window.dispatchEvent(new CustomEvent('pro-activated'));
              } catch {}
              try {
                track('subscribe_approve', { sid: data.subscriptionID || data.orderID || '' });
              } catch {}
              const sid = data.subscriptionID || data.orderID || '';
              try {
                navigate(`/thank-you?sid=${encodeURIComponent(sid)}`);
              } catch {
                window.location.href = `/thank-you?sid=${encodeURIComponent(sid)}`;
              }
            },
            onError: function () {
              alert('Payment failed. Please try again.');
            },
          })
          .render(ref.current);
        // ready
      } catch (e) {
        setErr('Failed to load payment widget.');
      }
    })();
    return () => {
      stop = true;
    };
  }, [clientId, planId, navigate]);

  return (
    <div className="container">
      <h2>Plans</h2>
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>DeepSight Pro</h3>
          <p className="muted">Unlimited gallery, search, and uploads for professionals.</p>
          <ul className="muted" style={{ lineHeight: 1.8 }}>
            <li>Fast Cloudflare Worker API</li>
            <li>Secure R2 storage</li>
            <li>Priority support</li>
          </ul>
          {err ? (
            <div className="notice">
              {err} (Owner: {hostEmail})
            </div>
          ) : (
            <div ref={ref} style={{ marginTop: 8 }} />
          )}
          <div style={{ marginTop: 12 }}>
            <a
              className="btn ghost"
              href="https://www.paypal.com/myaccount/autopay/"
              target="_blank"
              rel="noreferrer"
            >
              Manage Subscription
            </a>
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Free</h3>
          <p className="muted">Explore the UI with limited features.</p>
          <div className="notice">No payment required.</div>
        </div>
      </div>
    </div>
  );
}
