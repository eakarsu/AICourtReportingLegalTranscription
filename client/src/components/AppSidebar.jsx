import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/insights/timeline', label: 'Timeline View', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/jobs', label: 'Jobs', group: 'Workspace' },
  { to: '/reporters', label: 'Reporters', group: 'Workspace' },
  { to: '/clients', label: 'Clients', group: 'Workspace' },
  { to: '/cases', label: 'Cases', group: 'Workspace' },
  { to: '/transcripts', label: 'Transcripts', group: 'Workspace' },
  { to: '/billing', label: 'Billing', group: 'Workspace' },
  { to: '/deliveries', label: 'Deliveries', group: 'Workspace' },
  { to: '/exhibits', label: 'Exhibits', group: 'Workspace' },
  { to: '/video-syncs', label: 'Video Syncs', group: 'Workspace' },
  { to: '/realtime-connections', label: 'Realtime Connections', group: 'Workspace' },
  { to: '/scopists', label: 'Scopists', group: 'Workspace' },
  { to: '/proofreaders', label: 'Proofreaders', group: 'Workspace' },
  { to: '/equipment', label: 'Equipment', group: 'Workspace' },
  { to: '/certifications', label: 'Certifications', group: 'Workspace' },
  { to: '/invoices', label: 'Invoices', group: 'Workspace' },
  { to: '/payments', label: 'Payments', group: 'Workspace' },
  { to: '/transcript-archive', label: 'Transcript Archive', group: 'Workspace' },
  { to: '/courts', label: 'Courts', group: 'Workspace' },
  { to: '/contacts', label: 'Contacts', group: 'Workspace' },
  { to: '/travel-expenses', label: 'Travel Expenses', group: 'Workspace' },
  { to: '/rush-fees', label: 'Rush Fees', group: 'Workspace' },
  { to: '/ai', label: 'AI Features', group: 'Workspace' },
  { to: '/ai-new', label: 'AI Features New', group: 'AI tools' },
  { to: '/realtime-rough-draft-qc', label: 'Realtime Rough Draft Qc', group: 'Workspace' },
  { to: '/cf/predictive-case-complexity-scoring', label: 'Cf Predictive Case Complexity Scoring', group: 'Workspace' },
  { to: '/cf/automated-exhibit-extraction', label: 'Cf Automated Exhibit Extraction', group: 'Workspace' },
  { to: '/cf/precedent-deposition-search', label: 'Cf Precedent Deposition Search', group: 'Workspace' },
  { to: '/cf/court-filing-automation', label: 'Cf Court Filing Automation', group: 'Workspace' },
  { to: '/cf/reporter-wellness-utilization', label: 'Cf Reporter Wellness Utilization', group: 'Workspace' },
  { to: '/gap/cases-lacks-analyze-case-timeline-or-predict-deposition-need', label: 'Gap Cases Lacks Analyze Case Timeline Or Predict Deposition Need', group: 'Workspace' },
  { to: '/gap/deliveries-lacks-optimize-delivery-routing', label: 'Gap Deliveries Lacks Optimize Delivery Routing', group: 'Workspace' },
  { to: '/gap/exhibits-lacks-extract-exhibit-metadata-or-analyze-exhibit-r', label: 'Gap Exhibits Lacks Extract Exhibit Metadata Or Analyze Exhibit R', group: 'Workspace' },
  { to: '/gap/videosyncs-lacks-ai-driven-audio-video-alignment', label: 'Gap Videosyncs Lacks Ai Driven Audio Video Alignment', group: 'Workspace' },
  { to: '/gap/limited-integration-with-court-calendars-legal-research-lexi', label: 'Gap Limited Integration With Court Calendars Legal Research Lexi', group: 'Workspace' },
  { to: '/gap/no-secure-cloud-vault-for-sensitive-transcripts', label: 'Gap No Secure Cloud Vault For Sensitive Transcripts', group: 'Workspace' },
  { to: '/gap/no-continuing-education-tracking-layered-on-certifications', label: 'Gap No Continuing Education Tracking Layered On Certifications', group: 'Workspace' },
  { to: '/gap/no-webhooks-or-notification-system', label: 'Gap No Webhooks Or Notification System', group: 'Workspace' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AICourt Reporting Legal Transcription</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
