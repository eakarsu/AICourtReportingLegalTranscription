import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIFeaturesPage from './pages/AIFeaturesPage';
import AIFeaturesNewPage from './pages/AIFeaturesNewPage';
import RealtimeRoughDraftQc from './pages/RealtimeRoughDraftQc';
import Navbar from './components/Navbar';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfPredictiveCaseComplexityScoring from './pages/CfPredictiveCaseComplexityScoring';
import CfAutomatedExhibitExtraction from './pages/CfAutomatedExhibitExtraction';
import CfPrecedentDepositionSearch from './pages/CfPrecedentDepositionSearch';
import CfCourtFilingAutomation from './pages/CfCourtFilingAutomation';
import CfReporterWellnessUtilization from './pages/CfReporterWellnessUtilization';
import GapCasesLacksAnalyzeCaseTimelineOrPredictDepositionNeed from './pages/GapCasesLacksAnalyzeCaseTimelineOrPredictDepositionNeed';
import GapDeliveriesLacksOptimizeDeliveryRouting from './pages/GapDeliveriesLacksOptimizeDeliveryRouting';
import GapExhibitsLacksExtractExhibitMetadataOrAnalyzeExhibitR from './pages/GapExhibitsLacksExtractExhibitMetadataOrAnalyzeExhibitR';
import GapVideosyncsLacksAiDrivenAudioVideoAlignment from './pages/GapVideosyncsLacksAiDrivenAudioVideoAlignment';
import GapLimitedIntegrationWithCourtCalendarsLegalResearchLexi from './pages/GapLimitedIntegrationWithCourtCalendarsLegalResearchLexi';
import GapNoSecureCloudVaultForSensitiveTranscripts from './pages/GapNoSecureCloudVaultForSensitiveTranscripts';
import GapNoContinuingEducationTrackingLayeredOnCertifications from './pages/GapNoContinuingEducationTrackingLayeredOnCertifications';
import GapNoWebhooksOrNotificationSystem from './pages/GapNoWebhooksOrNotificationSystem';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

// ── Feature Configurations ──────────────────────────────────────────────────

const jobsConfig = {
  title: 'Jobs',
  endpoint: '/jobs',
  columns: [
    { key: 'case_name', label: 'Case Name' },
    { key: 'case_number', label: 'Case Number' },
    { key: 'job_type', label: 'Job Type' },
    { key: 'date_scheduled', label: 'Date Scheduled' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'case_name', label: 'Case Name', type: 'text' },
    { key: 'case_number', label: 'Case Number', type: 'text' },
    { key: 'job_type', label: 'Job Type', type: 'select', options: [
      { value: 'deposition', label: 'Deposition' },
      { value: 'hearing', label: 'Hearing' },
      { value: 'trial', label: 'Trial' },
    ]},
    { key: 'date_scheduled', label: 'Date Scheduled', type: 'date' },
    { key: 'time_scheduled', label: 'Time Scheduled', type: 'text' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { key: 'court_reporter_id', label: 'Court Reporter ID', type: 'number' },
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const reportersConfig = {
  title: 'Reporters',
  endpoint: '/reporters',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'certification', label: 'Certification' },
    { key: 'availability_status', label: 'Availability' },
    { key: 'hourly_rate', label: 'Hourly Rate' },
  ],
  formFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'certification', label: 'Certification', type: 'select', options: [
      { value: 'RPR', label: 'RPR' },
      { value: 'RMR', label: 'RMR' },
      { value: 'CRR', label: 'CRR' },
      { value: 'CLVS', label: 'CLVS' },
    ]},
    { key: 'availability_status', label: 'Availability Status', type: 'select', options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'unavailable', label: 'Unavailable' },
    ]},
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'number' },
    { key: 'specialization', label: 'Specialization', type: 'text' },
    { key: 'years_experience', label: 'Years of Experience', type: 'number' },
    { key: 'address', label: 'Address', type: 'text' },
  ],
};

const clientsConfig = {
  title: 'Clients',
  endpoint: '/clients',
  columns: [
    { key: 'firm_name', label: 'Firm Name' },
    { key: 'contact_name', label: 'Contact Name' },
    { key: 'email', label: 'Email' },
    { key: 'payment_terms', label: 'Payment Terms' },
    { key: 'account_status', label: 'Account Status' },
  ],
  formFields: [
    { key: 'firm_name', label: 'Firm Name', type: 'text' },
    { key: 'contact_name', label: 'Contact Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'billing_address', label: 'Billing Address', type: 'text' },
    { key: 'payment_terms', label: 'Payment Terms', type: 'select', options: [
      { value: 'Net 15', label: 'Net 15' },
      { value: 'Net 30', label: 'Net 30' },
      { value: 'Net 45', label: 'Net 45' },
      { value: 'Net 60', label: 'Net 60' },
    ]},
    { key: 'account_status', label: 'Account Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'suspended', label: 'Suspended' },
    ]},
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const casesConfig = {
  title: 'Cases',
  endpoint: '/cases',
  columns: [
    { key: 'case_number', label: 'Case Number' },
    { key: 'case_name', label: 'Case Name' },
    { key: 'court', label: 'Court' },
    { key: 'case_type', label: 'Case Type' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'case_number', label: 'Case Number', type: 'text' },
    { key: 'case_name', label: 'Case Name', type: 'text' },
    { key: 'court', label: 'Court', type: 'text' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
    { key: 'case_type', label: 'Case Type', type: 'select', options: [
      { value: 'civil', label: 'Civil' },
      { value: 'criminal', label: 'Criminal' },
      { value: 'family', label: 'Family' },
      { value: 'bankruptcy', label: 'Bankruptcy' },
      { value: 'appellate', label: 'Appellate' },
    ]},
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'closed', label: 'Closed' },
      { value: 'pending', label: 'Pending' },
      { value: 'settled', label: 'Settled' },
    ]},
    { key: 'filing_date', label: 'Filing Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const transcriptsConfig = {
  title: 'Transcripts',
  endpoint: '/transcripts',
  columns: [
    { key: 'job_id', label: 'Job ID' },
    { key: 'case_id', label: 'Case ID' },
    { key: 'page_count', label: 'Page Count' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'case_id', label: 'Case ID', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'rough', label: 'Rough' },
      { value: 'edited', label: 'Edited' },
      { value: 'final', label: 'Final' },
      { value: 'certified', label: 'Certified' },
    ]},
    { key: 'page_count', label: 'Page Count', type: 'number' },
    { key: 'reporter_id', label: 'Reporter ID', type: 'number' },
    { key: 'scopist_id', label: 'Scopist ID', type: 'number' },
    { key: 'proofreader_id', label: 'Proofreader ID', type: 'number' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'completed_date', label: 'Completed Date', type: 'date' },
    { key: 'file_path', label: 'File Path', type: 'text' },
  ],
};

const billingConfig = {
  title: 'Billing',
  endpoint: '/billing',
  columns: [
    { key: 'client_id', label: 'Client ID' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'transcript_id', label: 'Transcript ID', type: 'number' },
    { key: 'page_rate', label: 'Page Rate', type: 'number' },
    { key: 'page_count', label: 'Page Count', type: 'number' },
    { key: 'base_amount', label: 'Base Amount', type: 'number' },
    { key: 'rush_fee', label: 'Rush Fee', type: 'number' },
    { key: 'expedite_fee', label: 'Expedite Fee', type: 'number' },
    { key: 'total_amount', label: 'Total Amount', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
    ]},
    { key: 'due_date', label: 'Due Date', type: 'date' },
  ],
};

const deliveriesConfig = {
  title: 'Deliveries',
  endpoint: '/deliveries',
  columns: [
    { key: 'transcript_id', label: 'Transcript ID' },
    { key: 'delivery_type', label: 'Delivery Type' },
    { key: 'recipient_name', label: 'Recipient' },
    { key: 'delivery_date', label: 'Delivery Date' },
    { key: 'delivery_status', label: 'Status' },
  ],
  formFields: [
    { key: 'transcript_id', label: 'Transcript ID', type: 'number' },
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'delivery_type', label: 'Delivery Type', type: 'select', options: [
      { value: 'electronic', label: 'Electronic' },
      { value: 'paper', label: 'Paper' },
      { value: 'both', label: 'Both' },
    ]},
    { key: 'delivery_status', label: 'Delivery Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_transit', label: 'In Transit' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'returned', label: 'Returned' },
    ]},
    { key: 'tracking_number', label: 'Tracking Number', type: 'text' },
    { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
    { key: 'recipient_name', label: 'Recipient Name', type: 'text' },
    { key: 'recipient_email', label: 'Recipient Email', type: 'email' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const exhibitsConfig = {
  title: 'Exhibits',
  endpoint: '/exhibits',
  columns: [
    { key: 'exhibit_number', label: 'Exhibit Number' },
    { key: 'description', label: 'Description' },
    { key: 'exhibit_type', label: 'Type' },
    { key: 'marked_by', label: 'Marked By' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'exhibit_number', label: 'Exhibit Number', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'exhibit_type', label: 'Exhibit Type', type: 'select', options: [
      { value: 'document', label: 'Document' },
      { value: 'photo', label: 'Photo' },
      { value: 'video', label: 'Video' },
      { value: 'audio', label: 'Audio' },
      { value: 'physical', label: 'Physical' },
    ]},
    { key: 'file_path', label: 'File Path', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'marked', label: 'Marked' },
      { value: 'admitted', label: 'Admitted' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'withdrawn', label: 'Withdrawn' },
    ]},
    { key: 'marked_by', label: 'Marked By', type: 'text' },
  ],
};

const videoSyncsConfig = {
  title: 'Video Syncs',
  endpoint: '/video-syncs',
  columns: [
    { key: 'job_id', label: 'Job ID' },
    { key: 'transcript_id', label: 'Transcript ID' },
    { key: 'technician', label: 'Technician' },
    { key: 'duration', label: 'Duration' },
    { key: 'sync_status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'transcript_id', label: 'Transcript ID', type: 'number' },
    { key: 'video_file', label: 'Video File', type: 'text' },
    { key: 'sync_status', label: 'Sync Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
    ]},
    { key: 'start_timecode', label: 'Start Timecode', type: 'text' },
    { key: 'end_timecode', label: 'End Timecode', type: 'text' },
    { key: 'duration', label: 'Duration', type: 'text' },
    { key: 'technician', label: 'Technician', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const realtimeConnectionsConfig = {
  title: 'Realtime Connections',
  endpoint: '/realtime-connections',
  columns: [
    { key: 'job_id', label: 'Job ID' },
    { key: 'connection_type', label: 'Connection Type' },
    { key: 'client_name', label: 'Client Name' },
    { key: 'software', label: 'Software' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'reporter_id', label: 'Reporter ID', type: 'number' },
    { key: 'connection_type', label: 'Connection Type', type: 'select', options: [
      { value: 'internet', label: 'Internet' },
      { value: 'direct', label: 'Direct' },
    ]},
    { key: 'ip_address', label: 'IP Address', type: 'text' },
    { key: 'port', label: 'Port', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'standby', label: 'Standby' },
    ]},
    { key: 'client_name', label: 'Client Name', type: 'text' },
    { key: 'software', label: 'Software', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const scopistsConfig = {
  title: 'Scopists',
  endpoint: '/scopists',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'rate_per_page', label: 'Rate Per Page' },
    { key: 'availability_status', label: 'Availability' },
  ],
  formFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'specialization', label: 'Specialization', type: 'text' },
    { key: 'rate_per_page', label: 'Rate Per Page', type: 'number' },
    { key: 'availability_status', label: 'Availability Status', type: 'select', options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'unavailable', label: 'Unavailable' },
    ]},
    { key: 'turnaround_days', label: 'Turnaround Days', type: 'number' },
    { key: 'experience_years', label: 'Experience (Years)', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const proofreadersConfig = {
  title: 'Proofreaders',
  endpoint: '/proofreaders',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'rate_per_page', label: 'Rate Per Page' },
    { key: 'availability_status', label: 'Availability' },
  ],
  formFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'specialization', label: 'Specialization', type: 'text' },
    { key: 'rate_per_page', label: 'Rate Per Page', type: 'number' },
    { key: 'availability_status', label: 'Availability Status', type: 'select', options: [
      { value: 'available', label: 'Available' },
      { value: 'busy', label: 'Busy' },
      { value: 'unavailable', label: 'Unavailable' },
    ]},
    { key: 'turnaround_days', label: 'Turnaround Days', type: 'number' },
    { key: 'accuracy_rating', label: 'Accuracy Rating', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const equipmentConfig = {
  title: 'Equipment',
  endpoint: '/equipment',
  columns: [
    { key: 'equipment_type', label: 'Type' },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'equipment_type', label: 'Equipment Type', type: 'select', options: [
      { value: 'stenograph', label: 'Stenograph' },
      { value: 'audio', label: 'Audio' },
      { value: 'video', label: 'Video' },
      { value: 'accessories', label: 'Accessories' },
    ]},
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'serial_number', label: 'Serial Number', type: 'text' },
    { key: 'assigned_to', label: 'Assigned To', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'available', label: 'Available' },
      { value: 'in_use', label: 'In Use' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'retired', label: 'Retired' },
    ]},
    { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
    { key: 'last_maintenance', label: 'Last Maintenance', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const certificationsConfig = {
  title: 'Certifications',
  endpoint: '/certifications',
  columns: [
    { key: 'reporter_id', label: 'Reporter ID' },
    { key: 'certification_type', label: 'Certification Type' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'reporter_id', label: 'Reporter ID', type: 'number' },
    { key: 'certification_type', label: 'Certification Type', type: 'select', options: [
      { value: 'RPR', label: 'RPR' },
      { value: 'RMR', label: 'RMR' },
      { value: 'CRR', label: 'CRR' },
      { value: 'CLVS', label: 'CLVS' },
    ]},
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { key: 'ce_credits_required', label: 'CE Credits Required', type: 'number' },
    { key: 'ce_credits_completed', label: 'CE Credits Completed', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending_renewal', label: 'Pending Renewal' },
    ]},
    { key: 'issuing_body', label: 'Issuing Body', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const invoicesConfig = {
  title: 'Invoices',
  endpoint: '/invoices',
  columns: [
    { key: 'invoice_number', label: 'Invoice Number' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'total', label: 'Total' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'invoice_number', label: 'Invoice Number', type: 'text' },
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'billing_id', label: 'Billing ID', type: 'number' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'tax', label: 'Tax', type: 'number' },
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { key: 'issue_date', label: 'Issue Date', type: 'date' },
    { key: 'due_date', label: 'Due Date', type: 'date' },
    { key: 'paid_date', label: 'Paid Date', type: 'date' },
    { key: 'narrative', label: 'Narrative', type: 'textarea' },
  ],
};

const paymentsConfig = {
  title: 'Payments',
  endpoint: '/payments',
  columns: [
    { key: 'invoice_id', label: 'Invoice ID' },
    { key: 'amount', label: 'Amount' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'invoice_id', label: 'Invoice ID', type: 'number' },
    { key: 'client_id', label: 'Client ID', type: 'number' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'payment_method', label: 'Payment Method', type: 'select', options: [
      { value: 'check', label: 'Check' },
      { value: 'wire', label: 'Wire' },
      { value: 'ach', label: 'ACH' },
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'cash', label: 'Cash' },
    ]},
    { key: 'payment_date', label: 'Payment Date', type: 'date' },
    { key: 'reference_number', label: 'Reference Number', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
      { value: 'refunded', label: 'Refunded' },
    ]},
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const transcriptArchiveConfig = {
  title: 'Transcript Archive',
  endpoint: '/transcript-archive',
  columns: [
    { key: 'case_number', label: 'Case Number' },
    { key: 'case_name', label: 'Case Name' },
    { key: 'archived_date', label: 'Archived Date' },
    { key: 'access_level', label: 'Access Level' },
    { key: 'storage_location', label: 'Storage Location' },
  ],
  formFields: [
    { key: 'transcript_id', label: 'Transcript ID', type: 'number' },
    { key: 'case_number', label: 'Case Number', type: 'text' },
    { key: 'case_name', label: 'Case Name', type: 'text' },
    { key: 'archived_date', label: 'Archived Date', type: 'date' },
    { key: 'storage_location', label: 'Storage Location', type: 'text' },
    { key: 'retention_until', label: 'Retention Until', type: 'date' },
    { key: 'access_level', label: 'Access Level', type: 'select', options: [
      { value: 'public', label: 'Public' },
      { value: 'restricted', label: 'Restricted' },
      { value: 'confidential', label: 'Confidential' },
    ]},
    { key: 'file_size', label: 'File Size', type: 'text' },
    { key: 'checksum', label: 'Checksum', type: 'text' },
  ],
};

const courtsConfig = {
  title: 'Courts',
  endpoint: '/courts',
  columns: [
    { key: 'court_name', label: 'Court Name' },
    { key: 'court_type', label: 'Court Type' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'clerk_name', label: 'Clerk Name' },
  ],
  formFields: [
    { key: 'court_name', label: 'Court Name', type: 'text' },
    { key: 'court_type', label: 'Court Type', type: 'select', options: [
      { value: 'federal', label: 'Federal' },
      { value: 'state', label: 'State' },
      { value: 'county', label: 'County' },
      { value: 'municipal', label: 'Municipal' },
      { value: 'appellate', label: 'Appellate' },
    ]},
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'zip', label: 'ZIP', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'clerk_name', label: 'Clerk Name', type: 'text' },
    { key: 'clerk_phone', label: 'Clerk Phone', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const contactsConfig = {
  title: 'Contacts',
  endpoint: '/contacts',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'contact_type', label: 'Contact Type' },
    { key: 'firm', label: 'Firm' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
  ],
  formFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'contact_type', label: 'Contact Type', type: 'select', options: [
      { value: 'attorney', label: 'Attorney' },
      { value: 'witness', label: 'Witness' },
      { value: 'expert', label: 'Expert' },
      { value: 'paralegal', label: 'Paralegal' },
      { value: 'judge', label: 'Judge' },
      { value: 'clerk', label: 'Clerk' },
    ]},
    { key: 'firm', label: 'Firm', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'bar_number', label: 'Bar Number', type: 'text' },
    { key: 'specialty', label: 'Specialty', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

const travelExpensesConfig = {
  title: 'Travel Expenses',
  endpoint: '/travel-expenses',
  columns: [
    { key: 'job_id', label: 'Job ID' },
    { key: 'expense_type', label: 'Expense Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'date_incurred', label: 'Date Incurred' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'reporter_id', label: 'Reporter ID', type: 'number' },
    { key: 'expense_type', label: 'Expense Type', type: 'select', options: [
      { value: 'mileage', label: 'Mileage' },
      { value: 'airfare', label: 'Airfare' },
      { value: 'hotel', label: 'Hotel' },
      { value: 'meals', label: 'Meals' },
      { value: 'parking', label: 'Parking' },
      { value: 'other', label: 'Other' },
    ]},
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'date_incurred', label: 'Date Incurred', type: 'date' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'receipt_path', label: 'Receipt Path', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'reimbursed', label: 'Reimbursed' },
      { value: 'denied', label: 'Denied' },
    ]},
  ],
};

const rushFeesConfig = {
  title: 'Rush Fees',
  endpoint: '/rush-fees',
  columns: [
    { key: 'job_id', label: 'Job ID' },
    { key: 'fee_type', label: 'Fee Type' },
    { key: 'fee_amount', label: 'Fee Amount' },
    { key: 'requested_by', label: 'Requested By' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'job_id', label: 'Job ID', type: 'number' },
    { key: 'transcript_id', label: 'Transcript ID', type: 'number' },
    { key: 'fee_type', label: 'Fee Type', type: 'select', options: [
      { value: 'rush', label: 'Rush' },
      { value: 'expedite', label: 'Expedite' },
      { value: 'daily_copy', label: 'Daily Copy' },
      { value: 'realtime', label: 'Realtime' },
    ]},
    { key: 'multiplier', label: 'Multiplier', type: 'number' },
    { key: 'base_amount', label: 'Base Amount', type: 'number' },
    { key: 'fee_amount', label: 'Fee Amount', type: 'number' },
    { key: 'requested_by', label: 'Requested By', type: 'text' },
    { key: 'approved_by', label: 'Approved By', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'denied', label: 'Denied' },
      { value: 'waived', label: 'Waived' },
    ]},
  ],
};

// ── App Component ───────────────────────────────────────────────────────────

function App() {
  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/jobs" element={<ProtectedRoute><FeaturePage {...jobsConfig} /></ProtectedRoute>} />
        <Route path="/reporters" element={<ProtectedRoute><FeaturePage {...reportersConfig} /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><FeaturePage {...clientsConfig} /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute><FeaturePage {...casesConfig} /></ProtectedRoute>} />
        <Route path="/transcripts" element={<ProtectedRoute><FeaturePage {...transcriptsConfig} /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute><FeaturePage {...billingConfig} /></ProtectedRoute>} />
        <Route path="/deliveries" element={<ProtectedRoute><FeaturePage {...deliveriesConfig} /></ProtectedRoute>} />
        <Route path="/exhibits" element={<ProtectedRoute><FeaturePage {...exhibitsConfig} /></ProtectedRoute>} />
        <Route path="/video-syncs" element={<ProtectedRoute><FeaturePage {...videoSyncsConfig} /></ProtectedRoute>} />
        <Route path="/realtime-connections" element={<ProtectedRoute><FeaturePage {...realtimeConnectionsConfig} /></ProtectedRoute>} />
        <Route path="/scopists" element={<ProtectedRoute><FeaturePage {...scopistsConfig} /></ProtectedRoute>} />
        <Route path="/proofreaders" element={<ProtectedRoute><FeaturePage {...proofreadersConfig} /></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><FeaturePage {...equipmentConfig} /></ProtectedRoute>} />
        <Route path="/certifications" element={<ProtectedRoute><FeaturePage {...certificationsConfig} /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><FeaturePage {...invoicesConfig} /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><FeaturePage {...paymentsConfig} /></ProtectedRoute>} />
        <Route path="/transcript-archive" element={<ProtectedRoute><FeaturePage {...transcriptArchiveConfig} /></ProtectedRoute>} />
        <Route path="/courts" element={<ProtectedRoute><FeaturePage {...courtsConfig} /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><FeaturePage {...contactsConfig} /></ProtectedRoute>} />
        <Route path="/travel-expenses" element={<ProtectedRoute><FeaturePage {...travelExpensesConfig} /></ProtectedRoute>} />
        <Route path="/rush-fees" element={<ProtectedRoute><FeaturePage {...rushFeesConfig} /></ProtectedRoute>} />

        <Route path="/ai" element={<ProtectedRoute><AIFeaturesPage /></ProtectedRoute>} />
        <Route path="/ai-new" element={<ProtectedRoute><AIFeaturesNewPage /></ProtectedRoute>} />
        <Route path="/realtime-rough-draft-qc" element={<ProtectedRoute><RealtimeRoughDraftQc /></ProtectedRoute>} />
      
        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/predictive-case-complexity-scoring" element={<CfPredictiveCaseComplexityScoring />} />
        <Route path="/cf/automated-exhibit-extraction" element={<CfAutomatedExhibitExtraction />} />
        <Route path="/cf/precedent-deposition-search" element={<CfPrecedentDepositionSearch />} />
        <Route path="/cf/court-filing-automation" element={<CfCourtFilingAutomation />} />
        <Route path="/cf/reporter-wellness-utilization" element={<CfReporterWellnessUtilization />} />
        <Route path="/gap/cases-lacks-analyze-case-timeline-or-predict-deposition-need" element={<GapCasesLacksAnalyzeCaseTimelineOrPredictDepositionNeed />} />
        <Route path="/gap/deliveries-lacks-optimize-delivery-routing" element={<GapDeliveriesLacksOptimizeDeliveryRouting />} />
        <Route path="/gap/exhibits-lacks-extract-exhibit-metadata-or-analyze-exhibit-r" element={<GapExhibitsLacksExtractExhibitMetadataOrAnalyzeExhibitR />} />
        <Route path="/gap/videosyncs-lacks-ai-driven-audio-video-alignment" element={<GapVideosyncsLacksAiDrivenAudioVideoAlignment />} />
        <Route path="/gap/limited-integration-with-court-calendars-legal-research-lexi" element={<GapLimitedIntegrationWithCourtCalendarsLegalResearchLexi />} />
        <Route path="/gap/no-secure-cloud-vault-for-sensitive-transcripts" element={<GapNoSecureCloudVaultForSensitiveTranscripts />} />
        <Route path="/gap/no-continuing-education-tracking-layered-on-certifications" element={<GapNoContinuingEducationTrackingLayeredOnCertifications />} />
        <Route path="/gap/no-webhooks-or-notification-system" element={<GapNoWebhooksOrNotificationSystem />} />
      </Routes>
    </div>
  );
}

export default App;
