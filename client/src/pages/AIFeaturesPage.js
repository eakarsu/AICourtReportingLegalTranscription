import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';

const SAMPLE_TRANSCRIPT = `Q. Please state your name for the record.
A. My name is John Smith.
Q. And Mr. Smith, what is you're occupation?
A. I am a sergon at Memorial Hospital.
Q. How long have you been practsing medicine?`;

const SAMPLE_SCHEDULE = JSON.stringify({
  jobs: [
    { id: 1, case: "Smith v. Jones", date: "2025-03-15", location: "Downtown Court", type: "deposition" },
    { id: 2, case: "Doe v. City", date: "2025-03-15", location: "North Court", type: "hearing" }
  ]
}, null, 2);

const SAMPLE_INVOICE = JSON.stringify({
  case_name: "Smith v. Jones",
  case_number: "2024-CV-1234",
  service_date: "2025-03-10",
  page_count: 245,
  page_rate: 6.50,
  rush_fee: true,
  delivery: "electronic"
}, null, 2);

const AI_FEATURES = [
  {
    id: 'proofread',
    title: 'Transcript Proofreading',
    description: 'AI-powered proofreading to catch spelling, grammar, and formatting errors in court transcripts.',
    icon: 'P',
    color: '#4F46E5',
    endpoint: '/ai/proofread',
    inputType: 'textarea',
    inputKey: 'text',
    placeholder: SAMPLE_TRANSCRIPT,
    buttonText: 'Proofread Transcript'
  },
  {
    id: 'terminology',
    title: 'Terminology Research',
    description: 'Instantly research legal, medical, and technical terms encountered during transcription.',
    icon: 'T',
    color: '#7C3AED',
    endpoint: '/ai/terminology',
    inputType: 'text',
    inputKey: 'term',
    placeholder: 'voir dire',
    buttonText: 'Research Term'
  },
  {
    id: 'deposition-summary',
    title: 'Deposition Summary',
    description: 'Generate concise, professional summaries of deposition transcripts for attorneys.',
    icon: 'D',
    color: '#059669',
    endpoint: '/ai/deposition-summary',
    inputType: 'textarea',
    inputKey: 'transcript',
    placeholder: SAMPLE_TRANSCRIPT,
    buttonText: 'Generate Summary'
  },
  {
    id: 'generate-index',
    title: 'Index / Keyword Generation',
    description: 'Automatically generate keyword indexes and topic references from transcripts.',
    icon: 'I',
    color: '#DC2626',
    endpoint: '/ai/generate-index',
    inputType: 'textarea',
    inputKey: 'transcript',
    placeholder: SAMPLE_TRANSCRIPT,
    buttonText: 'Generate Index'
  },
  {
    id: 'optimize-schedule',
    title: 'Schedule Optimization',
    description: 'Optimize job scheduling by analyzing locations, times, and case priorities.',
    icon: 'S',
    color: '#D97706',
    endpoint: '/ai/optimize-schedule',
    inputType: 'textarea',
    inputKey: 'jobs',
    placeholder: SAMPLE_SCHEDULE,
    buttonText: 'Optimize Schedule'
  },
  {
    id: 'invoice-narrative',
    title: 'Invoice Narrative',
    description: 'Generate professional invoice descriptions and service narratives for billing.',
    icon: 'N',
    color: '#2563EB',
    endpoint: '/ai/invoice-narrative',
    inputType: 'textarea',
    inputKey: 'details',
    placeholder: SAMPLE_INVOICE,
    buttonText: 'Generate Narrative'
  }
];

function AIResultCard({ result }) {
  if (!result) return null;

  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const lines = text.split('\n');

  const isHeader = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\d+[\.\:\)]/.test(trimmed) && trimmed.length < 120) return true;
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 100 && /[A-Z]/.test(trimmed)) return true;
    if (/^#{1,4}\s/.test(trimmed)) return true;
    return false;
  };

  const isBullet = (line) => /^\s*[-*]\s/.test(line);
  const isNumberedItem = (line) => /^\s*\d+[\.\)]\s/.test(line) && line.trim().length > 10;

  const renderLines = () => {
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={i} style={{ height: '8px' }} />);
        i++;
        continue;
      }

      if (isHeader(trimmed)) {
        const headerText = trimmed.replace(/^#{1,4}\s/, '').replace(/^\d+[\.\:\)]\s*/, (match) => match);
        elements.push(
          <div key={i} className="ai-result-header">
            {headerText}
          </div>
        );
        i++;
        continue;
      }

      if (isBullet(trimmed)) {
        const bullets = [];
        while (i < lines.length && isBullet(lines[i].trim())) {
          bullets.push(lines[i].trim().replace(/^[-*]\s/, ''));
          i++;
        }
        elements.push(
          <ul key={`bullets-${i}`} className="ai-result-bullet">
            {bullets.map((b, idx) => (
              <li key={idx} className="ai-result-item">{b}</li>
            ))}
          </ul>
        );
        continue;
      }

      if (isNumberedItem(trimmed) && !isHeader(trimmed)) {
        const items = [];
        while (i < lines.length && isNumberedItem(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+[\.\)]\s*/, ''));
          i++;
        }
        elements.push(
          <ol key={`ordered-${i}`} className="ai-result-bullet">
            {items.map((item, idx) => (
              <li key={idx} className="ai-result-item">{item}</li>
            ))}
          </ol>
        );
        continue;
      }

      elements.push(
        <p key={i} className="ai-result-text">{trimmed}</p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="ai-result-card">
      <div className="ai-result-section">
        {renderLines()}
      </div>
    </div>
  );
}

export default function AIFeaturesPage() {
  const [expanded, setExpanded] = useState(null);
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const toggleCard = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleInputChange = (id, value) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (feature) => {
    const inputValue = inputs[feature.id] || feature.placeholder;
    if (!inputValue || !inputValue.trim()) {
      toast.warning('Please enter some input text.');
      return;
    }

    setLoading((prev) => ({ ...prev, [feature.id]: true }));
    setResults((prev) => ({ ...prev, [feature.id]: null }));

    try {
      let payload;
      if (feature.id === 'optimize-schedule' || feature.id === 'invoice-narrative') {
        try {
          payload = { [feature.inputKey]: JSON.parse(inputValue) };
        } catch {
          payload = { [feature.inputKey]: inputValue };
        }
      } else {
        payload = { [feature.inputKey]: inputValue };
      }

      const response = await API.post(feature.endpoint, payload);
      const data = response.data;
      const resultText = data.result || data.data || data.message || JSON.stringify(data, null, 2);
      setResults((prev) => ({ ...prev, [feature.id]: resultText }));
      toast.success(`${feature.title} completed successfully!`);
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'AI request failed.';
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading((prev) => ({ ...prev, [feature.id]: false }));
    }
  };

  return (
    <div className="ai-page">
      <style>{`
        .ai-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ai-page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .ai-page-subtitle {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 32px;
        }

        .ai-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 24px;
        }

        .ai-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ai-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }

        .ai-card.expanded {
          grid-column: 1 / -1;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border-color: #94a3b8;
        }

        .ai-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease;
        }

        .ai-card-header:hover {
          background: #f8fafc;
        }

        .ai-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          letter-spacing: -0.5px;
        }

        .ai-card-info {
          flex: 1;
          min-width: 0;
        }

        .ai-card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .ai-card-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .ai-card-chevron {
          font-size: 18px;
          color: #94a3b8;
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }

        .ai-card.expanded .ai-card-chevron {
          transform: rotate(180deg);
        }

        .ai-card-body {
          padding: 0 24px 24px;
          animation: slideDown 0.25s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-card-body-divider {
          height: 1px;
          background: #e2e8f0;
          margin-bottom: 20px;
        }

        .ai-input-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 6px;
        }

        .ai-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: #1e293b;
          background: #f9fafb;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .ai-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: #fff;
        }

        .ai-textarea {
          width: 100%;
          min-height: 160px;
          padding: 12px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
          color: #1e293b;
          background: #f9fafb;
          resize: vertical;
          line-height: 1.6;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .ai-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          background: #fff;
        }

        .ai-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .ai-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .ai-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .ai-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .ai-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          font-size: 14px;
          color: #64748b;
        }

        .ai-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-result-card {
          margin-top: 24px;
          background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 28px 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
          position: relative;
          overflow: hidden;
        }

        .ai-result-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #4F46E5, #7C3AED, #059669, #2563EB);
        }

        .ai-result-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6366f1;
          background: #eef2ff;
          padding: 4px 10px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .ai-result-section {
          line-height: 1.7;
          color: #334155;
        }

        .ai-result-header {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 20px 0 10px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid #e0e7ff;
        }

        .ai-result-header:first-child {
          margin-top: 0;
        }

        .ai-result-text {
          font-size: 14px;
          color: #475569;
          margin: 6px 0;
          line-height: 1.75;
        }

        .ai-result-bullet {
          margin: 10px 0;
          padding-left: 20px;
        }

        .ai-result-bullet li {
          margin-bottom: 6px;
        }

        .ai-result-item {
          font-size: 14px;
          color: #475569;
          line-height: 1.7;
          padding-left: 4px;
        }

        .ai-result-item::marker {
          color: #6366f1;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .ai-page {
            padding: 20px 16px;
          }
          .ai-grid {
            grid-template-columns: 1fr;
          }
          .ai-card.expanded {
            grid-column: 1;
          }
          .ai-result-card {
            padding: 20px;
          }
        }
      `}</style>

      <h1 className="ai-page-title">AI Features</h1>
      <p className="ai-page-subtitle">
        Powerful AI tools to streamline your court reporting workflow — powered by OpenRouter
      </p>

      <div className="ai-grid">
        {AI_FEATURES.map((feature) => {
          const isExpanded = expanded === feature.id;
          const isLoading = loading[feature.id];
          const result = results[feature.id];
          const inputValue = inputs[feature.id] !== undefined ? inputs[feature.id] : '';

          return (
            <div key={feature.id} className={`ai-card${isExpanded ? ' expanded' : ''}`}>
              <div className="ai-card-header" onClick={() => toggleCard(feature.id)}>
                <div className="ai-card-icon" style={{ background: feature.color }}>
                  {feature.icon}
                </div>
                <div className="ai-card-info">
                  <h3 className="ai-card-title">{feature.title}</h3>
                  <p className="ai-card-desc">{feature.description}</p>
                </div>
                <span className="ai-card-chevron">&#9662;</span>
              </div>

              {isExpanded && (
                <div className="ai-card-body">
                  <div className="ai-card-body-divider" />

                  <label className="ai-input-label">
                    {feature.inputType === 'text' ? 'Enter term:' : 'Input:'}
                  </label>

                  {feature.inputType === 'text' ? (
                    <input
                      className="ai-input"
                      type="text"
                      placeholder={feature.placeholder}
                      value={inputValue}
                      onChange={(e) => handleInputChange(feature.id, e.target.value)}
                    />
                  ) : (
                    <textarea
                      className="ai-textarea"
                      placeholder={feature.placeholder}
                      value={inputValue}
                      onChange={(e) => handleInputChange(feature.id, e.target.value)}
                    />
                  )}

                  {isLoading ? (
                    <div className="ai-loading">
                      <div className="ai-spinner" />
                      <span>AI is processing your request...</span>
                    </div>
                  ) : (
                    <button
                      className="ai-btn"
                      style={{ background: feature.color }}
                      onClick={() => handleSubmit(feature)}
                      disabled={isLoading}
                    >
                      {feature.buttonText}
                    </button>
                  )}

                  {result && (
                    <>
                      <div className="ai-result-badge">
                        <span>&#10003;</span> AI Result
                      </div>
                      <AIResultCard result={result} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
