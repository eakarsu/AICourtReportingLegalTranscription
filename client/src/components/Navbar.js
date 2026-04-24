import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const mainLinks = [
  { label: 'Dashboard', path: '/' },
  { label: 'Jobs', path: '/jobs' },
  { label: 'Cases', path: '/cases' },
  { label: 'Transcripts', path: '/transcripts' },
  { label: 'AI Features', path: '/ai', highlight: true },
];

const moreLinks = [
  { label: 'Reporters', path: '/reporters' },
  { label: 'Clients', path: '/clients' },
  { label: 'Billing', path: '/billing' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Payments', path: '/payments' },
  { label: 'Deliveries', path: '/deliveries' },
  { label: 'Exhibits', path: '/exhibits' },
  { label: 'Courts', path: '/courts' },
  { label: 'Contacts', path: '/contacts' },
  { label: 'Equipment', path: '/equipment' },
  { label: 'Certifications', path: '/certifications' },
  { label: 'Scopists', path: '/scopists' },
  { label: 'Proofreaders', path: '/proofreaders' },
  { label: 'Video Sync', path: '/video-sync' },
  { label: 'Realtime', path: '/realtime' },
  { label: 'Archive', path: '/archive' },
  { label: 'Travel', path: '/travel' },
  { label: 'Rush Fees', path: '/rush-fees' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" onClick={closeMobile}>
        CourtReport AI
      </Link>

      <button className="nav-hamburger" onClick={toggleMobile} aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links ${mobileOpen ? 'nav-mobile-open' : ''}`}>
        {mainLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''} ${link.highlight ? 'nav-link-ai' : ''}`}
            onClick={closeMobile}
          >
            {link.label}
          </Link>
        ))}

        <div className="nav-more">
          <button className="nav-link nav-more-btn">
            More <span className="nav-more-arrow">&#9662;</span>
          </button>
          <div className="nav-dropdown">
            {moreLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-dropdown-item ${isActive(link.path) ? 'nav-dropdown-item-active' : ''}`}
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="nav-spacer"></div>

        <div className="nav-user">
          {user.name || user.email || 'User'}
        </div>

        <button className="nav-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
