import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { ThemeToggle } from './ThemeToggle';
import { Footer } from './Footer';
import {
  DashboardIcon,
  MarketIcon,
  HistoryIcon,
  AdminIcon,
} from './Icons';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/market': 'Market',
  '/history': 'History',
  '/admin': 'Admin simulation',
};

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef(null);

  const currentPath = location.pathname;
  let pageTitle = TITLES[currentPath];
  if (!pageTitle && currentPath.startsWith('/stock/')) {
    const symbol = currentPath.split('/')[2];
    pageTitle = `${symbol} — Stock`;
  }
  if (!pageTitle) pageTitle = 'StockPulse';

  useEffect(() => {
    document.title = `${pageTitle} — StockPulse`;
    if (headingRef.current) {
      headingRef.current.focus();
    }
  }, [pageTitle, currentPath]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon width={18} height={18} /> },
    { to: '/market', label: 'Market', icon: <MarketIcon width={18} height={18} /> },
    { to: '/history', label: 'History', icon: <HistoryIcon width={18} height={18} /> },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/admin', label: 'Admin', icon: <AdminIcon width={18} height={18} /> }]
      : []),
  ];

  return (
    <div className="app-shell-container">
      {/* Desktop / Tablet Sidebar & Rail */}
      <aside className="app-sidebar" aria-label="Main Navigation">
        <div className="sidebar-top">
          <div className="sidebar-brand-wrapper">
            <div className="sidebar-brand">StockPulse</div>
            <div className="sidebar-theme-toggle">
              <ThemeToggle />
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-cash-box">
            <div className="sidebar-cash-label">Cash balance</div>
            <div className="sidebar-cash-val tabular-nums">
              {formatCurrency(user?.cashBalance, { whole: true })}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        <header className="app-header">
          <div className="header-left">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="header-title"
              style={{ outline: 'none', margin: 0 }}
            >
              {pageTitle}
            </h1>
          </div>

          <div className="header-user-nav">
            <div className="header-mobile-theme">
              <ThemeToggle />
            </div>
            <span className="header-user-name">{user?.name || user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="header-logout-btn"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-2)',
                background: 'transparent',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="app-content page-enter">
          <div className="app-content-inner">
            <Outlet />
          </div>

          <Footer style={{ marginTop: 40, borderTop: '1px solid var(--line)' }} />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (< 768px) */}
      <nav className="mobile-tab-bar" aria-label="Mobile Navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-tab-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="mobile-tab-icon">{item.icon}</span>
            <span className="mobile-tab-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
