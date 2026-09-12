'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  const handleClearAndReload = () => {
    try {
      localStorage.removeItem('smart_review_session_v4');
      localStorage.removeItem('smart_review_session_v2');
    } catch (e) {}
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Session ou Affichage Interrompu</h2>
          <p className="text-xs text-zinc-400 mt-2">
            Une mise à jour ou des données de session antérieures nécessitent une réinitialisation locale.
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleClearAndReload}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Réinitialiser la session & Recharger
          </button>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}
