import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Swords, Users, Copy, Crown, Check, X, Share2, Trophy, ChevronLeft, Loader2, Zap } from 'lucide-react';
import { socketService } from '../../../lib/socketService';
import { api } from '../../../lib/api';

/**
 * Class Battle — live multiplayer quiz.
 * A student hosts a battle for their class+subject, classmates join with a code,
 * and everyone answers the same questions at the same time with a live scoreboard.
 */

type Phase = 'menu' | 'create' | 'join' | 'lobby' | 'question' | 'reveal' | 'ended';

interface RosterPlayer { id: string; name: string; avatar: string | null; score: number; lastCorrect?: boolean; }

interface ClassBattleScreenProps {
    student?: any;
    studentId?: string;
    schoolId?: string;
    gameId?: string;
    subject?: string;
    onBack?: () => void;
}

const COUNT_OPTIONS = [5, 8, 12];

const ClassBattleScreen: React.FC<ClassBattleScreenProps> = ({ student, studentId, schoolId, gameId, onBack }) => {
    const me = useMemo(() => ({
        id: student?.user_id || student?.userId || studentId || student?.id || 'me',
        name: student?.name || student?.full_name || 'Player',
        avatar: student?.avatar_url || student?.photo_url || null,
    }), [student, studentId]);

    const sId = schoolId || student?.school_id || '';

    const [phase, setPhase] = useState<Phase>('menu');
    const [setup, setSetup] = useState<{ subjects: string[]; grade: number; className: string } | null>(null);
    const [subject, setSubject] = useState<string>('');
    const [count, setCount] = useState<number>(8);
    const [code, setCode] = useState<string>('');
    const [joinInput, setJoinInput] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [solo, setSolo] = useState(false);
    const [players, setPlayers] = useState<RosterPlayer[]>([]);
    const [classmates, setClassmates] = useState<any[]>([]);
    const [busy, setBusy] = useState(false);
    const [starting, setStarting] = useState(false);

    // active question state
    const [q, setQ] = useState<any | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [reveal, setReveal] = useState<{ answer: number; explanation: string } | null>(null);
    const [remaining, setRemaining] = useState(100);
    const [final, setFinal] = useState<RosterPlayer[]>([]);

    const codeRef = useRef('');
    codeRef.current = code;

    // Load the game's subjects + grade + classmates once.
    useEffect(() => {
        socketService.ensure(sId);
        (async () => {
            if (gameId) {
                try {
                    const s = await api.getBattleSetup(gameId);
                    setSetup(s);
                    setSubject(s?.subjects?.[0] || 'General Knowledge');
                } catch { setSubject('General Knowledge'); }
            } else {
                setSubject('General Knowledge');
            }
            try { setClassmates(await api.getClassmates()); } catch { /* none */ }
        })();
    }, [gameId, sId]);

    // Socket subscriptions for the whole battle lifecycle.
    useEffect(() => {
        const onRoster = (r: any) => { setPlayers(r.players || []); };
        const onQuestion = (data: any) => {
            setQ(data); setPicked(null); setReveal(null); setPhase('question');
            const total = data.durationMs || 20000;
            const tick = () => {
                const left = Math.max(0, data.deadline - Date.now());
                setRemaining(Math.round((left / total) * 100));
            };
            tick();
        };
        const onReveal = (data: any) => {
            setReveal({ answer: data.answer, explanation: data.explanation });
            setPlayers(data.scoreboard || []);
            setPhase('reveal');
        };
        const onEnded = (data: any) => { setFinal(data.scoreboard || []); setPhase('ended'); };
        const onError = (data: any) => toast.error(data?.message || 'Battle error');

        socketService.on('cb:roster', onRoster);
        socketService.on('cb:question', onQuestion);
        socketService.on('cb:reveal', onReveal);
        socketService.on('cb:ended', onEnded);
        socketService.on('cb:error', onError);
        return () => {
            socketService.off('cb:roster', onRoster);
            socketService.off('cb:question', onQuestion);
            socketService.off('cb:reveal', onReveal);
            socketService.off('cb:ended', onEnded);
            socketService.off('cb:error', onError);
            if (codeRef.current) socketService.emit('cb:leave', { code: codeRef.current, playerId: me.id });
        };
    }, [me.id]);

    // Smooth countdown bar while a question is live.
    useEffect(() => {
        if (phase !== 'question' || !q) return;
        const total = q.durationMs || 20000;
        const iv = setInterval(() => {
            const left = Math.max(0, q.deadline - Date.now());
            setRemaining(Math.round((left / total) * 100));
        }, 200);
        return () => clearInterval(iv);
    }, [phase, q]);

    const createRoom = (autoStart = false) => {
        setBusy(true);
        let done = false;
        const timeout = setTimeout(() => {
            if (done) return;
            done = true;
            setBusy(false);
            toast.error("Couldn't reach the battle server — check your connection and try again.");
        }, 10000);
        socketService.emit('cb:create', {
            gameId, schoolId: sId, subject, grade: setup?.grade ?? 5, questionCount: count,
            host: me,
        }, (res: any) => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            setBusy(false);
            if (res?.error) return toast.error(res.error);
            setCode(res.code); setIsHost(true); setPlayers(res.roster?.players || []);
            if (autoStart) startBattle(res.code); // solo: jump straight into the game
            else setPhase('lobby');
        });
    };

    const joinRoom = () => {
        const c = joinInput.trim().toUpperCase();
        if (c.length < 4) return toast.error('Enter the 5-letter battle code');
        setBusy(true);
        let done = false;
        const timeout = setTimeout(() => {
            if (done) return;
            done = true;
            setBusy(false);
            toast.error("Couldn't reach the battle server — check your connection and try again.");
        }, 10000);
        socketService.emit('cb:join', { code: c, player: me }, (res: any) => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            setBusy(false);
            if (res?.error) return toast.error(res.error);
            setCode(c); setIsHost(false); setPlayers(res.roster?.players || []); setPhase('lobby');
        });
    };

    const startBattle = (c: string = code) => {
        setStarting(true);
        let done = false;
        const timeout = setTimeout(() => {
            if (done) return;
            done = true;
            setStarting(false);
            toast.error("Couldn't start the battle — check your connection and try again.");
        }, 15000);
        socketService.emit('cb:start', { code: c, playerId: me.id }, (res: any) => {
            if (done) return;
            done = true;
            clearTimeout(timeout);
            setStarting(false);
            if (res?.error) toast.error(res.error);
        });
    };

    const answer = (i: number) => {
        if (picked !== null || reveal) return;
        setPicked(i);
        socketService.emit('cb:answer', { code, playerId: me.id, optionIndex: i });
    };

    const copyCode = async () => {
        try { await navigator.clipboard.writeText(code); toast.success('Code copied — share it with your class!'); }
        catch { toast(code, { icon: '📋' }); }
    };

    const shareCode = async () => {
        const text = `Join my Class Battle! Open the school app → Games → Class Battle → Join, and enter code ${code}. Let's learn together! 🎮`;
        try {
            if ((navigator as any).share) await (navigator as any).share({ title: 'Class Battle', text });
            else { await navigator.clipboard.writeText(text); toast.success('Invite copied — paste it to your class group!'); }
        } catch { /* user cancelled */ }
    };

    // ---- shared header ----
    const Header = ({ title, sub }: { title: string; sub?: string }) => (
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"><Swords className="w-6 h-6" /></div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                    {sub && <p className="text-orange-50/90 text-sm font-medium">{sub}</p>}
                </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        </div>
    );

    return (
        <div className="h-full overflow-y-auto bg-gray-50 pb-24">
            <div className="max-w-3xl mx-auto w-full p-4 space-y-6">
                {onBack && phase !== 'question' && phase !== 'reveal' && (
                    <button onClick={onBack} className="flex items-center gap-1 text-gray-500 font-bold text-sm hover:text-gray-800">
                        <ChevronLeft className="w-4 h-4" /> Back to Games
                    </button>
                )}

                {/* MENU */}
                {phase === 'menu' && (
                    <>
                        <Header title="Class Battle" sub={setup?.className ? `${setup.className} • play solo or together` : 'Play solo or together'} />
                        <button onClick={() => { setSolo(true); setPhase('create'); }} className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-left text-white shadow-lg hover:opacity-95 transition flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"><Zap className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-black text-lg">Play Solo</h3>
                                <p className="text-sm text-emerald-50/90 mt-0.5">Practice on your own — answer the questions and beat your best score.</p>
                            </div>
                        </button>
                        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400">or play together</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => { setSolo(false); setPhase('create'); }} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left hover:ring-2 hover:ring-orange-300 transition">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3"><Crown className="w-6 h-6" /></div>
                                <h3 className="font-black text-lg text-gray-900">Create Battle</h3>
                                <p className="text-sm text-gray-500 mt-1">Pick a subject and invite your classmates to join.</p>
                            </button>
                            <button onClick={() => setPhase('join')} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left hover:ring-2 hover:ring-indigo-300 transition">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3"><Users className="w-6 h-6" /></div>
                                <h3 className="font-black text-lg text-gray-900">Join Battle</h3>
                                <p className="text-sm text-gray-500 mt-1">Got a code from a friend? Enter it and jump in.</p>
                            </button>
                        </div>
                    </>
                )}

                {/* CREATE */}
                {phase === 'create' && (
                    <>
                        <Header title={solo ? 'Solo Practice' : 'Create Battle'} sub="Choose what to play" />
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div>
                                <p className="font-bold text-gray-800 mb-2">Subject</p>
                                <div className="flex flex-wrap gap-2">
                                    {(setup?.subjects || ['General Knowledge']).map(s => (
                                        <button key={s} onClick={() => setSubject(s)} className={`px-4 py-2 rounded-full text-sm font-bold transition ${subject === s ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 mb-2">Questions</p>
                                <div className="flex gap-2">
                                    {COUNT_OPTIONS.map(n => (
                                        <button key={n} onClick={() => setCount(n)} className={`px-5 py-2 rounded-full text-sm font-bold transition ${count === n ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{n}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => createRoom(solo)} disabled={busy} className={`w-full py-3 rounded-xl text-white font-black text-lg disabled:opacity-60 flex items-center justify-center gap-2 ${solo ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />} {solo ? 'Start Solo Game' : 'Create Battle'}
                            </button>
                        </div>
                    </>
                )}

                {/* JOIN */}
                {phase === 'join' && (
                    <>
                        <Header title="Join Battle" sub="Enter the code your friend shared" />
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <input
                                value={joinInput}
                                onChange={e => setJoinInput(e.target.value.toUpperCase())}
                                maxLength={5}
                                placeholder="ABCDE"
                                className="w-full text-center tracking-[0.5em] text-3xl font-black uppercase py-4 rounded-xl border-2 border-gray-200 focus:border-indigo-400 outline-none"
                            />
                            <button onClick={joinRoom} disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />} Join
                            </button>
                        </div>
                    </>
                )}

                {/* LOBBY */}
                {phase === 'lobby' && (
                    <>
                        <Header title="Battle Lobby" sub={subject} />
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Battle Code</p>
                            <p className="text-5xl font-black tracking-[0.3em] text-orange-600 my-2">{code}</p>
                            <div className="flex justify-center gap-3 mt-3">
                                <button onClick={copyCode} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"><Copy className="w-4 h-4" /> Copy</button>
                                <button onClick={shareCode} className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"><Share2 className="w-4 h-4" /> Invite Class</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <p className="font-black text-gray-900 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-orange-500" /> Players ({players.length})</p>
                            <div className="space-y-2">
                                {players.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                                        <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center">{p.name.charAt(0).toUpperCase()}</div>
                                        <span className="font-bold text-gray-800">{p.name}</span>
                                        {p.id === me.id && <span className="text-xs font-bold text-indigo-500 uppercase">You</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {classmates.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <p className="font-black text-gray-900 mb-1">Your Classmates</p>
                                <p className="text-xs text-gray-500 mb-3">Share the code above so they can join the battle.</p>
                                <div className="flex flex-wrap gap-2">
                                    {classmates.slice(0, 30).map(c => (
                                        <span key={c.id} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">{c.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isHost ? (
                            <button onClick={() => startBattle()} disabled={starting} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black text-lg shadow-lg hover:opacity-95 disabled:opacity-70 flex items-center justify-center gap-2">
                                {starting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />} {starting ? 'Starting…' : 'Start Battle'}
                            </button>
                        ) : (
                            <div className="text-center text-gray-500 font-bold py-3 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for the host to start…</div>
                        )}
                    </>
                )}

                {/* QUESTION / REVEAL */}
                {(phase === 'question' || phase === 'reveal') && q && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black">{q.subject}</span>
                            <span className="text-sm font-bold text-gray-500">Question {q.index + 1} / {q.total}</span>
                        </div>
                        {/* timer */}
                        <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full transition-all duration-200 ${remaining > 30 ? 'bg-green-500' : 'bg-rose-500'}`} style={{ width: `${reveal ? 100 : remaining}%` }} />
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 leading-snug">{q.prompt}</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.options.map((opt: string, i: number) => {
                                const isAnswer = reveal && reveal.answer === i;
                                const isWrongPick = reveal && picked === i && reveal.answer !== i;
                                const base = 'p-4 rounded-2xl font-bold text-left border-2 transition flex items-center justify-between';
                                let cls = 'bg-white border-gray-200 text-gray-800 hover:border-orange-300';
                                if (reveal) {
                                    if (isAnswer) cls = 'bg-green-50 border-green-400 text-green-800';
                                    else if (isWrongPick) cls = 'bg-rose-50 border-rose-400 text-rose-800';
                                    else cls = 'bg-white border-gray-200 text-gray-400';
                                } else if (picked === i) cls = 'bg-orange-50 border-orange-400 text-orange-800';
                                return (
                                    <button key={i} disabled={picked !== null || !!reveal} onClick={() => answer(i)} className={`${base} ${cls}`}>
                                        <span>{opt}</span>
                                        {isAnswer && <Check className="w-5 h-5 text-green-600" />}
                                        {isWrongPick && <X className="w-5 h-5 text-rose-600" />}
                                    </button>
                                );
                            })}
                        </div>

                        {phase === 'question' && picked !== null && (
                            <p className="text-center text-gray-500 font-bold text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4 text-green-500" /> Answer locked — waiting for others…</p>
                        )}

                        {reveal && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                                <p className="text-sm text-indigo-900"><strong>Why:</strong> {reveal.explanation}</p>
                            </div>
                        )}

                        {/* live scoreboard during reveal */}
                        {reveal && players.length > 0 && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <p className="font-black text-gray-900 mb-2 text-sm">Scoreboard</p>
                                {players.slice(0, 6).map((p, idx) => (
                                    <div key={p.id} className="flex items-center justify-between py-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 text-center font-black text-gray-400 text-sm">{idx + 1}</span>
                                            <span className={`font-bold ${p.id === me.id ? 'text-orange-600' : 'text-gray-800'}`}>{p.name}</span>
                                            {p.lastCorrect && <Check className="w-3.5 h-3.5 text-green-500" />}
                                        </div>
                                        <span className="font-black text-gray-900">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ENDED */}
                {phase === 'ended' && (
                    <>
                        <Header title="Battle Over!" sub="Great game — well played" />
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-end justify-center gap-3 mb-6">
                                {[1, 0, 2].map(rank => {
                                    const p = final[rank];
                                    if (!p) return <div key={rank} className="w-20" />;
                                    const heights = ['h-24', 'h-32', 'h-20'];
                                    const medals = ['🥈', '🥇', '🥉'];
                                    return (
                                        <div key={rank} className="flex flex-col items-center">
                                            <div className="text-3xl mb-1">{medals[rank]}</div>
                                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center mb-1">{p.name.charAt(0).toUpperCase()}</div>
                                            <p className="text-xs font-bold text-gray-700 text-center max-w-[72px] truncate">{p.name}</p>
                                            <div className={`${heights[rank]} w-16 rounded-t-xl bg-gradient-to-t from-orange-400 to-amber-300 flex items-start justify-center pt-2 mt-1`}>
                                                <span className="font-black text-white text-sm">{p.score}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="space-y-2">
                                {final.map((p, idx) => (
                                    <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${p.id === me.id ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 text-center font-black text-gray-400">{idx + 1}</span>
                                            <span className="font-bold text-gray-800">{p.name}</span>
                                            {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                                        </div>
                                        <span className="font-black text-orange-600">{p.score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setCode(''); setPlayers([]); setQ(null); setReveal(null); setFinal([]); setPhase('menu'); }} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-black hover:bg-orange-600">Play Again</button>
                            {onBack && <button onClick={onBack} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-black hover:bg-gray-200">Back to Games</button>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassBattleScreen;
