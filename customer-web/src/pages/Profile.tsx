import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TrustedContact {
  name: string;
  phone: string;
}

export function Profile() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Form values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Trusted Contacts local state
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  
  // Local edit target index for inline contact editing
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setGender(data.gender || '');
        
        if (data.dob) {
          // Format DateTime to YYYY-MM-DD for date input
          const dateObj = new Date(data.dob);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          setDob(`${yyyy}-${mm}-${dd}`);
        } else {
          setDob('');
        }

        // Handle JSON array parsing safely
        if (data.trustedContacts) {
          const parsed = typeof data.trustedContacts === 'string' 
            ? JSON.parse(data.trustedContacts) 
            : data.trustedContacts;
          setContacts(Array.isArray(parsed) ? parsed : []);
        } else {
          setContacts([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setError(null);
    setSuccess(null);
    // Reset form values to profile loaded values
    setName(profile?.name || '');
    setEmail(profile?.email || '');
    setGender(profile?.gender || '');
    setPassword('');
    if (profile?.dob) {
      const dateObj = new Date(profile.dob);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      setDob(`${yyyy}-${mm}-${dd}`);
    } else {
      setDob('');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Form validations
    if (!email.trim()) {
      setError('Email address cannot be empty.');
      return;
    }
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password && password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        name: name.trim() || null,
        email: email.trim(),
        gender: gender || null,
        dob: dob || null,
        trustedContacts: contacts // Save existing contacts state
      };

      if (password) {
        payload.password = password;
      }

      const res = await api.updateProfile(payload);
      setProfile(res);
      setSuccess('Profile updated successfully!');
      setIsEditMode(false);
      setPassword(''); // clear password field
      await refreshUser(); // refresh user in auth context
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  // Add a trusted contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError('Contact name and phone number are required.');
      return;
    }

    const updatedContacts = [...contacts, { name: newContactName.trim(), phone: newContactPhone.trim() }];
    
    setUpdating(true);
    try {
      await api.updateProfile({ trustedContacts: updatedContacts });
      setContacts(updatedContacts);
      setNewContactName('');
      setNewContactPhone('');
      setIsAddingContact(false);
      setSuccess('Trusted contact added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add trusted contact.');
    } finally {
      setUpdating(false);
    }
  };

  // Delete a trusted contact
  const handleDeleteContact = async (indexToDelete: number) => {
    setError(null);
    setSuccess(null);

    const updatedContacts = contacts.filter((_, idx) => idx !== indexToDelete);

    setUpdating(true);
    try {
      await api.updateProfile({ trustedContacts: updatedContacts });
      setContacts(updatedContacts);
      setSuccess('Trusted contact removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to remove contact.');
    } finally {
      setUpdating(false);
    }
  };

  // Save edits of trusted contact inline
  const handleSaveContactEdit = async (idx: number) => {
    setError(null);
    setSuccess(null);

    if (!editContactName.trim() || !editContactPhone.trim()) {
      setError('Contact name and phone number cannot be empty.');
      return;
    }

    const updatedContacts = [...contacts];
    updatedContacts[idx] = {
      name: editContactName.trim(),
      phone: editContactPhone.trim()
    };

    setUpdating(true);
    try {
      await api.updateProfile({ trustedContacts: updatedContacts });
      setContacts(updatedContacts);
      setEditingContactIdx(null);
      setSuccess('Contact details updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update contact details.');
    } finally {
      setUpdating(false);
    }
  };

  const startEditContact = (idx: number, contact: TrustedContact) => {
    setEditingContactIdx(idx);
    setEditContactName(contact.name);
    setEditContactPhone(contact.phone);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ padding: '60px 20px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e3e6f0' }}>
          <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #00b562', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h3 style={{ color: '#555', fontSize: '18px', fontWeight: '600' }}>Loading your premium profile experience...</h3>
        </div>
      </div>
    );
  }

  // Get initials for profile avatar fallback
  const userInitials = (name || email || 'C').slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Alert Feedbacks */}
      {error && (
        <div style={{
          backgroundColor: '#fff5f5',
          color: '#e53e3e',
          borderLeft: '4px solid #e53e3e',
          padding: '16px 20px',
          borderRadius: '8px',
          marginBottom: '25px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 10px rgba(229, 62, 62, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#f0fff4',
          color: '#38a169',
          borderLeft: '4px solid #38a169',
          padding: '16px 20px',
          borderRadius: '8px',
          marginBottom: '25px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 10px rgba(56, 161, 105, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✅ {success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', color: '#38a169', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Header Profile Summary Panel */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '35px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#e6fffa',
            border: '2.5px solid #00b562',
            color: '#00b562',
            fontSize: '28px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0, 181, 98, 0.1)'
          }}>
            {userInitials}
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>
              {name || 'RideNow Customer'}
            </h2>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#718096' }}>
                📅 Joined: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </span>
              {profile?.averageRating !== undefined && profile?.averageRating !== null && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: '#f0fff4',
                  color: '#38a169',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ★ {profile.averageRating} ({profile.totalRatings} reviews)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {!isEditMode && (
          <button
            onClick={() => setIsEditMode(true)}
            style={{
              backgroundColor: '#00b562',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '30px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 181, 98, 0.2)',
              transition: 'background 0.2s',
            }}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* Main Two-Column Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '30px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Personal details */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 25px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748', borderBottom: '1px solid #edf2f7', paddingBottom: '15px' }}>
            Personal Account Information
          </h3>

          {isEditMode ? (
            /* EDIT FORM VIEW */
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>
                  Update Password <span style={{ fontWeight: 'normal', color: '#718096' }}>(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {/* Read Only primary phone information in Edit Mode */}
              <div style={{
                backgroundColor: '#f7fafc',
                border: '1px dashed #cbd5e0',
                padding: '15px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#718096', marginBottom: '4px' }}>
                  <span>🔒 Registered Mobile</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4a5568' }}>{phone}</div>
                <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '6px', lineHeight: 1.4 }}>
                  Verified phone details are securely locked and cannot be directly modified. Contact support to request edits.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    flex: 1,
                    backgroundColor: '#00b562',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 181, 98, 0.15)'
                  }}
                >
                  {updating ? 'Saving changes...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={updating}
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    color: '#4a5568',
                    border: '1px solid #cbd5e0',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: updating ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* READ-ONLY CARD VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Name</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{profile?.name || 'Not provided'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Gender</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{profile?.gender || 'Not specified'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid #f7fafc', paddingTop: '20px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Email Address</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', wordBreak: 'break-all' }}>{profile?.email}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#a0aec0', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Date of Birth</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                    {profile?.dob ? new Date(profile.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                  </span>
                </div>
              </div>

              {/* Secure Phone Section */}
              <div style={{
                backgroundColor: '#f7fafc',
                border: '1px solid #edf2f7',
                padding: '20px',
                borderRadius: '12px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>Verified Phone</span>
                  <span style={{ fontSize: '11px', color: '#38a169', fontWeight: 'bold', backgroundColor: '#e6fffa', padding: '2px 8px', borderRadius: '20px' }}>✔ Secured</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📞</span>
                  <span>{profile?.phone}</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a0aec0', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                  Verified phone details are securely locked and cannot be directly modified. Contact support to request edits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Safety center emergency contacts */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '400px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>
                Safety Emergency Contacts
              </h3>
              <span style={{ fontSize: '12px', color: '#a0aec0' }}>Share your live location & trip alerts</span>
            </div>
            {!isAddingContact && (
              <button
                onClick={() => { setIsAddingContact(true); setError(null); setSuccess(null); }}
                style={{
                  backgroundColor: '#ebf8ff',
                  color: '#3182ce',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + Add New
              </button>
            )}
          </div>

          {/* Form to Add New Contact */}
          {isAddingContact && (
            <form onSubmit={handleAddContact} style={{
              backgroundColor: '#f7fafc',
              border: '1px solid #edf2f7',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold', color: '#4a5568' }}>Add Safety Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={inputStyle}
                  required
                />
                <input
                  type="tel"
                  placeholder="Contact Phone Number"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    backgroundColor: '#00b562',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: updating ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save Contact
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  style={{
                    backgroundColor: '#fff',
                    color: '#4a5568',
                    border: '1px solid #cbd5e0',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Contacts List */}
          {contacts.length === 0 ? (
            /* EMPTY STATE */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              border: '2px dashed #edf2f7',
              borderRadius: '12px',
              backgroundColor: '#fcfdfd'
            }}>
              <span style={{ fontSize: '40px', marginBottom: '15px' }}>🛡️</span>
              <h4 style={{ margin: '0 0 8px 0', color: '#4a5568', fontSize: '15px', fontWeight: 'bold' }}>Keep your loved ones informed</h4>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '13px', lineHeight: 1.5, maxWidth: '280px' }}>
                Add family or friends to quickly share your live location or send emergency SMS alerts in case of safety issues.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {contacts.map((contact, idx) => (
                <div key={idx} style={{
                  padding: '15px',
                  borderRadius: '12px',
                  border: '1px solid #edf2f7',
                  backgroundColor: editingContactIdx === idx ? '#f7fafc' : '#fff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.01)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {editingContactIdx === idx ? (
                    /* EDITING SINGLE CONTACT */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      <input
                        type="text"
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        style={inputStyle}
                      />
                      <input
                        type="tel"
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleSaveContactEdit(idx)}
                          disabled={updating}
                          style={{
                            backgroundColor: '#00b562',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: updating ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingContactIdx(null)}
                          style={{
                            backgroundColor: '#fff',
                            color: '#4a5568',
                            border: '1px solid #cbd5e0',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* READY STATE CONTACT CARD */
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#ebf8ff',
                          color: '#2b6cb0',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {contact.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2d3748' }}>{contact.name}</div>
                          <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>📱 {contact.phone}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => startEditContact(idx, contact)}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#4a5568',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                          title="Edit Contact"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteContact(idx)}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#e53e3e',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                          title="Delete Contact"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Styling definitions
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #cbd5e0',
  borderRadius: '8px',
  boxSizing: 'border-box' as const,
  fontSize: '14px',
  outline: 'none',
  transition: 'border 0.2s',
  backgroundColor: '#fff',
  fontFamily: 'sans-serif'
};
