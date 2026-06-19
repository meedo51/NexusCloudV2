import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, isAuthenticated, pending2FA, verifyLogin2FA, cancel2FA } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
    } catch {
      // 2FA required - pending2FA state is set in context
    }
    setLoading(false);
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (backupCode) {
        await verifyLogin2FA(undefined, backupCode);
      } else {
        await verifyLogin2FA(totpCode);
      }
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid 2FA code');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="gradient-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-sm"
      >
        {!pending2FA ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                <span className="text-gradient">NexusCloud</span>
              </h1>
              <p className="text-white/40 text-sm">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                <span className="text-gradient">NexusCloud</span>
              </h1>
              <p className="text-white/40 text-sm">Two-factor authentication required</p>
            </div>

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Authentication Code</label>
                <input
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors text-center tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  disabled={!!backupCode}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/20">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-1.5">Backup Code</label>
                <input
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/20 outline-none focus:border-cyan/30 transition-colors"
                  placeholder="Enter backup code"
                  disabled={!!totpCode}
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!totpCode && !backupCode)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan to-cyan/80 text-space font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                type="button"
                onClick={cancel2FA}
                className="w-full py-2 rounded-xl text-white/40 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </form>
          </>
        )}

        {!pending2FA && (
          <p className="text-center text-sm text-white/40 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan hover:underline">Create one</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
