import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const Ratings: React.FC = () => {
  const { theme } = useTheme();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [flagFilter, setFlagFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const load = (p = 1) => {
    setLoading(true);
    setError(null);
    const params: any = { page: p };
    if (scoreFilter) params.score = scoreFilter;
    if (roleFilter) params.raterRole = roleFilter;
    if (flagFilter === 'flagged') params.isFlagged = true;
    if (flagFilter === 'clean') params.isFlagged = false;

    api.getRatings(params)
      .then((d: any) => {
        setRatings(d.data || d);
        setMeta(d.meta || null);
      })
      .catch(e => setError(e.message || 'Failed to load ratings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [scoreFilter, roleFilter, flagFilter, page]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleFlag = async (id: string) => {
    const reason = prompt('Enter reason for flagging this review (e.g. Inappropriate language, abuse):');
    if (!reason) return;
    setActionLoading(id);
    try {
      await api.flagRating(id, reason);
      showToast('Review flagged for investigation.');
      load(page);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id: string) => {
    const note = prompt('Enter resolution note (e.g. Reviewed and verified):');
    if (!note) return;
    setActionLoading(id);
    try {
      await api.resolveRating(id, note);
      showToast('Flagged review resolved.');
      load(page);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Score distribution calculation
  const totalCount = ratings.length || 1;
  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: ratings.filter(r => r.score === s).length,
  }));
  const avgRating = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1)
    : '5.0';

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#00b562',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '13.5px',
          boxShadow: '0 8px 24px rgba(0,181,98,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✅</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Ratings, Reviews & Feedback</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Monitor customer & driver ratings, flag inappropriate comments, and resolve customer grievances.
          </p>
        </div>
      </div>

      {/* Star Distribution Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Score Summary */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#f59e0b', lineHeight: 1 }}>{avgRating}</div>
            <div style={{ fontSize: '18px', marginTop: '4px' }}>⭐⭐⭐⭐⭐</div>
            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>{meta?.total ?? ratings.length} Total Ratings</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {starCounts.map(sc => {
              const pct = Math.round((sc.count / totalCount) * 100);
              return (
                <div key={sc.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ width: '30px', fontWeight: '700', color: theme.text }}>{sc.stars} ★</span>
                  <div style={{ flex: 1, height: '6px', backgroundColor: theme.cardBgSecondary, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#f59e0b', borderRadius: '3px' }} />
                  </div>
                  <span style={{ width: '28px', color: theme.textMuted, textAlign: 'right' }}>{sc.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={scoreFilter}
          onChange={e => { setScoreFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text, minWidth: '150px' }}
        >
          <option value="">All Star Ratings</option>
          <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
          <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
          <option value="3">⭐⭐⭐ (3 Stars)</option>
          <option value="2">⭐⭐ (2 Stars)</option>
          <option value="1">⭐ (1 Star)</option>
        </select>

        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text, minWidth: '180px' }}
        >
          <option value="">All Raters</option>
          <option value="CUSTOMER">👤 Customer Reviews for Driver</option>
          <option value="DRIVER">🪪 Driver Reviews for Customer</option>
        </select>

        <select
          value={flagFilter}
          onChange={e => { setFlagFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 14px', border: `1.5px solid ${theme.border}`, borderRadius: '9px', fontSize: '13px', backgroundColor: theme.inputBg, color: theme.text, minWidth: '170px' }}
        >
          <option value="">All Feedback</option>
          <option value="flagged">🚩 Flagged & Reported</option>
          <option value="clean">✅ Verified Feedback</option>
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Ratings Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading reviews...</div>
      ) : (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
          {ratings.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
              No reviews found matching filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                    {['Score', 'Reviewer', 'Target', 'Comment', 'Flag Status', 'Date', 'Moderation'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r: any) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', color: '#f59e0b', fontWeight: '800', whiteSpace: 'nowrap' }}>
                        {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)} ({r.score}/5)
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.text }}>
                        <div style={{ fontWeight: '700' }}>
                          {r.raterRole === 'CUSTOMER' ? r.customer?.name || 'Customer' : r.driver?.name || 'Driver'}
                        </div>
                        <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: r.raterRole === 'CUSTOMER' ? 'rgba(59,130,246,0.1)' : 'rgba(0,181,98,0.1)', color: r.raterRole === 'CUSTOMER' ? '#3b82f6' : '#00b562', fontWeight: '700' }}>
                          {r.raterRole}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.text }}>
                        <div style={{ fontWeight: '600' }}>
                          {r.raterRole === 'CUSTOMER' ? r.driver?.name || 'Captain' : r.customer?.name || 'Rider'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.text, maxWidth: '280px' }}>
                        <div style={{ fontStyle: r.comment ? 'normal' : 'italic', color: r.comment ? theme.text : theme.textMuted }}>
                          {r.comment || 'No written comment provided'}
                        </div>
                        {r.flagReason && (
                          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: '600' }}>
                            🚩 Flag Reason: {r.flagReason}
                          </div>
                        )}
                        {r.resolveNote && (
                          <div style={{ fontSize: '11px', color: '#00b562', marginTop: '2px', fontWeight: '600' }}>
                            ✅ Resolved Note: {r.resolveNote}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.isFlagged ? (
                          r.isResolved ? (
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' }}>
                              ✅ Resolved
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                              🚩 Under Review
                            </span>
                          )
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: theme.textMuted, backgroundColor: theme.badgeBg }}>
                            Clean
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!r.isFlagged ? (
                            <button
                              onClick={() => handleFlag(r.id)}
                              disabled={actionLoading === r.id}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              🚩 Flag
                            </button>
                          ) : (
                            !r.isResolved && (
                              <button
                                onClick={() => handleResolve(r.id)}
                                disabled={actionLoading === r.id}
                                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                ✅ Resolve
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '18px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.cardBg, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', color: theme.text }}
          >
            ← Prev
          </button>
          <span style={{ padding: '7px 14px', fontSize: '13px', color: theme.textMuted }}>
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.cardBg, cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', color: theme.text }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Ratings;
