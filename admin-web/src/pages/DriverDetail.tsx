import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const DriverDetail: React.FC<{ driverId?: string; onBack?: () => void }> = ({ driverId: propDriverId, onBack }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propDriverId || paramId;
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active tab inside profile view
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'DOCUMENTS' | 'PAYOUT' | 'ACTIVITY'>('OVERVIEW');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadDriver = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDriverDetail(id);
      setDriver(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load driver profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriver();
  }, [id]);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/drivers');
  };

  // Actions
  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.approveDriver(id);
      showToast('Captain account approved! Driver can now accept rides.');
      loadDriver();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.rejectDriver(id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      showToast('Driver application marked as review required.');
      loadDriver();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject driver application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!id || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      await api.suspendDriver(id, suspendReason);
      setShowSuspendModal(false);
      setSuspendReason('');
      showToast('Driver account suspended.');
      loadDriver();
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.activateDriver(id);
      showToast('Driver account reinstated.');
      loadDriver();
    } catch (err: any) {
      showToast(err.message || 'Failed to reactivate driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.deleteDriver(id);
      setShowDeleteModal(false);
      showToast('Captain permanently deleted.');
      setTimeout(() => {
        handleBack();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Could not delete driver.');
      setActionLoading(false);
    }
  };

  const vehicleIcon = (type: string) => {
    const raw = String(type || 'CAB').toUpperCase();
    if (raw.includes('BIKE')) return '🏍️';
    if (raw.includes('AUTO')) return '🛺';
    return '🚗';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Loading Captain Profile...</div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div style={{ padding: '30px' }}>
        <button
          onClick={handleBack}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.cardBg,
            color: theme.text,
            cursor: 'pointer',
            fontWeight: '700',
            marginBottom: '20px'
          }}
        >
          ← Back to Drivers
        </button>

        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px' }}>Unable to load driver details</h3>
          <p style={{ color: theme.textMuted, fontSize: '13px', margin: '8px 0 16px' }}>{error || 'Driver record not found.'}</p>
          <button
            onClick={loadDriver}
            style={{ padding: '10px 20px', backgroundColor: '#00b562', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const perf = driver.performance || {};
  const vehicle = driver.vehicle;
  const payout = driver.payoutAccounts?.[0];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          borderLeft: '4px solid #00b562',
          zIndex: 9999,
          fontWeight: '700',
          fontSize: '13.5px'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Navigation & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.cardBg,
            color: theme.text,
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '13.5px'
          }}
        >
          ← Back to Drivers List
        </button>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!driver.isApproved && !driver.isSuspended && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#00b562', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
              >
                ✅ Approve Captain
              </button>
              <button
                onClick={() => { setRejectReason('Document review required'); setShowRejectModal(true); }}
                disabled={actionLoading}
                style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
              >
                ❌ Reject Application
              </button>
            </>
          )}

          {driver.isApproved && !driver.isSuspended && (
            <button
              onClick={() => { setSuspendReason('Policy violation'); setShowSuspendModal(true); }}
              disabled={actionLoading}
              style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
            >
              ⛔ Suspend Account
            </button>
          )}

          {driver.isSuspended && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'rgba(0,181,98,0.1)', color: '#00b562', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
            >
              🟢 Reactivate Account
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
            style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
          >
            🗑️ Delete Driver
          </button>
        </div>
      </div>

      {/* Hero Profile Overview Card */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '18px', border: `1.5px solid ${theme.border}`, padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '38px',
            backgroundColor: 'rgba(0,181,98,0.15)',
            border: '2.5px solid #00b562',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            {driver.selfieUrl ? (
              <img src={driver.selfieUrl} alt="Captain" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              '👨‍✈️'
            )}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: theme.text }}>{driver.name || 'Unnamed Driver'}</h1>
              
              {/* Approval Badge */}
              {driver.isSuspended ? (
                <span style={{ padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '800', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' }}>
                  ⛔ Suspended
                </span>
              ) : driver.isApproved ? (
                <span style={{ padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '800', color: '#059669', backgroundColor: 'rgba(5,150,105,0.15)' }}>
                  ✅ Approved Captain
                </span>
              ) : (
                <span style={{ padding: '4px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: '800', color: '#d97706', backgroundColor: 'rgba(245,158,11,0.15)' }}>
                  ⏳ Pending Verification
                </span>
              )}

              {/* Duty Status */}
              <span style={{
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: '800',
                color: driver.status === 'ONLINE' ? '#00b562' : driver.status === 'BUSY' ? '#f59e0b' : theme.textMuted,
                backgroundColor: driver.status === 'ONLINE' ? 'rgba(0,181,98,0.1)' : 'rgba(255,255,255,0.05)'
              }}>
                {driver.status === 'ONLINE' ? '🟢 Online Duty' : driver.status === 'BUSY' ? '🟡 On Trip' : '⚪ Offline'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: theme.textMuted, fontSize: '13px', flexWrap: 'wrap' }}>
              <span>ID: <code style={{ color: theme.text }}>{driver.id}</code></span>
              <span>📧 {driver.user?.email}</span>
              {driver.phone && <span>📞 {driver.phone}</span>}
              <span>📅 Joined: {new Date(driver.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: theme.cardBgSecondary, padding: '12px 18px', borderRadius: '12px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>RATING</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#f59e0b', marginTop: '2px' }}>
                {perf.averageRating ? `★ ${perf.averageRating}` : 'New'}
              </div>
            </div>

            <div style={{ backgroundColor: theme.cardBgSecondary, padding: '12px 18px', borderRadius: '12px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>TRIPS</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: theme.text, marginTop: '2px' }}>
                {perf.totalCompletedTrips || 0}
              </div>
            </div>

            <div style={{ backgroundColor: theme.cardBgSecondary, padding: '12px 18px', borderRadius: '12px', textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>EARNINGS</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#00b562', marginTop: '2px' }}>
                ₹{(perf.totalEarnings || 0).toFixed(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px', overflowX: 'auto' }}>
          {[
            { id: 'OVERVIEW', label: '📊 Profile Overview' },
            { id: 'TRIPS', label: `⚡ Rides & Earnings (${driver.rides?.length || 0})` },
            { id: 'DOCUMENTS', label: `📄 Documents (${driver.documents?.length || 0})` },
            { id: 'PAYOUT', label: '🏦 Bank & Wallet' },
            { id: 'ACTIVITY', label: '📜 Activity History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#00b562' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : theme.textMuted,
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW & PERSONAL + VEHICLE INFO             */}
      {/* ==================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Personal Information */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>👤 Personal Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Full Legal Name</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Registered Mobile</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Email Address</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.user?.email || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Date of Birth</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.dob ? new Date(driver.dob).toLocaleDateString() : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Gender</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.gender || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Driving License #</span>
                <span style={{ color: theme.text, fontWeight: '700', fontFamily: 'monospace' }}>{driver.licenseNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Training Status</span>
                <span style={{ color: driver.trainingCompleted ? '#00b562' : '#f59e0b', fontWeight: '700' }}>
                  {driver.trainingCompleted ? '✅ Completed' : '⏳ In Progress'}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>🚗 Vehicle Specifications</h3>
            {vehicle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Category</span>
                  <span style={{ color: '#00b562', fontWeight: '800' }}>
                    {vehicleIcon(vehicle.type)} {vehicle.type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Make / Brand</span>
                  <span style={{ color: theme.text, fontWeight: '700' }}>{vehicle.make}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Model</span>
                  <span style={{ color: theme.text, fontWeight: '700' }}>{vehicle.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Registration Year</span>
                  <span style={{ color: theme.text, fontWeight: '700' }}>{vehicle.year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Vehicle Color</span>
                  <span style={{ color: theme.text, fontWeight: '700' }}>{vehicle.color}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>License Plate #</span>
                  <span style={{ color: '#00b562', fontWeight: '900', fontFamily: 'monospace', fontSize: '14px' }}>
                    {vehicle.plateNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: theme.textMuted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No vehicle details registered.
              </div>
            )}
          </div>

          {/* Financial & Wallet Summary */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>💳 Payout & Wallet</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Wallet Balance</span>
                <span style={{ color: '#00b562', fontWeight: '900', fontSize: '15px' }}>₹{(driver.walletBalance || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Lifetime Payouts</span>
                <span style={{ color: theme.text, fontWeight: '800' }}>₹{(perf.totalEarnings || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Payout Method</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>
                  {payout ? (payout.type === 'UPI' ? '⚡ UPI ID' : `🏦 ${payout.bankName || 'Bank Account'}`) : 'None Linked'}
                </span>
              </div>
              {payout && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textMuted }}>Account Identifier</span>
                  <span style={{ color: '#00b562', fontWeight: '700', fontFamily: 'monospace' }}>
                    {payout.type === 'UPI' ? payout.upiId : (payout.accountNumberMasked || '•••• 4821')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Referral & Incentive Summary */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>🎁 Referrals & Rewards</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Captain Referral Code</span>
                <span style={{ color: '#00b562', fontWeight: '900', fontFamily: 'monospace' }}>{driver.referralCode || 'RN2026'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Total Invited</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.referrals?.totalInvited || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Joined & Active</span>
                <span style={{ color: theme.text, fontWeight: '700' }}>{driver.referrals?.joinedCount || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>Referral Earnings</span>
                <span style={{ color: '#00b562', fontWeight: '800' }}>₹{driver.referrals?.referralEarnings || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: TRIPS & EARNINGS BREAKDOWN                    */}
      {/* ==================================================== */}
      {activeTab === 'TRIPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Earnings Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: theme.cardBg, padding: '16px', borderRadius: '14px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>TODAY'S EARNINGS</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00b562', marginTop: '4px' }}>₹{(perf.todayEarnings || 0).toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: theme.cardBg, padding: '16px', borderRadius: '14px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>WEEKLY EARNINGS</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00b562', marginTop: '4px' }}>₹{(perf.weeklyEarnings || 0).toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: theme.cardBg, padding: '16px', borderRadius: '14px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>MONTHLY EARNINGS</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00b562', marginTop: '4px' }}>₹{(perf.monthlyEarnings || 0).toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: theme.cardBg, padding: '16px', borderRadius: '14px', border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700' }}>AVERAGE / TRIP</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: theme.text, marginTop: '4px' }}>₹{(perf.averageEarningsPerTrip || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Recent Rides Table */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>Recent Trips History</h3>
              <span style={{ fontSize: '12px', color: theme.textMuted }}>Showing latest {driver.recentRides?.length || 0} rides</span>
            </div>

            {driver.recentRides && driver.recentRides.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.cardBgSecondary, color: theme.textMuted, textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Ride ID</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Route</th>
                      <th style={{ padding: '12px 16px' }}>Fare</th>
                      <th style={{ padding: '12px 16px' }}>Driver Share (80%)</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.recentRides.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: theme.textMuted }}>{r.id.slice(0, 8)}...</td>
                        <td style={{ padding: '12px 16px', color: theme.text }}>{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '12px 16px', color: theme.text, maxWidth: '280px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🟢 {r.pickupAddress}</div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: theme.textMuted }}>🔴 {r.dropoffAddress}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: theme.text }}>₹{(r.fare || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#00b562' }}>₹{(r.driverShare || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: r.status === 'RIDE_COMPLETED' ? '#00b562' : r.status === 'CANCELLED' ? '#ef4444' : '#f59e0b',
                            backgroundColor: r.status === 'RIDE_COMPLETED' ? 'rgba(0,181,98,0.1)' : r.status === 'CANCELLED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '36px', textAlign: 'center', color: theme.textMuted }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>No trips completed yet</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: DOCUMENTS & VERIFICATION                      */}
      {/* ==================================================== */}
      {activeTab === 'DOCUMENTS' && (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>📄 KYC Documents Verification</h3>
          {driver.documents && driver.documents.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {driver.documents.map((doc: any) => (
                <div key={doc.id} style={{ backgroundColor: theme.cardBgSecondary, padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '14px', color: theme.text }}>📄 {doc.type.replace(/_/g, ' ')}</span>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: doc.status === 'VERIFIED' ? '#00b562' : doc.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                      backgroundColor: doc.status === 'VERIFIED' ? 'rgba(0,181,98,0.15)' : doc.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'
                    }}>
                      {doc.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</div>
                  {doc.frontUrl && (
                    <a href={doc.frontUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#00b562', fontWeight: '700' }}>
                      🔍 View Document File ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '36px', textAlign: 'center', color: theme.textMuted }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>No KYC documents uploaded</div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: PAYOUT & WALLET TRANSACTIONS                  */}
      {/* ==================================================== */}
      {activeTab === 'PAYOUT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Payout Details Card */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>🏦 Registered Payout Method</h3>
            {payout ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ backgroundColor: theme.cardBgSecondary, padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>TYPE</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: theme.text, marginTop: '2px' }}>{payout.type}</div>
                </div>
                <div style={{ backgroundColor: theme.cardBgSecondary, padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>ACCOUNT HOLDER</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: theme.text, marginTop: '2px' }}>{payout.accountHolderName || driver.name}</div>
                </div>
                <div style={{ backgroundColor: theme.cardBgSecondary, padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>IDENTIFIER / MASKED NUMBER</div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#00b562', marginTop: '2px', fontFamily: 'monospace' }}>
                    {payout.type === 'UPI' ? payout.upiId : (payout.accountNumberMasked || '•••• 4821')}
                  </div>
                </div>
                <div style={{ backgroundColor: theme.cardBgSecondary, padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>IFSC CODE</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: theme.text, marginTop: '2px', fontFamily: 'monospace' }}>
                    {payout.ifscCode || '—'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>No payout account registered yet.</div>
            )}
          </div>

          {/* Wallet Transactions Table */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>Wallet Activity History</h3>
            </div>
            {driver.walletTransactions && driver.walletTransactions.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.cardBgSecondary, color: theme.textMuted, textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {driver.walletTransactions.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 16px', color: theme.textMuted }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', color: theme.text, fontWeight: '700' }}>{tx.description}</td>
                      <td style={{ padding: '12px 16px', color: theme.textMuted }}>{tx.type}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: tx.amount >= 0 ? '#00b562' : '#ef4444' }}>
                        {tx.amount >= 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '36px', textAlign: 'center', color: theme.textMuted }}>
                No wallet transactions recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: ACTIVITY & AUDIT HISTORY                      */}
      {/* ==================================================== */}
      {activeTab === 'ACTIVITY' && (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: theme.text }}>📜 Account & Audit History</h3>
          {driver.auditLogs && driver.auditLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {driver.auditLogs.map((log: any) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: theme.cardBgSecondary, borderRadius: '10px' }}>
                  <div>
                    <span style={{ fontWeight: '800', color: theme.text, fontSize: '13px' }}>{log.action}</span>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>By: {log.actorEmail}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: theme.textMuted }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted }}>
              No audit logs recorded for this account.
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUSPEND MODAL                                        */}
      {/* ==================================================== */}
      {showSuspendModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '800', color: theme.text }}>⛔ Suspend Captain</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: theme.textMuted }}>
              Suspending this driver will disconnect active sessions and prevent receiving rides.
            </p>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for suspension..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSuspend}
                disabled={actionLoading || !suspendReason.trim()}
                style={{ flex: 1, padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                {actionLoading ? 'Suspending...' : 'Confirm Suspend'}
              </button>
              <button
                onClick={() => setShowSuspendModal(false)}
                style={{ flex: 1, padding: '10px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REJECT APPLICATION MODAL                             */}
      {/* ==================================================== */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '800', color: theme.text }}>❌ Reject Application</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: theme.textMuted }}>
              Provide feedback for why the application is being rejected or marked for review.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Specify rejection reason..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.text, boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                style={{ flex: 1, padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, padding: '10px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PERMANENT DELETE MODAL                               */}
      {/* ==================================================== */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '36px', marginBottom: '8px', textAlign: 'center' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '800', color: '#ef4444', textAlign: 'center' }}>
              Delete Driver Account
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: theme.textMuted, lineHeight: '18px', textAlign: 'center' }}>
              Are you sure you want to permanently delete Captain <strong>"{driver.name || driver.id}"</strong>? This will remove all their vehicle registrations and credentials from the system.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ flex: 1, padding: '11px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                {actionLoading ? 'Deleting...' : 'Delete Driver'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                style={{ flex: 1, padding: '11px', backgroundColor: theme.cardBgSecondary, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
