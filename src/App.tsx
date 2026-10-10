import React, { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Momentum Dashboard</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition"
        >
          Sign Out
        </button>
      </div>
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <p className="text-slate-300">Welcome back, <span className="text-indigo-400 font-semibold">{session.user.email}</span>!</p>
      </div>
    </div>
  );
}
