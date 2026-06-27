'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { ArrowLeft, Trophy, Timer, Zap, Crown, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse } from '@/types';

const GAME = 'sud-tap';
const DURATION = 30; // seconds
const BUBBLE_LIFETIME = 1400; // ms before a bubble pops on its own
const SPAWN_MS = 620;

type Bubble = { id: number; x: number; y: number; r: number; golden: boolean };
type LeaderRow = { rank: number; name: string; score: number; isMe: boolean };
type Leaderboard = { top: LeaderRow[]; me: { rank: number; score: number } | null; players: number };

type Phase = 'idle' | 'playing' | 'over';

export default function GamePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [result, setResult] = useState<{ best: number; improved: boolean } | null>(null);

  const idRef = useRef(0);
  const scoreRef = useRef(0);

  const loadBoard = useCallback(() => {
    setBoardLoading(true);
    api
      .get<ApiResponse<Leaderboard>>(`/games/leaderboard?game=${GAME}&limit=10`)
      .then((r) => setBoard(r.data.data))
      .catch(() => setBoard(null))
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── game loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const spawn = setInterval(() => {
      const id = ++idRef.current;
      const golden = Math.floor(id * 2654435761) % 6 === 0; // deterministic-ish ~1/6 golden
      const b: Bubble = {
        id,
        x: 8 + ((id * 53) % 78),   // 8–86 %
        y: 12 + ((id * 37) % 70),  // 12–82 %
        r: golden ? 64 : 40 + ((id * 17) % 28),
        golden,
      };
      setBubbles((prev) => [...prev, b]);
      setTimeout(() => setBubbles((prev) => prev.filter((x) => x.id !== id)), BUBBLE_LIFETIME);
    }, SPAWN_MS);

    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(tick); clearInterval(spawn); endGame(); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => { clearInterval(spawn); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function start() {
    scoreRef.current = 0;
    idRef.current = 0;
    setScore(0);
    setTimeLeft(DURATION);
    setBubbles([]);
    setResult(null);
    setPhase('playing');
  }

  function pop(b: Bubble) {
    const gain = b.golden ? 5 : 1;
    scoreRef.current += gain;
    setScore(scoreRef.current);
    setBubbles((prev) => prev.filter((x) => x.id !== b.id));
    if (b.golden) {
      confetti({ particleCount: 24, spread: 50, scalar: 0.7, origin: { x: b.x / 100, y: b.y / 100 }, colors: ['#FACC15', '#3BF4BE'] });
    }
  }

  function endGame() {
    const finalScore = scoreRef.current;
    setBubbles([]);
    setPhase('over');
    api
      .post<ApiResponse<{ best: number; improved: boolean }>>('/games/scores', { game: GAME, score: finalScore })
      .then((r) => {
        setResult(r.data.data);
        if (r.data.data.improved && finalScore > 0) {
          confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors: ['#13C490', '#3BF4BE', '#9C74EC'] });
        }
        loadBoard();
      })
      .catch(() => { setResult({ best: finalScore, improved: false }); });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-body hover:text-ink"><ArrowLeft size={16} /> Dashboard</Link>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet"><Zap size={15} /> Sud Tap</span>
      </div>

      {/* ── PLAY AREA ─────────────────────────────────────────────────────── */}
      {phase === 'playing' ? (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink"><Trophy size={15} className="text-violet" /> {score}</span>
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${timeLeft <= 5 ? 'text-danger' : 'text-ink'}`}><Timer size={15} /> {timeLeft}s</span>
          </div>
          <div className="relative h-[24rem] w-full select-none bg-gradient-to-br from-mint-soft/60 to-violet-bg/40">
            {bubbles.map((b) => (
              <button
                key={b.id}
                onPointerDown={(e) => { e.preventDefault(); pop(b); }}
                aria-label="pop"
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform active:scale-90"
                style={{
                  left: `${b.x}%`, top: `${b.y}%`, width: b.r, height: b.r,
                  background: b.golden
                    ? 'radial-gradient(circle at 32% 30%, #FFF7C2, #FACC15 70%)'
                    : 'radial-gradient(circle at 32% 30%, rgba(255,255,255,.95), rgba(59,244,190,.55) 60%, rgba(19,196,144,.5))',
                  boxShadow: b.golden ? '0 4px 14px rgba(250,204,21,.45)' : '0 4px 12px rgba(19,196,144,.3)',
                  border: '1px solid rgba(255,255,255,.7)',
                }}
              >
                {b.golden && <Crown size={18} className="mx-auto text-amber-700" />}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          {phase === 'idle' ? (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-bg text-violet"><Zap size={26} /></span>
              <h1 className="mt-4 text-xl font-bold text-ink">Pop the suds!</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-body">Tap as many bubbles as you can in {DURATION} seconds. Normal suds are <b>1 point</b>, golden ones are <b>5</b> — but they all pop on their own, so be quick.</p>
            </>
          ) : (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg text-success"><Trophy size={26} /></span>
              <h1 className="mt-4 text-xl font-bold text-ink">{result?.improved ? 'New personal best! 🎉' : 'Time’s up!'}</h1>
              <p className="mt-1 text-3xl font-extrabold text-violet">{score}</p>
              <p className="mt-1 text-sm text-body">{result?.improved ? 'You climbed the leaderboard.' : `Your best is still ${result?.best ?? score}. Go again!`}</p>
            </>
          )}
          <button onClick={start} className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet px-7 py-3 text-sm font-semibold text-white hover:opacity-90">
            {phase === 'idle' ? 'Start game' : 'Play again'}
          </button>
        </Card>
      )}

      {/* ── LEADERBOARD ───────────────────────────────────────────────────── */}
      {phase !== 'playing' && (
        <Card className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 font-semibold text-ink"><Crown size={16} className="text-warn" /> Vendor leaderboard</h2>
            <button onClick={loadBoard} className="text-faint hover:text-ink" aria-label="refresh"><RefreshCw size={15} /></button>
          </div>

          {boardLoading ? (
            <div className="flex justify-center py-8 text-violet"><Spinner /></div>
          ) : !board || board.top.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">No scores yet — be the first to set one!</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {board.top.map((r) => (
                <li key={r.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${r.isMe ? 'bg-mint-soft font-semibold text-forest' : 'text-body'}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${r.rank === 1 ? 'bg-warn-bg text-warn' : r.rank <= 3 ? 'bg-section text-ink' : 'bg-section text-faint'}`}>{r.rank}</span>
                  <span className="flex-1 truncate">{r.name}{r.isMe && ' (you)'}</span>
                  <span className="font-bold text-ink">{r.score}</span>
                </li>
              ))}
            </ul>
          )}

          {board?.me && !board.top.some((r) => r.isMe) && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-mint-soft px-3 py-2 text-sm font-semibold text-forest">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-forest">{board.me.rank}</span>
              <span className="flex-1">You</span>
              <span className="font-bold">{board.me.score}</span>
            </div>
          )}

          {board && <p className="mt-3 text-center text-xs text-faint">{board.players} vendor{board.players === 1 ? '' : 's'} playing</p>}
        </Card>
      )}
    </div>
  );
}
