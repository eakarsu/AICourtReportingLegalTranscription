import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const featureCards = [
  { title: 'Job Scheduling', route: '/jobs', icon: 'J', color: '#4F46E5', key: 'jobs' },
  { title: 'Court Reporters', route: '/reporters', icon: 'R', color: '#7C3AED', key: 'reporters' },
  { title: 'Law Firm Clients', route: '/clients', icon: 'C', color: '#2563EB', key: 'clients' },
  { title: 'Cases & Matters', route: '/cases', icon: 'M', color: '#DC2626', key: 'cases' },
  { title: 'Transcripts', route: '/transcripts', icon: 'T', color: '#059669', key: 'transcripts' },
  { title: 'Billing', route: '/billing', icon: 'B', color: '#D97706', key: 'billing' },
  { title: 'Deliveries', route: '/deliveries', icon: 'D', color: '#0891B2', key: 'deliveries' },
  { title: 'Exhibits', route: '/exhibits', icon: 'E', color: '#BE185D', key: 'exhibits' },
  { title: 'Video Sync', route: '/video-syncs', icon: 'V', color: '#4338CA', key: 'video_syncs' },
  { title: 'Realtime Connections', route: '/realtime-connections', icon: 'RT', color: '#0D9488', key: 'realtime_connections' },
  { title: 'Scopists', route: '/scopists', icon: 'S', color: '#7C2D12', key: 'scopists' },
  { title: 'Proofreaders', route: '/proofreaders', icon: 'P', color: '#4A1D96', key: 'proofreaders' },
  { title: 'Equipment', route: '/equipment', icon: 'EQ', color: '#92400E', key: 'equipment' },
  { title: 'Certifications', route: '/certifications', icon: 'CE', color: '#1E40AF', key: 'certifications' },
  { title: 'Invoices', route: '/invoices', icon: 'IN', color: '#B45309', key: 'invoices' },
  { title: 'Payments', route: '/payments', icon: 'PA', color: '#047857', key: 'payments' },
  { title: 'Transcript Archive', route: '/transcript-archive', icon: 'AR', color: '#6D28D9', key: 'archive' },
  { title: 'Courts & Venues', route: '/courts', icon: 'CV', color: '#9D174D', key: 'courts' },
  { title: 'Contacts', route: '/contacts', icon: 'CO', color: '#1D4ED8', key: 'contacts' },
  { title: 'Travel Expenses', route: '/travel-expenses', icon: 'TE', color: '#B91C1C', key: 'travel_expenses' },
  { title: 'Rush Fees', route: '/rush-fees', icon: 'RF', color: '#A16207', key: 'rush_fees' },
  { title: 'AI Features', route: '/ai', icon: 'AI', color: '#8B5CF6', key: 'ai' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    jobs: 0,
    reporters: 0,
    clients: 0,
    cases: 0,
    transcripts: 0,
    billing: 0,
    deliveries: 0,
    exhibits: 0,
    video_syncs: 0,
    realtime_connections: 0,
    scopists: 0,
    proofreaders: 0,
    equipment: 0,
    certifications: 0,
    invoices: 0,
    payments: 0,
    archive: 0,
    courts: 0,
    contacts: 0,
    travel_expenses: 0,
    rush_fees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await API.get('/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const totalJobs = stats.jobs || 0;
  const activeCases = stats.cases || 0;
  const pendingInvoices = stats.invoices || 0;
  const totalRevenue = stats.total_revenue || 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome to AI Court Reporting</h1>
        <p>Legal Transcription Service Dashboard</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{loading ? '--' : totalJobs}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{loading ? '--' : activeCases}</div>
          <div className="stat-label">Active Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{loading ? '--' : pendingInvoices}</div>
          <div className="stat-label">Pending Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{loading ? '--' : `$${totalRevenue.toLocaleString()}`}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="features-grid">
        {featureCards.map((card) => (
          <div
            key={card.route}
            className="feature-card"
            onClick={() => navigate(card.route)}
          >
            <div
              className="feature-icon"
              style={{ backgroundColor: card.color }}
            >
              {card.icon}
            </div>
            <div className="feature-title">{card.title}</div>
            <div className="feature-count">
              {loading ? '--' : (stats[card.key] || 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
