import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, Phone, Calendar, Lock, ShieldCheck, 
  AlertCircle, CheckCircle, Edit2, X, PlusCircle, UserPlus, Trash2 
} from 'lucide-react';

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

  const [isEditMode, setIsEditMode] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  
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
          const dateObj = new Date(data.dob);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          setDob(`${yyyy}-${mm}-${dd}`);
        } else {
          setDob('');
        }

        if (data.trustedContacts) {
          const parsed = typeof data.trustedContacts === 'string' ? JSON.parse(data.trustedContacts) : data.trustedContacts;
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
    setError(null); setSuccess(null);
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
    setError(null); setSuccess(null);

    if (!email.trim()) {
      setError('Email address cannot be empty.'); return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.'); return;
    }

    if (password && password.length < 6) {
      setError('New password must be at least 6 characters long.'); return;
    }

    setUpdating(true);
    try {
      const payload: any = {
        name: name.trim() || null,
        email: email.trim(),
        gender: gender || null,
        dob: dob || null,
        trustedContacts: contacts
      };
      if (password) payload.password = password;

      const res = await api.updateProfile(payload);
      setProfile(res);
      setSuccess('Profile updated successfully!');
      setIsEditMode(false);
      setPassword('');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError('Contact name and phone number are required.'); return;
    }

    const updatedContacts = [...contacts, { name: newContactName.trim(), phone: newContactPhone.trim() }];
    
    setUpdating(true);
    try {
      await api.updateProfile({ trustedContacts: updatedContacts });
      setContacts(updatedContacts);
      setNewContactName(''); setNewContactPhone('');
      setIsAddingContact(false);
      setSuccess('Trusted contact added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add trusted contact.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteContact = async (indexToDelete: number) => {
    setError(null); setSuccess(null);
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

  const handleSaveContactEdit = async (idx: number) => {
    setError(null); setSuccess(null);

    if (!editContactName.trim() || !editContactPhone.trim()) {
      setError('Contact name and phone number cannot be empty.'); return;
    }

    const updatedContacts = [...contacts];
    updatedContacts[idx] = { name: editContactName.trim(), phone: editContactPhone.trim() };

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-green border-t-transparent"></div>
        <p className="mt-4 text-slate-500 font-semibold">Loading your profile...</p>
      </div>
    );
  }

  const userInitials = (name || email || 'C').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3"><AlertCircle className="w-5 h-5 shrink-0" /> {error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-brand-green p-4 rounded-xl mb-6 text-sm font-semibold border border-green-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 shrink-0" /> {success}</div>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Header Profile Summary Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-950/30 border-4 border-brand-green/20 text-brand-green text-3xl font-extrabold flex items-center justify-center shadow-inner">
            {userInitials}
          </div>
          <div className="mt-2 md:mt-0">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">{name || 'RideNow Customer'}</h2>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </span>
              {profile?.averageRating !== undefined && profile?.averageRating !== null && (
                <span className="text-sm font-bold text-brand-green bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1.5">
                  ⭐ {profile.averageRating} ({profile.totalRatings} reviews)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {!isEditMode && (
          <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 bg-brand-green hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold transition shadow-lg shadow-brand-green/20">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Personal details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">Personal Information</h3>

          {isEditMode ? (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green transition" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green transition">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Date of Birth</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Update Password <span className="font-normal text-slate-400 normal-case">(leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-brand-green focus:border-brand-green transition" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mt-2">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wide mb-2">
                  <ShieldCheck className="w-4 h-4 text-brand-green" /> Registered Mobile
                </div>
                <div className="text-lg font-bold text-slate-900 mb-2">{phone}</div>
                <p className="text-xs text-slate-500 leading-relaxed">Verified phone details are securely locked and cannot be directly modified. Contact support to request edits.</p>
              </div>

              <div className="flex gap-4 mt-4">
                <button type="submit" disabled={updating}
                  className="flex-1 bg-brand-green hover:bg-green-600 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-brand-green/20 disabled:opacity-70">
                  {updating ? 'Saving...' : 'Save Profile'}
                </button>
                <button type="button" onClick={handleCancelEdit} disabled={updating}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-3 rounded-xl font-bold transition disabled:opacity-70">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</span>
                  <span className="text-base font-bold text-slate-900">{profile?.name || 'Not provided'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</span>
                  <span className="text-base font-bold text-slate-900">{profile?.gender || 'Not specified'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</span>
                  <span className="text-base font-bold text-slate-900 break-all">{profile?.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</span>
                  <span className="text-base font-bold text-slate-900">
                    {profile?.dob ? new Date(profile.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Phone</span>
                  <span className="text-[10px] font-bold text-brand-green bg-green-50 px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secured</span>
                </div>
                <div className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5 text-slate-400" /> {profile?.phone}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Verified phone details are securely locked and cannot be directly modified. Contact support to request edits.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Safety center */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Safety Contacts</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Share your live location & alerts</p>
            </div>
            {!isAddingContact && (
              <button onClick={() => { setIsAddingContact(true); setError(null); setSuccess(null); }}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold transition">
                <PlusCircle className="w-4 h-4" /> Add New
              </button>
            )}
          </div>

          {isAddingContact && (
            <form onSubmit={handleAddContact} className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Add Safety Contact</h4>
              <div className="flex flex-col gap-3 mb-4">
                <input type="text" placeholder="Contact Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green transition" />
                <input type="tel" placeholder="Contact Phone Number" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green transition" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={updating}
                  className="flex-1 bg-brand-green hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition disabled:opacity-70">
                  Save
                </button>
                <button type="button" onClick={() => setIsAddingContact(false)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 rounded-lg text-sm font-bold transition">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {contacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <UserPlus className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-base font-bold text-slate-700 mb-2">Keep loved ones informed</h4>
              <p className="text-sm text-slate-500 max-w-[250px]">Add family or friends to quickly share your live location or send emergency alerts.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {contacts.map((contact, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition ${editingContactIdx === idx ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'}`}>
                  {editingContactIdx === idx ? (
                    <div className="flex flex-col gap-3 w-full">
                      <input type="text" value={editContactName} onChange={e => setEditContactName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green transition" />
                      <input type="tel" value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green transition" />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleSaveContactEdit(idx)} disabled={updating}
                          className="px-4 py-1.5 bg-brand-green text-white rounded-md text-xs font-bold disabled:opacity-70">Save</button>
                        <button onClick={() => setEditingContactIdx(null)}
                          className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                          {contact.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{contact.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{contact.phone}</div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditContact(idx, contact)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteContact(idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
