// src/components/Stats.jsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import calculateRanges from '../utils/calculateRanges';
import '../css/Stats.css';

export default function Stats() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' or 'desc'

  // Fetch sessions from Firestore
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const q = query(collection(db, 'sessions'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSessions(data);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Handle column sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Sort sessions
  const sortedSessions = [...sessions].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Handle string dates
    if (sortField === 'date') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }

    // Handle classType as string
    if (typeof valA === 'string' && sortField !== 'date') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      return sortDir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  // Calculate stats
  const totalSessions = sessions.length;
  const totalTime = sessions.reduce((sum, s) => sum + (s.timeMinutes || 0), 0);
  const totalCount = sessions.reduce((sum, s) => sum + (s.count || 0), 0);
  const overallAvg = totalTime > 0 ? (totalCount / totalTime).toFixed(2) : '0.00';

  // Format date
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Sort arrow indicator
  const SortArrow = ({ field }) => {
    if (sortField !== field) return <span className="sort-arrow inactive">⇅</span>;
    return <span className="sort-arrow active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="stats-loading">
        <div className="guard-spinner"></div>
      </div>
    );
  }

  const statsData = [
    {"label": "Total Sessions", "value": totalSessions ,"icon": "📊", },
    {"label": "Total Sessions", "value": totalSessions ,"icon": "⏱", },
    {"label": "Total Sessions", "value": totalSessions ,"icon": "🔢", },
  ]

  // ── Session count distribution, bucketed by the Bets page's ranges ──
  //
  // Uses calculateRanges so the x-axis matches the ranges people actually bet
  // on. That generator can emit a malformed bucket (lowest > highest) and an
  // overlapping tail, so those are dropped here the same way the Bets page
  // filters them out — otherwise the chart shows an empty bar and double-counts.
  const counts = sessions.map((s) => Number(s.count)).filter(Number.isFinite);

  const distribution = (() => {
    if (counts.length === 0) return [];

    const seen = new Set();
    return calculateRanges(counts)
      .filter((r) => {
        if (r.lowest > r.highest) return false;          // malformed bucket
        const key = `${r.lowest}-${r.highest}`;
        if (seen.has(key)) return false;                 // duplicate
        seen.add(key);
        return true;
      })
      .map((r) => ({
        label: r.highest === Infinity ? `${r.lowest}+` : `${r.lowest}-${r.highest}`,
        lowest: r.lowest,
        highest: r.highest,
        count: counts.filter((c) => c >= r.lowest && c <= r.highest).length,
      }));
  })();

  const maxBucket = distribution.reduce((m, b) => Math.max(m, b.count), 0);

  // Y-axis ticks. The scale is rounded up to a clean number so the gridlines
  // land on whole sessions rather than fractions — you can't have 2.5 sessions.
  const yTicks = (() => {
    if (maxBucket === 0) return [];
    // At most 5 gridlines, stepping by a whole number
    const step = Math.max(1, Math.ceil(maxBucket / 4));
    const top = Math.ceil(maxBucket / step) * step;
    const ticks = [];
    for (let v = top; v >= 0; v -= step) ticks.push(v);
    return ticks;
  })();

  // Bars are measured against the rounded top, not the raw max, so they line up
  // with the gridlines
  const yMax = yTicks.length ? yTicks[0] : 0;

  return (
    <div className="stats-container">
      <div className="stats-content">
        <h1 className="stats-title">Class Statistics</h1>

        {/* ── Top Stat Cards ── */}
        <div className="stats-cards-row">
          <div className="stats-card">
            <span className="stats-card-icon">📊</span>
            <span className="stats-card-label">Total Sessions</span>
            <span className="stats-card-value">{totalSessions}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-icon">⏱</span>
            <span className="stats-card-label">Total Time</span>
            <span className="stats-card-value">{totalTime}<span className="stats-card-unit"> min</span></span>
          </div>
          <div className="stats-card">
            <span className="stats-card-icon">🔢</span>
            <span className="stats-card-label">Total Count</span>
            <span className="stats-card-value">{totalCount}</span>
          </div>
          <div className="stats-card stats-card-highlight">
            <span className="stats-card-icon">⚡</span>
            <span className="stats-card-label">Overall Average</span>
            <span className="stats-card-value">{overallAvg}<span className="stats-card-unit"> /min</span></span>
          </div>
        </div>

        {/* ── Session Table ── */}
        {sessions.length === 0 ? (
          <div className="stats-empty">
            <span className="stats-empty-icon">📋</span>
            <p>No sessions recorded yet.</p>
            <p className="stats-empty-sub">Save a session from the Counter page to see stats here.</p>
          </div>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th
                    className={sortField === 'date' ? 'is-sorted' : ''}
                    onClick={() => handleSort('date')}
                  >
                    <span>Date</span> <SortArrow field="date" />
                  </th>
                  <th
                    className={sortField === 'classType' ? 'is-sorted' : ''}
                    onClick={() => handleSort('classType')}
                  >
                    <span>Class</span> <SortArrow field="classType" />
                  </th>
                  <th
                    className={`num ${sortField === 'timeMinutes' ? 'is-sorted' : ''}`}
                    onClick={() => handleSort('timeMinutes')}
                  >
                    <span>Minutes</span> <SortArrow field="timeMinutes" />
                  </th>
                  <th
                    className={`num ${sortField === 'count' ? 'is-sorted' : ''}`}
                    onClick={() => handleSort('count')}
                  >
                    <span>Count</span> <SortArrow field="count" />
                  </th>
                  <th
                    className={`num ${sortField === 'avgPerMin' ? 'is-sorted' : ''}`}
                    onClick={() => handleSort('avgPerMin')}
                  >
                    <span>Avg/Min</span> <SortArrow field="avgPerMin" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="date-cell">{formatDate(session.date)}</td>
                    <td>
                      <span className={`class-badge ${session.classType === 'inPerson' ? 'in-person' : 'online'}`}>
                        {session.classType === 'inPerson' ? 'In-Person' : session.classType === 'online' ? 'Online' : '—'}
                      </span>
                    </td>
                    <td className="num time-cell">{session.timeMinutes || 0}</td>
                    <td className="num count-cell">{session.count}</td>
                    <td className="num avg-cell">{session.avgPerMin?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Count Distribution ── */}
        {distribution.length > 0 && (
          <section className="stats-chart-section">
            <h2 className="stats-chart-title">Count Distribution</h2>
            <p className="stats-chart-sub">
              How many sessions landed in each betting range
            </p>

            <div className="stats-chart-frame" role="img"
                 aria-label={`Bar chart of session counts across ${distribution.length} betting ranges`}>
              {/* Y axis: labelled gridlines the bars are measured against */}
              <div className="stats-y-axis">
                {yTicks.map((t) => (
                  <span key={t} className="stats-y-tick">{t}</span>
                ))}
              </div>

              <div className="stats-chart-body">
                <div className="stats-gridlines" aria-hidden="true">
                  {yTicks.map((t) => <span key={t} className="stats-gridline" />)}
                </div>

                <div className="stats-chart">
                  {distribution.map((b) => (
                    <div key={b.label} className="stats-bar-col">
                      <div className="stats-bar-track">
                        <div
                          className={`stats-bar-fill ${b.count === maxBucket && b.count > 0 ? 'is-peak' : ''}`}
                          // Measured against the rounded axis top so bar heights
                          // agree with the gridlines
                          style={{ height: yMax > 0 ? `${(b.count / yMax) * 100}%` : '0%' }}
                          title={`${b.label}: ${b.count} session${b.count === 1 ? '' : 's'}`}
                        />
                      </div>
                      <span className="stats-bar-label">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}