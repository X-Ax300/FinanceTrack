import { TrendingUp } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo with animation */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/40 animate-bounce">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">FinanceTrack</h1>
          <p className="text-sm text-gray-400">Initializing your dashboard...</p>
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Progress text */}
        <p className="text-xs text-gray-500 mt-4">
          Loading critical data...
        </p>
      </div>
    </div>
  );
}
