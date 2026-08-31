import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' };

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#7c3aed', bg: '#f5f3ff' },
  OPERATIONS_ADMIN: { label: 'Operations', color: '#1d4ed8', bg: '#eff6ff' },
  FINANCE_ADMIN: { label: 'Finance', color: '#0d9488', bg: '#f0fdfa' },
  SUPPORT_STAFF: { label: 'Support', color: '#92400e', bg: '#fffbeb' },
};

export const Staff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', staffRole: 'SUPPORT_STAFF' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    api.getStaff()
      .then(d => setStaff(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load staff'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setFormError('Email and password are required.'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    setSubmitting(true); setFormError(null); setFormSuccess(null);
    try {
      await api.createStaff(form);
      setFormSuccess('Staff member created!');
      setForm({ email: '', password: '', staffRole: 'SUPPORT_STAFF' });
      setShowForm(false); load();
    } catch (e: any) {
      setFormError(e.message || 'Failed to create staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setActionLoading(id);
    try { await api.updateStaff(id, { isActive: !current }); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleRoleChange = async (id: string, staffRole: string) => {
    setActionLoading(id);
    try { await api.updateStaff(id, { staffRole }); load(); }
    catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Admin Staff</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Manage admin staff accounts and role-based access.</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(null); setFormSuccess(null); }}
          style={{ padding: '10px 20px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          + Add Staff
        </button>
      </div>

      {/* Role Legend */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {Object.entries(ROLE_LABELS).map(([k, v]) => (
          <span key={k} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: v.color, backgroundColor: v.bg }}>🛡️ {v.label}</span>
        ))}
      </div>

      {formSuccess && <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', borderLeft: '4px solid #00b562', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>✅ {formSuccess}</div>}
      {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}

      {/* Create Staff Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>🛡️ Add Admin Staff</h3>
            {formError && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', borderLeft: '4px solid #ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>⚠️ {formError}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="staff@ridenow.com" /></div>
              <div><label style={labelStyle}>Temporary Password</label><input type="password" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 6 characters" /></div>
              <div>
                <label style={labelStyle}>Staff Role</label>
                <select style={inputStyle} value={form.staffRole} onChange={e => setForm(f => ({ ...f, staffRole: e.target.value }))}>
                  <option value="SUPER_ADMIN">🔑 Super Admin — Full access</option>
                  <option value="OPERATIONS_ADMIN">🚖 Operations Admin — Rides + Drivers</option>
                  <option value="FINANCE_ADMIN">💰 Finance Admin — Payments + Analytics</option>
                  <option value="SUPPORT_STAFF">🎧 Support Staff — Customers + Rides</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '11px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? 'Creating...' : 'Create Staff'}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading staff...</div>}
      {!loading && staff.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>🛡️ No staff members yet. Add your first staff member.</div>}

      {!loading && staff.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                {['Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s: any) => {
                const rl = ROLE_LABELS[s.staffRole] || { label: s.staffRole, color: '#64748b', bg: '#f1f5f9' };
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{s.user?.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select value={s.staffRole} onChange={e => handleRoleChange(s.id, e.target.value)} disabled={actionLoading === s.id}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: `1.5px solid ${rl.color}`, backgroundColor: rl.bg, color: rl.color, fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="OPERATIONS_ADMIN">Operations Admin</option>
                        <option value="FINANCE_ADMIN">Finance Admin</option>
                        <option value="SUPPORT_STAFF">Support Staff</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.isActive ? '#15803d' : '#ef4444', backgroundColor: s.isActive ? '#dcfce7' : '#fff5f5' }}>
                        {s.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px' }}>{s.user?.createdAt ? new Date(s.user.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => handleToggleActive(s.id, s.isActive)} disabled={actionLoading === s.id}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: s.isActive ? '#fff7ed' : '#dcfce7', color: s.isActive ? '#c2410c' : '#15803d', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        {actionLoading === s.id ? '...' : s.isActive ? '⏸ Deactivate' : '▶ Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Staff;
