import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiSave, FiAtSign, FiEye, FiEyeOff } from 'react-icons/fi';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function Profile() {
  const { user, login } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({ username, email, displayName });
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      localStorage.setItem('token', res.token);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password changed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold mb-1">Profile</h2>
        <p className="text-sm text-white/40">Manage your account settings</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan to-coral flex items-center justify-center text-xl font-bold">
            {(displayName || username)?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{displayName || username}</h3>
            <p className="text-sm text-white/40">{email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              <FiUser className="inline mr-1.5" size={12} />
              Display Name
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              <FiAtSign className="inline mr-1.5" size={12} />
              Username
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              <FiMail className="inline mr-1.5" size={12} />
              Email
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
            />
          </div>

          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FiSave size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold mb-1">
          <FiLock className="inline mr-2" size={16} />
          Change Password
        </h3>
        <p className="text-sm text-white/40 mb-5">Update your account password</p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Current Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="w-full px-3 py-2.5 pr-10 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <FiLock size={14} />
            {saving ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default Profile;
