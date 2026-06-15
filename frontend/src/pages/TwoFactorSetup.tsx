import { useState } from 'react';
import { authApi } from '../services/api';
import { TwoFactorSetup } from '../types';
import toast from 'react-hot-toast';

export default function TwoFactorSetupPage() {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'done'>('initial');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await authApi.setup2FA();
      setSetup(data);
      setStep('setup');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to setup 2FA');
    }
    setLoading(false);
  };

  const verifySetup = async () => {
    if (!verifyCode) { toast.error('Enter the code from your authenticator app'); return; }
    setLoading(true);
    try {
      await authApi.verify2FA(verifyCode);
      toast.success('2FA enabled successfully');
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid code');
    }
    setLoading(false);
  };

  const disable2FA = async () => {
    if (!password) { toast.error('Password is required'); return; }
    setLoading(true);
    try {
      await authApi.disable2FA(password);
      toast.success('2FA disabled');
      setStep('initial');
      setSetup(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to disable');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
        <p className="text-white/50 mt-1">Add an extra layer of security to your account</p>
      </div>

      {step === 'initial' && (
        <div className="glass p-6 rounded-2xl space-y-4">
          <p className="text-white/70">Protect your account with TOTP-based two-factor authentication. You'll need an authenticator app like Google Authenticator or Authy.</p>
          <button onClick={startSetup} disabled={loading} className="px-6 py-2.5 bg-cyan text-dark font-medium rounded-xl hover:bg-cyan/90 transition disabled:opacity-50">
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
          <div className="mt-4">
            <p className="text-sm text-white/30 mb-2">To disable 2FA, enter your password:</p>
            <div className="flex gap-2">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="flex-1 px-4 py-2 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30" />
              <button onClick={disable2FA} disabled={loading} className="px-4 py-2 bg-red/80 text-white rounded-xl hover:bg-red transition disabled:opacity-50">Disable</button>
            </div>
          </div>
        </div>
      )}

      {step === 'setup' && setup && (
        <div className="glass p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Scan QR Code</h2>
          <p className="text-white/50">Scan this QR code with your authenticator app, then enter the verification code below.</p>
          <div className="flex justify-center">
            <img src={setup.qrCode} alt="2FA QR Code" className="bg-white p-2 rounded-xl" />
          </div>
          <div className="text-center">
            <p className="text-sm text-white/50">Or enter this key manually:</p>
            <code className="text-cyan text-sm break-all select-all">{setup.secret}</code>
          </div>
          <div className="flex gap-2">
            <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="6-digit code" maxLength={6} className="flex-1 px-4 py-2 rounded-xl glass text-white placeholder-white/30 outline-none focus:border-cyan/30 text-center text-lg tracking-widest" />
            <button onClick={verifySetup} disabled={loading || verifyCode.length !== 6} className="px-6 py-2.5 bg-cyan text-dark font-medium rounded-xl hover:bg-cyan/90 transition disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {setup.backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-yellow font-medium mb-2">Save these backup codes!</p>
              <p className="text-xs text-white/50 mb-2">Each code can only be used once. Store them somewhere safe.</p>
              <div className="grid grid-cols-2 gap-1">
                {setup.backupCodes.map((code, i) => (
                  <code key={i} className="text-sm text-white/80 font-mono">{code}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="glass p-6 rounded-2xl space-y-4 text-center">
          <div className="text-4xl mb-2">✓</div>
          <h2 className="text-lg font-semibold text-cyan">2FA Enabled</h2>
          <p className="text-white/50">Your account is now protected with two-factor authentication.</p>
          {setup?.backupCodes && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl text-left">
              <p className="text-sm text-yellow font-medium mb-2">Your backup codes (save these!)</p>
              <div className="grid grid-cols-2 gap-1">
                {setup.backupCodes.map((code, i) => (
                  <code key={i} className="text-sm text-white/80 font-mono">{code}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
