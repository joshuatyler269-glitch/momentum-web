import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Quest {
  id: string;
  title: string;
  completed: boolean;
  xpReward: number;
}

export const Dashboard: React.FC<{ user: any }> = ({ user }) => {
  // RPG State
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(120);
  const maxXp = 300;
  
  const [quests, setQuests] = useState<Quest[]>([
    { id: '1', title: 'Clear Inbox Zero (Urgent)', completed: false, xpReward: 50 },
    { id: '2', title: '30 Min Deep Work Session', completed: true, xpReward: 100 },
    { id: '3', title: 'Hydrate & Stretch', completed: false, xpReward: 30 },
  ]);
  const [newQuestTitle, setNewQuestTitle] = useState('');

  // Doomsday Timer State
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      setAlarmTriggered(true);
      playAlarmSound();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleQuest = (id: string, xpReward: number) => {
    setQuests(
      quests.map((q) => {
        if (q.id === id) {
          const nextCompleted = !q.completed;
          const xpChange = nextCompleted ? xpReward : -xpReward;
          
          // Update XP and Level
          let updatedXp = xp + xpChange;
          let updatedLevel = level;
          if (updatedXp >= maxXp) {
            updatedLevel += 1;
            updatedXp -= maxXp;
          } else if (updatedXp < 0) {
            updatedXp = 0;
          }
          setXp(updatedXp);
          setLevel(updatedLevel);

          return { ...q, completed: nextCompleted };
        }
        return q;
      })
    );
  };

  const addQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle.trim()) return;
    setQuests([
      ...quests,
      { id: Date.now().toString(), title: newQuestTitle, completed: false, xpReward: 50 },
    ]);
    setNewQuestTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 space-y-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header / RPG Profile Card */}
        <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-red-950/40 border border-purple-500/30 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-wide text-purple-400">HERO DASHBOARD</h1>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
                  LVL {level}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">{user.email}</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl transition"
            >
              Sign Out
            </button>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>XP Progress</span>
              <span>{xp} / {maxXp} XP</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-500"
                style={{ width: `${(xp / maxXp) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Doomsday Timer Section */}
        <div className={`bg-slate-900 border p-6 rounded-3xl shadow-2xl text-center space-y-4 transition duration-500 ${alarmTriggered ? 'border-red-600 animate-pulse bg-red-950/20' : 'border-slate-800'}`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest text-red-500">⚡ DOOMSDAY FOCUS TIMER</span>
            {alarmTriggered && <span className="text-xs text-red-400 font-bold animate-bounce">⚠️ TIME EXPIRED! RING ACTIVE</span>}
          </div>

          <div className="text-5xl md:text-6xl font-extrabold tracking-widest text-red-500 font-mono py-2">
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setIsTimerActive(!isTimerActive);
                setAlarmTriggered(false);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition shadow-lg ${
                isTimerActive ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isTimerActive ? 'PAUSE DOOMSDAY' : 'START COUNTDOWN'}
            </button>
            <button
              onClick={() => {
                setIsTimerActive(false);
                setTimeLeft(25 * 60);
                setAlarmTriggered(false);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* SideQuest Habit List */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-200">Active Quests</h2>
            <span className="text-xs text-slate-400">Complete tasks to earn XP</span>
          </div>

          <form onSubmit={addQuest} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a new side quest..."
              value={newQuestTitle}
              onChange={(e) => setNewQuestTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold rounded-xl transition"
            >
              Accept Quest
            </button>
          </form>

          <div className="space-y-3 mt-2">
            {quests.map((q) => (
              <div
                key={q.id}
                onClick={() => toggleQuest(q.id, q.xpReward)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition cursor-pointer ${
                  q.completed
                    ? 'bg-purple-950/20 border-purple-500/40 text-slate-400 line-through'
                    : 'bg-slate-800/50 border-slate-700/60 text-white hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-xl flex items-center justify-center border font-bold text-xs ${q.completed ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-600'}`}>
                    {q.completed && '✓'}
                  </div>
                  <span className="font-semibold text-xs">{q.title}</span>
                </div>
                <div className="text-xs bg-purple-950/60 border border-purple-500/30 px-3 py-1 rounded-xl text-purple-300 font-bold">
                  +{q.xpReward} XP
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
