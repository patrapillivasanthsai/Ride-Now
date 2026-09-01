import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ROLE_META: Record<string, { label: string; icon: string; color: string; desc: string; permissions: string[] }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    icon: '🔑',
    color: '#8b5cf6',
    desc: 'Unrestricted master access across all modules, payments, staff, and system settings.',
    permissions: ['Full Platform Control', 'Pricing & Tariffs', 'Financial Settlements', 'Staff Management', 'Audit Trails', 'Fleet Operations']
  },
  OPERATIONS_ADMIN: {
    label: 'Operations Admin',
    icon: '🚖',
    color: '#3b82f6',
    desc: 'Live trip dispatch, driver verification, vehicle approval, and ride problem resolution.',
    permissions: ['Rides Monitor & Manual Dispatch', 'Captain Approvals & Suspensions', 'Rating Moderation', 'Driver Push Notifications']
  },
  FINANCE_ADMIN: {
    label: 'Finance Admin',
    icon: '💰',
    color: '#00b562',
    desc: 'Monitors financial transactions, gateway reconciliation, GMV analytics, and tariff pricing.',
    permissions: ['Financial Transactions', 'Tariff Pricing Control', 'Revenue Analytics', 'Refund Management']
  },
  SUPPORT_STAFF: {
    label: 'Support Staff',
    icon: '🎧',
    color: '#f59e0b',
    desc: 'Customer dispute resolution, ride inspection, review moderation, and account support.',
    permissions: ['Customer Accounts', 'Trip Inspection', 'Reviews Moderation', 'Customer Notifications']
  },
};

export const Staff: React.FC = () => {
  const { theme } = useTheme();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', staffRole: 'SUPPORT_STAFF' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStaff = () => {
    setLoading(true);
    setError(null);
    api.getStaff()
      .then(d => setStaffList(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load staff accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStaff(); }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setFormError('Email and temporary password are required.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.createStaff(form);
      showToast('New administrative staff account created!');
      setForm({ email: '', password: '', staffRole: 'SUPPORT_STAFF' });
      setShowForm(false);
      loadStaff();
    } catch (e: any) {
      setFormError(e.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setActionLoading(id);
    try {
      await api.updateStaff(id, { isActive: !current });
      showToast(`Staff account ${!current ? 'activated' : 'deactivated'}.`);
      loadStaff();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (id: string, staffRole: string) => {
    setActionLoading(id);
    try {
      await api.updateStaff(id, { staffRole });
      showToast('Staff role & permissions updated.');
      loadStaff();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    backgroundColor: theme.inputBg,
    color: theme.text,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  };

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
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: theme.text }}>Admin Staff & Access Permissions</h1>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
            Manage internal operator accounts and enforce role-based access control (RBAC).
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null); }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#00b562',
            color: '#fff',
            border: 'none',
            borderRadius: '9px',
            fontWeight: '800',
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,181,98,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>+</span> Add Admin Staff
        </button>
      </div>

      {/* Role Definitions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {Object.entries(ROLE_META).map(([key, meta]) => (
          <div key={key} style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '18px', borderTop: `4px solid ${meta.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>{meta.icon}</span>
              <strong style={{ fontSize: '14.5px', color: theme.text }}>{meta.label}</strong>
            </div>
            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '10px', lineHeight: 1.4 }}>{meta.desc}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {meta.permissions.map(p => (
                <div key={p} style={{ fontSize: '11px', color: meta.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✓</span> {p}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Create Staff Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: theme.text }}>🛡️ Add Admin / Staff Member</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderLeft: '4px solid #ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Staff Official Email</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="operator@ridenow.com"
                />
              </div>

              <div>
                <label style={labelStyle}>Temporary Password</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label style={labelStyle}>Assigned Role & Permissions</label>
                <select
                  style={inputStyle}
                  value={form.staffRole}
                  onChange={e => setForm(f => ({ ...f, staffRole: e.target.value }))}
                >
                  <option value="SUPER_ADMIN">🔑 Super Admin — Unrestricted Full Access</option>
                  <option value="OPERATIONS_ADMIN">🚖 Operations Admin — Rides + Captains</option>
                  <option value="FINANCE_ADMIN">💰 Finance Admin — Payments + Tariffs</option>
                  <option value="SUPPORT_STAFF">🎧 Support Staff — Customers + Disputes</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13.5px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Accounts Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>Loading staff accounts...</div>
      ) : staffList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted, backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}` }}>
          🛡️ No additional staff accounts found. Click "+ Add Admin Staff" to create your first operator account.
        </div>
      ) : (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: theme.tableHeaderBg, borderBottom: `1px solid ${theme.border}` }}>
                  {['Account Email', 'Assigned Role', 'Access Scope', 'Account Status', 'Created Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: theme.textMuted, fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map((s: any) => {
                  const roleInfo = ROLE_META[s.staffRole] || { label: s.staffRole, icon: '🛡️', color: '#00b562', desc: '' };
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.tableRowHover}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', color: theme.text }}>
                        <div style={{ fontWeight: '700' }}>{s.user?.email || s.email}</div>
                        <div style={{ fontSize: '11px', color: theme.textMuted }}>ID: {s.id.slice(0, 8)}...</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={s.staffRole}
                          onChange={e => handleRoleChange(s.id, e.target.value)}
                          disabled={actionLoading === s.id}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '7px',
                            border: `1px solid ${theme.border}`,
                            backgroundColor: theme.inputBg,
                            color: roleInfo.color,
                            fontWeight: '700',
                            fontSize: '12.5px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="SUPER_ADMIN">🔑 Super Admin</option>
                          <option value="OPERATIONS_ADMIN">🚖 Operations Admin</option>
                          <option value="FINANCE_ADMIN">💰 Finance Admin</option>
                          <option value="SUPPORT_STAFF">🎧 Support Staff</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px', maxWidth: '240px' }}>
                        {roleInfo.desc}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {s.isActive !== false ? (
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)' }}>
                            ● Active
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '12px' }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => handleToggleActive(s.id, s.isActive !== false)}
                          disabled={actionLoading === s.id}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: s.isActive !== false ? 'rgba(239,68,68,0.1)' : 'rgba(0,181,98,0.1)',
                            color: s.isActive !== false ? '#ef4444' : '#00b562',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {s.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
