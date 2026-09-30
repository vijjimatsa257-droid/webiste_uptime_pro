import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, Check, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
  currentEmail: string;
  isDark: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentEmail,
  isDark
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide an email and password');
      return;
    }
    setError(null);
    onLogin(email.trim());
    onClose();
  };

  const handleDemoLogin = (demoEmail: string) => {
    onLogin(demoEmail);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-sm rounded-xl border p-6 shadow-2xl transition-all ${
          isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm">
              {isSignUp ? 'Create Workspace Account' : 'Sign in to Uptime Checker'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 text-xs text-neutral-400">
          Currently signed in as: <strong className="text-neutral-200">{currentEmail}</strong>
        </div>

        {error && (
          <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={`w-full rounded-lg border py-2 pl-8 pr-3 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full rounded-lg border py-2 pl-8 pr-3 text-xs transition-colors focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'border-neutral-800 bg-neutral-950 text-neutral-100' : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors mt-2"
          >
            <span>{isSignUp ? 'Sign Up with Email' : 'Sign In to Workspace'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Demo Switchers */}
        <div className="mt-4 pt-3 border-t border-inherit space-y-2">
          <div className="text-[11px] text-neutral-500 font-medium">Quick Workspace Switcher:</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@uptimechecker.pro')}
              className={`flex-1 rounded-lg border p-1.5 text-[11px] font-mono transition-colors text-center ${
                isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              admin@uptime
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('dev@client-ops.io')}
              className={`flex-1 rounded-lg border p-1.5 text-[11px] font-mono transition-colors text-center ${
                isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              dev@client-ops
            </button>
          </div>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-emerald-400 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
