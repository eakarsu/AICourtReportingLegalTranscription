import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function RealtimeRoughDraftQc() {
  const [data, setData] = useState({ summary: {}, sessions: [] });
  const [triage, setTriage] = useState(null);

  useEffect(() => {
    API.get('/realtime-rough-draft-qc').then((res) => setData(res.data));
  }, []);

  const triageSession = async (sessionId) => {
    const res = await API.post('/realtime-rough-draft-qc/triage', { sessionId });
    setTriage(res.data);
  };

  return (
    <div className="container py-4">
      <h1>Realtime Rough Draft QC</h1>
      <p className="text-muted">Monitor live rough transcript feeds for low-confidence steno, exhibit references, and scopist escalation.</p>
      <div className="row my-4">
        {Object.entries(data.summary).map(([key, value]) => (
          <div className="col-md-4" key={key}>
            <div className="card p-3"><small className="text-muted">{key}</small><strong className="fs-3">{value}</strong></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-body">
          {data.sessions.map((session) => (
            <div className="d-flex justify-content-between border-bottom py-3" key={session.id}>
              <div>
                <strong>{session.matter}</strong>
                <div className="text-muted">{session.reporter} · {session.confidence}% confidence · {session.unresolvedSteno} unresolved strokes</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => triageSession(session.id)}>Triage</button>
            </div>
          ))}
        </div>
      </div>
      {triage && <div className="alert alert-info mt-3">{triage.priority}: {triage.qcChecklist.join(', ')}</div>}
    </div>
  );
}
