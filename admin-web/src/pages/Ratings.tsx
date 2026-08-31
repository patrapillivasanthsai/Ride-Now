import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const Stars: React.FC<{ score: number }> = ({ score }) => (
  <span style={{ color: '#f59e0b', fontSize: '14px' }}>
    {[1, 2, 3, 4, 5].map(i => (i <= score ? '★' : '☆')).join('')}
  </span>
);

const badge = (text: string, color: string, bg: string) => (
  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color, backgroundColor: bg }}>{text}</span>
);

export const Ratings: React.FC = () => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = (p = 1) => {
    setLoading(true); setError(null);
    api.getRatings({ isFlagged: flaggedOnly || undefined, raterRole: roleFilter || undefined, page: p })
      .then((d: any) => { setRatings(d.data || d); setMeta(d.meta || null); })
      .catch((e: any) => setError(e.message || 'Failed to load ratings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [flaggedOnly, roleFilter, page]);

  const handleFlag = async (id: string) => {
    const reason = prompt('Enter flag reason:');
    if (!reason) return;
    setActionLoading(id);
    try { await api.flagRating(id, reason); load(page); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleResolve = async (id: string) => {
    const note = prompt('Enter resolution note:');
    if (!note) return;
    setActionLoading(id);
    try { await api.resolveRating(id, note); load(page); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Ratings & Reviews</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Moderate and review ride ratings. Flag inappropriate content.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px' }}>
          <input type="checkbox" checked={flaggedOnly} onChange={e => { setFlaggedOnly(e.target.checked); setPage(1); }} />
          🚩 Flagged Only
        </label>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', color: '#0f172a' }}>
          <option value="">All Roles</option>
          <option value="CUSTOMER">By Customer</option>
          <option value="DRIVER">By Driver</option>
        </select>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>{meta ? `${meta.total} total` : ''}</span>
      </div>

      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #e53e3e', padding: '14px 18px', borderRadius: '8px', marginBottom: '16px' }}>⚠️ {error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading ratings...</div>}

      {!loading && (
        <>
          {ratings.length === 0
            ? <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>⭐ No ratings found matching filters.</div>
            : (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                      {['Stars', 'By', 'Comment', 'Ride', 'Status', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}><Stars score={r.score} /></td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{r.raterRole === 'CUSTOMER' ? (r.customer?.name || '—') : (r.driver?.name || '—')}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.raterRole}</div>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                          <div style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comment || <em style={{ color: '#94a3b8' }}>No comment</em>}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{r.rideId?.slice(-8)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {r.isResolved ? badge('Resolved', '#059669', '#ecfdf5')
                            : r.isFlagged ? badge('Flagged', '#b45309', '#fffbeb')
                            : badge('Active', '#475569', '#f1f5f9')}
                          {r.flagReason && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.flagReason}>{r.flagReason}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {!r.isFlagged && !r.isResolved && (
                              <button onClick={() => handleFlag(r.id)} disabled={actionLoading === r.id}
                                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                🚩 Flag
                              </button>
                            )}
                            {r.isFlagged && !r.isResolved && (
                              <button onClick={() => handleResolve(r.id)} disabled={actionLoading === r.id}
                                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                ✅ Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#475569' }}>← Prev</button>
              <span style={{ padding: '8px 16px', color: '#64748b', fontSize: '14px' }}>Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: page === meta.totalPages ? 'not-allowed' : 'pointer', color: '#475569' }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Ratings;
