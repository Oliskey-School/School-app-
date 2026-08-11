/**
 * Class Battle — educational question content.
 *
 * Produces grade-appropriate, subject-specific multiple-choice rounds for the
 * multiplayer "Class Battle" game. Content is fully server-side and deterministic
 * (no external AI), so it works offline, costs nothing, and can't be tampered with
 * by the client. Math is generated procedurally for endless variety; other subjects
 * draw from curated banks per grade band.
 */

export interface BattleQuestion {
    id: string;
    prompt: string;
    options: string[];   // exactly 4
    answer: number;      // index into options
    explanation: string;
}

type Band = 'early' | 'lower' | 'mid' | 'jss' | 'sss';

export function gradeBand(grade: number | null | undefined): Band {
    const g = Number(grade ?? 5);
    if (g < 1) return 'early';
    if (g <= 3) return 'lower';
    if (g <= 6) return 'mid';
    if (g <= 9) return 'jss';
    return 'sss';
}

/** Normalise any free-text subject name to a content key we have a bank for. */
export function normaliseSubject(subject: string | null | undefined): string {
    const s = (subject || '').toLowerCase();
    if (/(math|arithmet|numbuilt|numeracy|quantitative)/.test(s)) return 'mathematics';
    if (/(english|literacy|language art|grammar|vocab|comprehension|verbal)/.test(s)) return 'english';
    if (/(basic sci|science|biolog|chemis|physic|integrated)/.test(s)) return 'science';
    if (/(social|civic|history|government|geograph)/.test(s)) return 'social';
    if (/(ict|computer|coding|technolog|digital)/.test(s)) return 'ict';
    return 'general';
}

const rnd = (n: number) => Math.floor(Math.random() * n);
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

/** Build a 4-option MC question from a correct answer + 3 distractors. */
function mc(prompt: string, correct: string | number, distractors: (string | number)[], explanation: string, idSeed: string): BattleQuestion {
    const correctStr = String(correct);
    const opts = shuffle([correctStr, ...distractors.slice(0, 3).map(String)]);
    return { id: idSeed + '-' + rnd(1e6), prompt, options: opts, answer: opts.indexOf(correctStr), explanation };
}

// ---------------------------------------------------------------------------
// Mathematics — procedural so every battle is fresh.
// ---------------------------------------------------------------------------
function mathQuestion(band: Band): BattleQuestion {
    const pick = <T,>(a: T[]) => a[rnd(a.length)];
    if (band === 'early' || band === 'lower') {
        const a = 1 + rnd(band === 'early' ? 5 : 12), b = 1 + rnd(band === 'early' ? 5 : 12);
        if (rnd(2) === 0) {
            const ans = a + b;
            return mc(`What is ${a} + ${b}?`, ans, [ans + 1, ans - 1, ans + 2], `${a} + ${b} = ${ans}.`, 'm-add');
        }
        const hi = Math.max(a, b), lo = Math.min(a, b), ans = hi - lo;
        return mc(`What is ${hi} − ${lo}?`, ans, [ans + 1, ans + 2, Math.max(0, ans - 1)], `${hi} − ${lo} = ${ans}.`, 'm-sub');
    }
    if (band === 'mid') {
        const op = pick(['×', '÷', '+']);
        if (op === '×') { const a = 2 + rnd(11), b = 2 + rnd(11), ans = a * b; return mc(`What is ${a} × ${b}?`, ans, [ans + a, ans - b, ans + 2], `${a} × ${b} = ${ans}.`, 'm-mul'); }
        if (op === '÷') { const b = 2 + rnd(9), q = 2 + rnd(9), a = b * q; return mc(`What is ${a} ÷ ${b}?`, q, [q + 1, q - 1, q + 2], `${a} ÷ ${b} = ${q}.`, 'm-div'); }
        const a = 25 + rnd(120), b = 15 + rnd(120), ans = a + b; return mc(`What is ${a} + ${b}?`, ans, [ans + 10, ans - 10, ans + 1], `${a} + ${b} = ${ans}.`, 'm-add2');
    }
    if (band === 'jss') {
        const t = pick(['percent', 'square', 'solve', 'mean']);
        if (t === 'percent') { const p = pick([10, 20, 25, 50]), n = p === 25 ? 4 * (2 + rnd(20)) : 10 * (2 + rnd(20)), ans = (p / 100) * n; return mc(`What is ${p}% of ${n}?`, ans, [ans * 2, ans + 5, Math.round(ans / 2)], `${p}% of ${n} = ${ans}.`, 'm-pct'); }
        if (t === 'square') { const a = 2 + rnd(13), ans = a * a; return mc(`What is ${a}²?`, ans, [ans + a, ans - 1, a * 2], `${a}² = ${a} × ${a} = ${ans}.`, 'm-sq'); }
        if (t === 'mean') { const xs = Array.from({ length: 3 }, () => 2 + rnd(18)); const sum = xs.reduce((s, x) => s + x, 0); const ans = +(sum / 3).toFixed(1); return mc(`Find the mean of ${xs.join(', ')}.`, ans, [+(ans + 1).toFixed(1), +(ans - 1).toFixed(1), sum], `Mean = (${xs.join('+')}) ÷ 3 = ${ans}.`, 'm-mean'); }
        const x = 2 + rnd(9), b = 1 + rnd(9), c = x + b; return mc(`Solve for x:  x + ${b} = ${c}`, x, [x + 1, x - 1, c], `x = ${c} − ${b} = ${x}.`, 'm-eq');
    }
    // sss
    const t = pick(['quad', 'index', 'pct', 'trig']);
    if (t === 'index') { const a = 2 + rnd(4), p = 2 + rnd(3), ans = Math.pow(a, p); return mc(`Evaluate ${a}^${p}.`, ans, [a * p, ans + a, ans - 1], `${a}^${p} = ${ans}.`, 'm-idx'); }
    if (t === 'pct') { const p = pick([12.5, 15, 30, 75]), n = 200 + 100 * rnd(8), ans = +((p / 100) * n).toFixed(1); return mc(`What is ${p}% of ${n}?`, ans, [+(ans * 1.5).toFixed(1), +(ans / 2).toFixed(1), n - ans], `${p}% of ${n} = ${ans}.`, 'm-pct2'); }
    if (t === 'trig') { const opts = [['sin 30°', '0.5'], ['cos 60°', '0.5'], ['sin 90°', '1'], ['tan 45°', '1']] as const; const [q, a] = opts[rnd(opts.length)]; return mc(`What is ${q}?`, a, ['0', '0.87', '2'], `${q} = ${a}.`, 'm-trig'); }
    const r1 = 1 + rnd(5), r2 = 1 + rnd(5); const b = r1 + r2, c = r1 * r2; return mc(`One root of x² − ${b}x + ${c} = 0 is:`, r1, [r1 + 1, b, c], `Roots are ${r1} and ${r2} (sum ${b}, product ${c}).`, 'm-quad');
}

// ---------------------------------------------------------------------------
// Curated banks for the remaining subjects, keyed by band.
// ---------------------------------------------------------------------------
type Curated = { prompt: string; correct: string; distractors: string[]; explanation: string };

const BANK: Record<string, Partial<Record<Band, Curated[]>>> = {
    english: {
        lower: [
            { prompt: 'Which word is a naming word (noun)?', correct: 'Table', distractors: ['Run', 'Quickly', 'Blue'], explanation: 'A noun names a person, place or thing — "table" is a thing.' },
            { prompt: 'What is the plural of "child"?', correct: 'Children', distractors: ['Childs', 'Childes', 'Childrens'], explanation: '"Child" has an irregular plural: children.' },
            { prompt: 'Which letter is a vowel?', correct: 'E', distractors: ['B', 'T', 'M'], explanation: 'The vowels are a, e, i, o, u.' },
        ],
        mid: [
            { prompt: 'Choose the correct word: "She ___ to school every day."', correct: 'goes', distractors: ['go', 'going', 'gone'], explanation: 'Third-person singular present tense takes "goes".' },
            { prompt: 'What is the opposite (antonym) of "ancient"?', correct: 'Modern', distractors: ['Old', 'Historic', 'Antique'], explanation: '"Modern" means recent — the opposite of ancient.' },
            { prompt: 'Which is a complete sentence?', correct: 'The dog barked.', distractors: ['Running fast', 'In the box', 'Bright and sunny'], explanation: 'A sentence needs a subject and a verb: "The dog barked."' },
        ],
        jss: [
            { prompt: 'Identify the figure of speech: "The wind whispered through the trees."', correct: 'Personification', distractors: ['Simile', 'Metaphor', 'Hyperbole'], explanation: 'Giving human action ("whispered") to wind is personification.' },
            { prompt: 'Choose the correctly punctuated sentence.', correct: "It's raining, so take an umbrella.", distractors: ['Its raining so take an umbrella', "Its' raining, so take an umbrella.", 'It is raining so, take an umbrella'], explanation: '"It\'s" = it is, and a comma separates the clauses.' },
            { prompt: 'A word that means the same as "happy" is:', correct: 'Joyful', distractors: ['Angry', 'Tired', 'Hungry'], explanation: 'A synonym of happy is "joyful".' },
        ],
        sss: [
            { prompt: '"A rolling stone gathers no moss" is an example of a:', correct: 'Proverb', distractors: ['Pun', 'Oxymoron', 'Allusion'], explanation: 'It is a traditional saying offering advice — a proverb.' },
            { prompt: 'The narrative voice using "I" is called:', correct: 'First person', distractors: ['Second person', 'Third person', 'Omniscient'], explanation: '"I/we" narration is first-person point of view.' },
            { prompt: 'Choose the correct form: "Neither of the boys ___ here."', correct: 'is', distractors: ['are', 'were', 'have'], explanation: '"Neither" is singular, so it takes "is".' },
        ],
    },
    science: {
        lower: [
            { prompt: 'Which animal can fly?', correct: 'Bird', distractors: ['Dog', 'Fish', 'Cow'], explanation: 'Birds have wings and can fly.' },
            { prompt: 'We use our ___ to see.', correct: 'Eyes', distractors: ['Ears', 'Nose', 'Hands'], explanation: 'Eyes are the sense organ for sight.' },
            { prompt: 'Which one is a source of light?', correct: 'The Sun', distractors: ['The Moon', 'A rock', 'A book'], explanation: 'The Sun produces its own light.' },
        ],
        mid: [
            { prompt: 'Which gas do humans breathe in to stay alive?', correct: 'Oxygen', distractors: ['Carbon dioxide', 'Nitrogen', 'Hydrogen'], explanation: 'We inhale oxygen for respiration.' },
            { prompt: 'How many legs does an insect have?', correct: '6', distractors: ['4', '8', '10'], explanation: 'All insects have six legs.' },
            { prompt: 'Water turns into ice when it is:', correct: 'Frozen', distractors: ['Boiled', 'Heated', 'Evaporated'], explanation: 'Freezing turns liquid water into solid ice.' },
        ],
        jss: [
            { prompt: 'The powerhouse of the cell is the:', correct: 'Mitochondrion', distractors: ['Nucleus', 'Ribosome', 'Cell wall'], explanation: 'Mitochondria release energy for the cell.' },
            { prompt: 'Which is a non-renewable energy source?', correct: 'Coal', distractors: ['Wind', 'Solar', 'Hydro'], explanation: 'Coal is a fossil fuel that cannot be quickly replaced.' },
            { prompt: 'The chemical symbol for water is:', correct: 'H₂O', distractors: ['CO₂', 'O₂', 'NaCl'], explanation: 'Water is two hydrogen atoms and one oxygen: H₂O.' },
        ],
        sss: [
            { prompt: "Newton's First Law is also called the law of:", correct: 'Inertia', distractors: ['Gravity', 'Momentum', 'Energy'], explanation: 'Objects resist changes in motion — the law of inertia.' },
            { prompt: 'The pH of a neutral solution is:', correct: '7', distractors: ['0', '14', '1'], explanation: 'Pure water is neutral at pH 7.' },
            { prompt: 'Photosynthesis mainly takes place in the:', correct: 'Chloroplast', distractors: ['Mitochondrion', 'Nucleus', 'Vacuole'], explanation: 'Chloroplasts contain chlorophyll for photosynthesis.' },
        ],
    },
    social: {
        lower: [
            { prompt: 'Who leads a school?', correct: 'Head teacher', distractors: ['Doctor', 'Driver', 'Farmer'], explanation: 'A head teacher (principal) leads a school.' },
            { prompt: 'Which is a means of transport?', correct: 'Car', distractors: ['Chair', 'Plate', 'Pillow'], explanation: 'A car carries people from place to place.' },
            { prompt: 'Which of these is a large body of salt water?', correct: 'Ocean', distractors: ['Puddle', 'River', 'Pond'], explanation: 'Oceans are the largest bodies of salt water on Earth.' },
            { prompt: 'Where do you go to borrow books?', correct: 'Library', distractors: ['Market', 'Farm', 'Airport'], explanation: 'A library lends books to readers.' },
        ],
        mid: [
            { prompt: 'The capital city of Nigeria is:', correct: 'Abuja', distractors: ['Lagos', 'Kano', 'Ibadan'], explanation: 'Abuja became the capital in 1991.' },
            { prompt: 'A map shows direction using a:', correct: 'Compass', distractors: ['Ruler', 'Clock', 'Calendar'], explanation: 'A compass shows north, south, east and west.' },
            { prompt: 'Which is the largest continent by land area?', correct: 'Asia', distractors: ['Africa', 'Europe', 'Australia'], explanation: 'Asia is the largest continent, covering about 30% of Earth\'s land.' },
            { prompt: 'A large group of islands is called an:', correct: 'Archipelago', distractors: ['Isthmus', 'Peninsula', 'Plateau'], explanation: 'An archipelago is a chain or cluster of islands.' },
            { prompt: 'Which line divides the Earth into Northern and Southern hemispheres?', correct: 'Equator', distractors: ['Prime Meridian', 'Tropic of Cancer', 'International Date Line'], explanation: 'The Equator is the imaginary line at 0° latitude.' },
        ],
        jss: [
            { prompt: 'The three arms of government are Executive, Legislature and:', correct: 'Judiciary', distractors: ['Military', 'Police', 'Civil Service'], explanation: 'The judiciary interprets the law.' },
            { prompt: 'Which continent is Nigeria in?', correct: 'Africa', distractors: ['Asia', 'Europe', 'South America'], explanation: 'Nigeria is in West Africa.' },
            { prompt: 'The world\'s largest desert (by area) is the:', correct: 'Sahara', distractors: ['Gobi', 'Kalahari', 'Atacama'], explanation: 'The Sahara in North Africa is the largest hot desert on Earth.' },
            { prompt: 'Mount Everest, the world\'s tallest mountain, is located in:', correct: 'Nepal', distractors: ['Kenya', 'Peru', 'Switzerland'], explanation: 'Mount Everest sits on the border of Nepal and Tibet (China).' },
            { prompt: 'Which ocean is the largest on Earth?', correct: 'Pacific Ocean', distractors: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], explanation: 'The Pacific Ocean covers more area than any other ocean.' },
        ],
        sss: [
            { prompt: 'Democracy means government by the:', correct: 'People', distractors: ['Army', 'King alone', 'Few rich'], explanation: 'Democracy is rule by the people, often via elected representatives.' },
            { prompt: 'The longest river in Africa is the:', correct: 'Nile', distractors: ['Niger', 'Congo', 'Volta'], explanation: 'The Nile is the longest river in Africa.' },
            { prompt: 'Which country has the largest population in the world?', correct: 'India', distractors: ['China', 'United States', 'Indonesia'], explanation: 'India overtook China as the most populous country in 2023.' },
            { prompt: 'The Great Barrier Reef is located off the coast of:', correct: 'Australia', distractors: ['Brazil', 'Mexico', 'Thailand'], explanation: 'It lies in the Coral Sea off Queensland, Australia.' },
            { prompt: 'Which mountain range separates Europe from Asia?', correct: 'Ural Mountains', distractors: ['Andes', 'Alps', 'Atlas Mountains'], explanation: 'The Ural Mountains form part of the conventional Europe-Asia boundary.' },
            { prompt: 'The Amazon Rainforest is located primarily in:', correct: 'Brazil', distractors: ['Indonesia', 'Congo', 'Colombia'], explanation: 'Most of the Amazon Rainforest lies within Brazil.' },
        ],
    },
    ict: {
        mid: [
            { prompt: 'Which device is used to type letters into a computer?', correct: 'Keyboard', distractors: ['Monitor', 'Speaker', 'Printer'], explanation: 'A keyboard inputs text.' },
            { prompt: 'CPU stands for Central ___ Unit.', correct: 'Processing', distractors: ['Power', 'Printing', 'Picture'], explanation: 'CPU = Central Processing Unit, the computer\'s brain.' },
        ],
        jss: [
            { prompt: 'Which is an input device?', correct: 'Mouse', distractors: ['Monitor', 'Printer', 'Speaker'], explanation: 'A mouse sends input to the computer.' },
            { prompt: 'WWW stands for World Wide ___.', correct: 'Web', distractors: ['Wire', 'Window', 'Wave'], explanation: 'WWW = World Wide Web.' },
        ],
        sss: [
            { prompt: 'A program that protects against viruses is called:', correct: 'Antivirus', distractors: ['Browser', 'Compiler', 'Spreadsheet'], explanation: 'Antivirus software detects and removes malware.' },
            { prompt: 'In programming, a loop is used to:', correct: 'Repeat actions', distractors: ['Store images', 'Print paper', 'Charge battery'], explanation: 'Loops repeat a block of code.' },
        ],
    },
    general: {
        lower: [
            { prompt: 'How many days are in a week?', correct: '7', distractors: ['5', '6', '10'], explanation: 'There are 7 days in a week.' },
            { prompt: 'What colour do you get mixing blue and yellow?', correct: 'Green', distractors: ['Purple', 'Orange', 'Brown'], explanation: 'Blue + yellow = green.' },
        ],
        mid: [
            { prompt: 'How many continents are there on Earth?', correct: '7', distractors: ['5', '6', '8'], explanation: 'There are 7 continents.' },
            { prompt: 'Which planet is known as the Red Planet?', correct: 'Mars', distractors: ['Venus', 'Jupiter', 'Saturn'], explanation: 'Mars looks red due to iron oxide.' },
        ],
        jss: [
            { prompt: 'How many sides does a hexagon have?', correct: '6', distractors: ['5', '7', '8'], explanation: 'A hexagon has six sides.' },
            { prompt: 'Which is the largest planet in our solar system?', correct: 'Jupiter', distractors: ['Earth', 'Saturn', 'Mars'], explanation: 'Jupiter is the largest planet.' },
        ],
        sss: [
            { prompt: 'The speed of light is approximately:', correct: '300,000 km/s', distractors: ['3,000 km/s', '30 km/s', '300 km/s'], explanation: 'Light travels about 3×10⁸ m/s ≈ 300,000 km/s.' },
            { prompt: 'Who developed the theory of relativity?', correct: 'Albert Einstein', distractors: ['Isaac Newton', 'Charles Darwin', 'Galileo'], explanation: 'Einstein published relativity in the early 1900s.' },
        ],
    },
};

function bankFor(subjectKey: string, band: Band): Curated[] {
    const subj = BANK[subjectKey] || BANK.general;
    // Use the exact band, else fall back to the nearest available band, else general.
    const order: Band[] = band === 'early' ? ['lower', 'mid'] : band === 'lower' ? ['lower', 'mid'] : band === 'mid' ? ['mid', 'jss', 'lower'] : band === 'jss' ? ['jss', 'mid', 'sss'] : ['sss', 'jss', 'mid'];
    for (const b of order) { if (subj[b]?.length) return subj[b]!; }
    for (const b of order) { if (BANK.general[b]?.length) return BANK.general[b]!; }
    return BANK.general.mid!;
}

/**
 * Build `count` battle questions for a subject + grade. Math is generated
 * procedurally; other subjects are drawn (and recycled if needed) from the bank,
 * then re-shuffled so the same battle never has predictable answer positions.
 */
export function buildRounds(subject: string, grade: number | null | undefined, count = 8): BattleQuestion[] {
    const band = gradeBand(grade);
    const key = normaliseSubject(subject);

    if (key === 'mathematics') {
        const out: BattleQuestion[] = [];
        const seen = new Set<string>();
        let guard = 0;
        while (out.length < count && guard++ < count * 6) {
            const q = mathQuestion(band);
            if (seen.has(q.prompt)) continue;
            seen.add(q.prompt);
            out.push(q);
        }
        while (out.length < count) out.push(mathQuestion(band));
        return out;
    }

    const pool = shuffle(bankFor(key, band));
    const out: BattleQuestion[] = [];
    for (let i = 0; i < count; i++) {
        const c = pool[i % pool.length];
        out.push(mc(c.prompt, c.correct, c.distractors, c.explanation, 'q'));
    }
    return out;
}
