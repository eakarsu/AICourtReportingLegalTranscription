const express = require('express');

const router = express.Router();

const sessions = [
  { id: 101, matter: 'Baker v. Northline', reporter: 'M. Chen', confidence: 94, unresolvedSteno: 7, exhibitFlags: 2, status: 'monitoring' },
  { id: 102, matter: 'State v. Alvarez', reporter: 'J. Patel', confidence: 88, unresolvedSteno: 19, exhibitFlags: 4, status: 'needs scopist' },
  { id: 103, matter: 'In re Meridian Trust', reporter: 'A. Rivera', confidence: 97, unresolvedSteno: 3, exhibitFlags: 0, status: 'clean' },
];

router.get('/', (req, res) => {
  res.json({
    summary: {
      activeFeeds: sessions.length,
      avgConfidence: Math.round(sessions.reduce((sum, item) => sum + item.confidence, 0) / sessions.length),
      needsScopist: sessions.filter((item) => item.status === 'needs scopist').length,
    },
    sessions,
  });
});

router.post('/triage', (req, res) => {
  const session = sessions.find((item) => item.id === Number(req.body?.sessionId)) || sessions[0];
  res.json({
    sessionId: session.id,
    priority: session.unresolvedSteno > 12 || session.confidence < 90 ? 'expedite scopist review' : 'standard monitor',
    qcChecklist: ['Verify speaker labels', 'Resolve low-confidence steno strokes', 'Confirm exhibit references'],
  });
});

module.exports = router;
