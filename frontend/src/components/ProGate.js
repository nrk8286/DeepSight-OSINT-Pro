import React from 'react';
import { NavLink } from 'react-router-dom';

export default function ProGate({ children }) {
  const pro = typeof localStorage !== 'undefined' && localStorage.getItem('pro') === '1';
  if (pro) return children;
  return (
    <div className="container">
      <div
        className="notice"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>This feature is available for DeepSight Pro subscribers.</span>
        <NavLink to="/pricing" className="btn">
          Upgrade
        </NavLink>
      </div>
    </div>
  );
}
