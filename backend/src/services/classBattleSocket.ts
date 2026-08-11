/**
 * Class Battle — real-time multiplayer engine (Socket.IO).
 *
 * Server-authoritative live quiz: a host creates a room (gets a short join code),
 * classmates join the lobby, the host starts, and everyone answers the SAME
 * questions simultaneously with a live, speed-weighted scoreboard. Final scores are
 * persisted to the GameScore leaderboard. Rooms live in memory (they're ephemeral),
 * keyed by join code.
 *
 * Events in:  cb:create, cb:join, cb:start, cb:answer, cb:leave
 * Events out: cb:roster, cb:question, cb:reveal, cb:ended, cb:error
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { buildRounds, BattleQuestion } from './gameContent.service';
import { GameScoreService } from './gameScore.service';
import { generateAIQuestions } from './gameQuestion.service';
import prisma from '../config/database';

/**
 * AI-generated rounds when possible (fresh, never-repeating questions across
 * a school), falling back to the offline procedural/curated bank on any
 * failure (missing API key, quota, network) so a battle never fails to start.
 */
async function buildRoundsForRoom(room: Room): Promise<BattleQuestion[]> {
    try {
        const hostStudent = await prisma.student.findUnique({
            where: { user_id: room.hostId },
            select: { id: true, branch_id: true },
        });
        if (!hostStudent) throw new Error('Host has no student profile');
        return await generateAIQuestions({
            schoolId: room.schoolId,
            branchId: hostStudent.branch_id,
            studentId: hostStudent.id,
            gameType: 'class-battle',
            subject: room.subject,
            grade: room.grade,
            count: room.questionCount,
            historyScope: 'school', // everyone in the room shares one question set
        });
    } catch (err: any) {
        console.warn('[ClassBattle] AI question generation failed, using offline bank:', err?.message);
        return buildRounds(room.subject, room.grade, room.questionCount);
    }
}

interface Player {
    id: string;            // user id
    name: string;
    avatar: string | null;
    socketId: string;
    score: number;
    answeredThisRound: boolean;
    lastCorrect: boolean;
}

interface Room {
    code: string;
    gameId: string;
    schoolId: string;
    subject: string;
    grade: number;
    hostId: string;
    status: 'lobby' | 'playing' | 'ended';
    players: Map<string, Player>;
    rounds: BattleQuestion[];
    current: number;
    deadline: number;
    timer: NodeJS.Timeout | null;
    questionCount: number;
    // Guards against revealRound() firing twice for the same question — it can be
    // invoked from two independent triggers (the deadline timer, or a 'cb:answer'
    // handler seeing everyone has answered) and only room.status was checked before,
    // which stays 'playing' during a reveal too.
    revealing: boolean;
    // Kicked off the moment the room is created so the AI call runs in the
    // background while players join the lobby — by the time the host taps
    // "Start", the questions are usually already sitting in memory instead
    // of making them wait for a live Gemini round trip.
    roundsPromise?: Promise<BattleQuestion[]>;
}

const QUESTION_MS = 20_000;   // time to answer each question
const REVEAL_MS = 4_000;      // pause to show the correct answer + scoreboard
const MAX_POINTS = 100;       // base points for a correct answer
const SPEED_BONUS = 100;      // extra points scaled by how fast you answered

const rooms = new Map<string, Room>();
const socketIndex = new Map<string, string>(); // socketId -> room code

function genCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
    let code = '';
    do {
        code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));
    return code;
}

function roster(room: Room) {
    return {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        subject: room.subject,
        questionCount: room.questionCount,
        players: [...room.players.values()]
            .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
            .sort((a, b) => b.score - a.score),
    };
}

function scoreboard(room: Room) {
    return [...room.players.values()]
        .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, lastCorrect: p.lastCorrect }))
        .sort((a, b) => b.score - a.score);
}

function emitRoster(io: SocketIOServer, room: Room) {
    io.to(`cb:${room.code}`).emit('cb:roster', roster(room));
}

function clearTimer(room: Room) {
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

function sendQuestion(io: SocketIOServer, room: Room) {
    const q = room.rounds[room.current];
    for (const p of room.players.values()) { p.answeredThisRound = false; p.lastCorrect = false; }
    room.revealing = false;
    room.deadline = Date.now() + QUESTION_MS;
    io.to(`cb:${room.code}`).emit('cb:question', {
        index: room.current,
        total: room.rounds.length,
        prompt: q.prompt,
        options: q.options,
        subject: room.subject,
        deadline: room.deadline,
        durationMs: QUESTION_MS,
    });
    clearTimer(room);
    room.timer = setTimeout(() => revealRound(io, room), QUESTION_MS + 200);
}

function revealRound(io: SocketIOServer, room: Room) {
    if (room.status !== 'playing' || room.revealing) return;
    room.revealing = true;
    clearTimer(room);
    const q = room.rounds[room.current];
    io.to(`cb:${room.code}`).emit('cb:reveal', {
        index: room.current,
        answer: q.answer,
        explanation: q.explanation,
        scoreboard: scoreboard(room),
    });
    room.timer = setTimeout(() => {
        room.current += 1;
        if (room.current >= room.rounds.length) {
            endGame(io, room);
        } else {
            sendQuestion(io, room);
        }
    }, REVEAL_MS);
}

async function endGame(io: SocketIOServer, room: Room) {
    clearTimer(room);
    room.status = 'ended';
    const final = scoreboard(room);
    io.to(`cb:${room.code}`).emit('cb:ended', { scoreboard: final, podium: final.slice(0, 3) });

    // Persist each player's result to the leaderboard (best-effort, per player).
    for (const p of room.players.values()) {
        try {
            await GameScoreService.submitScore({
                game_id: room.gameId,
                game_name: 'Class Battle',
                player_id: p.id,
                score: p.score,
                school_id: room.schoolId,
                metadata: { subject: room.subject, code: room.code, players: room.players.size },
            });
        } catch (err: any) { console.error('[ClassBattle] Failed to persist score for player', p.id, err?.message, err?.code); }
    }

    // Free the room shortly after so the code can be reused.
    setTimeout(() => {
        for (const p of room.players.values()) socketIndex.delete(p.socketId);
        rooms.delete(room.code);
    }, 60_000);
}

function leave(io: SocketIOServer, socket: Socket, code: string, playerId?: string) {
    const room = rooms.get(code);
    if (!room) return;
    const pid = playerId || [...room.players.values()].find(p => p.socketId === socket.id)?.id;
    if (pid) room.players.delete(pid);
    socketIndex.delete(socket.id);
    socket.leave(`cb:${code}`);

    if (room.players.size === 0) {
        clearTimer(room);
        rooms.delete(code);
        return;
    }
    // If the host left, hand the room to the next player.
    if (room.hostId === pid) room.hostId = [...room.players.values()][0].id;
    emitRoster(io, room);
}

export function registerClassBattle(io: SocketIOServer, socket: Socket) {
    socket.on('cb:create', (payload: any, cb?: (r: any) => void) => {
        try {
            const { gameId, schoolId, subject, grade, questionCount, host } = payload || {};
            if (!host?.id) return cb?.({ error: 'Missing host' });
            const code = genCode();
            const room: Room = {
                code, gameId: gameId || 'class-battle', schoolId: schoolId || '',
                subject: subject || 'General Knowledge', grade: Number(grade ?? 5),
                hostId: host.id, status: 'lobby', players: new Map(),
                rounds: [], current: 0, deadline: 0, timer: null, revealing: false,
                questionCount: Math.min(Math.max(Number(questionCount) || 8, 3), 15),
            };
            room.players.set(host.id, { id: host.id, name: host.name || 'Host', avatar: host.avatar || null, socketId: socket.id, score: 0, answeredThisRound: false, lastCorrect: false });
            room.roundsPromise = buildRoundsForRoom(room);
            rooms.set(code, room);
            socketIndex.set(socket.id, code);
            socket.join(`cb:${code}`);
            cb?.({ code, roster: roster(room) });
            emitRoster(io, room);
        } catch (e: any) { cb?.({ error: e.message }); }
    });

    socket.on('cb:join', (payload: any, cb?: (r: any) => void) => {
        const { code, player } = payload || {};
        const room = rooms.get((code || '').toUpperCase());
        if (!room) return cb?.({ error: 'Battle not found — check the code.' });
        if (room.status !== 'lobby') return cb?.({ error: 'This battle has already started.' });
        if (!player?.id) return cb?.({ error: 'Missing player' });
        const existing = room.players.get(player.id);
        if (existing) { existing.socketId = socket.id; } // rejoin
        else room.players.set(player.id, { id: player.id, name: player.name || 'Player', avatar: player.avatar || null, socketId: socket.id, score: 0, answeredThisRound: false, lastCorrect: false });
        socketIndex.set(socket.id, room.code);
        socket.join(`cb:${room.code}`);
        cb?.({ ok: true, roster: roster(room) });
        emitRoster(io, room);
    });

    socket.on('cb:start', async (payload: any, cb?: (r: any) => void) => {
        const { code, playerId } = payload || {};
        const room = rooms.get((code || '').toUpperCase());
        if (!room) return cb?.({ error: 'Battle not found.' });
        if (room.hostId !== playerId) return cb?.({ error: 'Only the host can start.' });
        if (room.status !== 'lobby') return cb?.({ error: 'Already started.' });
        room.rounds = await (room.roundsPromise || buildRoundsForRoom(room));
        room.current = 0;
        room.status = 'playing';
        cb?.({ ok: true });
        sendQuestion(io, room);
    });

    socket.on('cb:answer', (payload: any) => {
        const { code, playerId, optionIndex } = payload || {};
        const room = rooms.get((code || '').toUpperCase());
        if (!room || room.status !== 'playing') return;
        if (Date.now() > room.deadline) return; // question window already closed server-side
        const p = room.players.get(playerId);
        if (!p || p.answeredThisRound) return;
        p.answeredThisRound = true;
        const q = room.rounds[room.current];
        if (optionIndex === q.answer) {
            const remaining = Math.max(0, room.deadline - Date.now());
            const speed = Math.round(SPEED_BONUS * (remaining / QUESTION_MS));
            p.score += MAX_POINTS + speed;
            p.lastCorrect = true;
        }
        // Everyone answered? Reveal immediately.
        if ([...room.players.values()].every(pl => pl.answeredThisRound)) {
            revealRound(io, room);
        }
    });

    socket.on('cb:leave', (payload: any) => leave(io, socket, (payload?.code || '').toUpperCase(), payload?.playerId));

    socket.on('disconnect', () => {
        const code = socketIndex.get(socket.id);
        if (code) leave(io, socket, code);
    });
}
