import React, { useState } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';

const SAMPLE_CASE_SUMMARY = `Plaintiff Jane Smith filed a personal injury lawsuit on Jan 15, 2024 against XYZ Corp arising from a slip-and-fall in their warehouse on Sept 3, 2023. Defendant denies liability, alleging the warning signs were posted. Discovery has been ongoing; depositions of two warehouse employees scheduled for July 2025. Trial date set for Nov 12, 2025.`;

const SAMPLE_EXHIBIT_TEXT = `INVOICE
From: ABC Logistics, Inc.
To: XYZ Corp Receiving Dept.
Invoice #: 4421
Date: 09/02/2023
Items: 12 pallets of cleaning solvent (50 gal drums each)
Delivery Note: Floors near loading bay 3 left wet after offload at 14:30. Spillage cleanup deferred per warehouse manager.
Signed: M. Johnson, driver`;

const NEW_AI_FEATURES = [
  {
    id: 'analyze-case-timeline',
    title: 'Analyze Case Timeline',
    description: 'Synthesize case summary and known events into a structured timeline with deposition recommendations.',
    icon: 'C',
    color: '#0EA5E9',
    endpoint: '/ai/analyze-case-timeline',
    fields: [
      { key: 'case_summary', label: 'Case Summary', type: 'textarea', required: true, placeholder: SAMPLE_CASE_SUMMARY },
      { key: 'events', label: 'Known Events (JSON array, optional)', type: 'textarea', placeholder: '[{"date":"2023-09-03","event":"Slip and fall"}]' }
    ],
    resultKey: 'timeline_analysis',
    buttonText: 'Analyze Timeline'
  },
  {
    id: 'extract-exhibit-metadata',
    title: 'Extract Exhibit Metadata',
    description: 'Identify document type, parties, dates, key facts, and trial relevance from raw exhibit text.',
    icon: 'X',
    color: '#F59E0B',
    endpoint: '/ai/extract-exhibit-metadata',
    fields: [
      { key: 'exhibit_label', label: 'Exhibit Label (optional)', type: 'text', placeholder: 'Plaintiff Exhibit 4' },
      { key: 'exhibit_text', label: 'Exhibit Text', type: 'textarea', required: true, placeholder: SAMPLE_EXHIBIT_TEXT }
    ],
    resultKey: 'exhibit_metadata',
    buttonText: 'Extract Metadata'
  },
  {
    id: 'predict-deposition-needs',
    title: 'Predict Deposition Needs',
    description: 'Predict which witnesses to depose, topic outlines, sequencing, and exhibits required for an upcoming deposition phase.',
    icon: 'D',
    color: '#8B5CF6',
    endpoint: '/ai/predict-deposition-needs',
    fields: [
      { key: 'case_summary', label: 'Case Summary', type: 'textarea', required: true, placeholder: SAMPLE_CASE_SUMMARY },
      { key: 'known_witnesses', label: 'Known Witnesses (JSON array, optional)', type: 'textarea', placeholder: '[{"name":"M. Johnson","role":"driver"}]' }
    ],
    resultKey: 'deposition_prediction',
    buttonText: 'Predict Depositions'
  },
  {
    id: 'optimize-delivery-routing',
    title: 'Optimize Delivery Routing',
    description: 'Batch and route transcript deliveries (digital + physical) for cost and on-time efficiency.',
    icon: 'R',
    color: '#10B981',
    endpoint: '/ai/optimize-delivery-routing',
    fields: [
      { key: 'deliveries', label: 'Deliveries (JSON array)', type: 'textarea', required: true, placeholder: '[{"id":"D-1","client":"Smith Law","method":"email","deadline":"2025-06-10"}]' },
      { key: 'constraints', label: 'Constraints (JSON object, optional)', type: 'textarea', placeholder: '{"max_courier_runs":3}' }
    ],
    resultKey: 'routing_plan',
    buttonText: 'Optimize Routing'
  },
  {
    id: 'analyze-exhibit-relevance',
    title: 'Analyze Exhibit Relevance',
    description: 'Map an exhibit to the claims/elements of a case and score its relevance, with admissibility concerns.',
    icon: 'V',
    color: '#EF4444',
    endpoint: '/ai/analyze-exhibit-relevance',
    fields: [
      { key: 'exhibit_label', label: 'Exhibit Label (optional)', type: 'text', placeholder: 'Plaintiff Exhibit 7' },
      { key: 'exhibit_text', label: 'Exhibit Text', type: 'textarea', required: true, placeholder: SAMPLE_EXHIBIT_TEXT },
      { key: 'claims', label: 'Claims / Elements', type: 'textarea', required: true, placeholder: '1. Negligence — duty, breach, causation, damages\n2. Premises liability' }
    ],
    resultKey: 'relevance_analysis',
    buttonText: 'Analyze Relevance'
  }
];

export default function AIFeaturesNewPage() {
  const [expanded, setExpanded] = useState(NEW_AI_FEATURES[0].id);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const setFieldValue = (featureId, key, value) => {
    setForms((prev) => ({ ...prev, [featureId]: { ...(prev[featureId] || {}), [key]: value } }));
  };

  const handleSubmit = async (feature) => {
    const form = forms[feature.id] || {};
    const missing = feature.fields.find((f) => f.required && (!form[f.key] || !String(form[f.key]).trim()));
    if (missing) {
      toast.warning(`${missing.label} is required.`);
      return;
    }

    const payload = {};
    for (const f of feature.fields) {
      const val = form[f.key];
      if (val === undefined || val === '') continue;
      const jsonKeys = ['events', 'known_witnesses', 'deliveries', 'constraints'];
      if (jsonKeys.includes(f.key)) {
        try {
          payload[f.key] = JSON.parse(val);
        } catch {
          toast.warning(`${f.label} must be valid JSON.`);
          return;
        }
      } else {
        payload[f.key] = val;
      }
    }

    setLoading((prev) => ({ ...prev, [feature.id]: true }));
    setResults((prev) => ({ ...prev, [feature.id]: null }));

    try {
      const response = await API.post(feature.endpoint, payload);
      const data = response.data;
      const resultText = data[feature.resultKey] || data.result || JSON.stringify(data, null, 2);
      setResults((prev) => ({ ...prev, [feature.id]: resultText }));
      toast.success(`${feature.title} completed!`);
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || error.message || 'AI request failed.';
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading((prev) => ({ ...prev, [feature.id]: false }));
    }
  };

  return (
    <div className="ai-page">
      <style>{`
        .ai-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; font-family: 'Inter', -apple-system, sans-serif; }
        .ai-page-title { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .ai-page-subtitle { font-size: 15px; color: #64748b; margin-bottom: 32px; }
        .ai-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .ai-card-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; cursor: pointer; user-select: none; }
        .ai-card-header:hover { background: #f8fafc; }
        .ai-card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; }
        .ai-card-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 4px 0; }
        .ai-card-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; }
        .ai-card-body { padding: 0 24px 24px; }
        .ai-card-body-divider { height: 1px; background: #e2e8f0; margin-bottom: 20px; }
        .ai-input-label { display: block; font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 6px; margin-top: 12px; }
        .ai-input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        .ai-textarea { width: 100%; min-height: 140px; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; font-family: 'SF Mono', Menlo, Consolas, monospace; resize: vertical; box-sizing: border-box; }
        .ai-btn { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; }
        .ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-result { margin-top: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; white-space: pre-wrap; font-size: 14px; color: #334155; line-height: 1.6; }
        .ai-error { margin-top: 16px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px; border-radius: 8px; font-size: 13px; }
        .ai-loading { margin-top: 16px; color: #64748b; font-size: 14px; }
      `}</style>

      <h1 className="ai-page-title">AI Features (New)</h1>
      <p className="ai-page-subtitle">
        New AI tools for case timeline analysis and exhibit metadata extraction.
      </p>

      {NEW_AI_FEATURES.map((feature) => {
        const isExpanded = expanded === feature.id;
        const isLoading = loading[feature.id];
        const result = results[feature.id];
        const form = forms[feature.id] || {};

        return (
          <div key={feature.id} className="ai-card">
            <div className="ai-card-header" onClick={() => setExpanded(isExpanded ? null : feature.id)}>
              <div className="ai-card-icon" style={{ background: feature.color }}>{feature.icon}</div>
              <div style={{ flex: 1 }}>
                <h3 className="ai-card-title">{feature.title}</h3>
                <p className="ai-card-desc">{feature.description}</p>
              </div>
              <span style={{ color: '#94a3b8', fontSize: 18 }}>{isExpanded ? '▴' : '▾'}</span>
            </div>

            {isExpanded && (
              <div className="ai-card-body">
                <div className="ai-card-body-divider" />

                {feature.fields.map((f) => (
                  <React.Fragment key={f.key}>
                    <label className="ai-input-label">
                      {f.label}{f.required ? ' *' : ''}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="ai-textarea"
                        placeholder={f.placeholder}
                        value={form[f.key] || ''}
                        onChange={(e) => setFieldValue(feature.id, f.key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="ai-input"
                        type="text"
                        placeholder={f.placeholder}
                        value={form[f.key] || ''}
                        onChange={(e) => setFieldValue(feature.id, f.key, e.target.value)}
                      />
                    )}
                  </React.Fragment>
                ))}

                <button
                  className="ai-btn"
                  style={{ background: feature.color }}
                  onClick={() => handleSubmit(feature)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : feature.buttonText}
                </button>

                {isLoading && <div className="ai-loading">AI is processing...</div>}
                {result && <div className="ai-result">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
