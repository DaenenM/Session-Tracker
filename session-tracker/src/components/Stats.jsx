// src/components/Stats.jsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
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
                  <th onClick={() => handleSort('date')}>
                    <span>Date</span> <SortArrow field="date" />
                  </th>
                  <th onClick={() => handleSort('classType')}>
                    <span>Class Type</span> <SortArrow field="classType" />
                  </th>
                  <th onClick={() => handleSort('timeMinutes')}>
                    <span>Time (min)</span> <SortArrow field="timeMinutes" />
                  </th>
                  <th onClick={() => handleSort('count')}>
                    <span>Count</span> <SortArrow field="count" />
                  </th>
                  <th onClick={() => handleSort('avgPerMin')}>
                    <span>Avg/Min</span> <SortArrow field="avgPerMin" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>{formatDate(session.date)}</td>
                    <td>
                      <span className={`class-badge ${session.classType === 'inPerson' ? 'in-person' : 'online'}`}>
                        {session.classType === 'inPerson' ? 'In-Person' : session.classType === 'online' ? 'Online' : '—'}
                      </span>
                    </td>
                    <td>{session.timeMinutes || 0}</td>
                    <td className="count-cell">{session.count}</td>
                    <td className="avg-cell">{session.avgPerMin?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}