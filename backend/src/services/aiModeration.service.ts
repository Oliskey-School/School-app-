/**
 * Lightweight, in-process safety check for STUDENT messages to the assistant.
 *
 * Not a classifier and not a paid service: a short list of patterns for the
 * three things a school assistant must never answer like an ordinary question
 * — a child at risk of self-harm, a child disclosing abuse, and explicit sexual
 * content. A match short-circuits the model call and returns a kind, fixed
 * reply that points the student to a trusted adult and the school counselor.
 *
 * It errs towards false positives (a safe reply to an innocent message costs
 * little); the model's own safety behaviour still applies to everything else.
 */
export type ModerationCategory = 'self_harm' | 'abuse' | 'explicit';
export type ModerationResult = { flagged: false } | { flagged: true; category: ModerationCategory; reply: string };

const PATTERNS: Record<ModerationCategory, RegExp[]> = {
    self_harm: [
        /\b(kill|hurt|harm|cut)(ing)?\s+my\s*self\b/i,
        /\b(suicid(e|al)|self[-\s]?harm)\b/i,
        /\b(want|wanna|going)\s+to\s+die\b/i,
        /\bend\s+(it\s+all|my\s+life)\b/i,
        /\bno\s+reason\s+to\s+live\b/i,
        /\bbetter\s+off\s+dead\b/i,
    ],
    abuse: [
        /\b(he|she|they|my\s+\w+)\s+(touch(es|ed)?|beat(s)?|hit(s)?)\s+me\b/i,
        /\b(touch(es|ed)?)\s+me\s+(there|inappropriately|in\s+my\s+private)/i,
        /\b(being|been|get|getting)\s+(abused|molested|raped|beaten)\b/i,
        /\b(sexual(ly)?\s+abus|molest|rape[ds]?\b)/i,
        /\bi\s+am\s+(scared|afraid)\s+to\s+go\s+home\b/i,
    ],
    explicit: [
        /\b(porn|pornography|nudes?|naked\s+(pics?|photos?)|sex\s+video|xxx)\b/i,
        /\bsend\s+(me\s+)?(nudes?|naked)\b/i,
    ],
};

const REPLIES: Record<ModerationCategory, string> = {
    self_harm: [
        "I'm really sorry you're feeling this way. You matter, and you don't have to deal with this alone. 💛",
        '',
        '**Please talk to someone today:**',
        '- Your **school counselor** or a teacher you trust',
        '- A parent, guardian or another adult you feel safe with',
        '- If you are in danger right now, call **112** (emergency services in Nigeria)',
        '',
        "I can't give the kind of help a real person can, but I'm here to listen and to help you with your schoolwork whenever you're ready.",
    ].join('\n'),
    abuse: [
        "Thank you for telling me. What you're describing is not okay, and it is **not your fault**. 💛",
        '',
        '**Please tell a trusted adult as soon as you can:**',
        '- Your **school counselor**, a teacher or the head teacher',
        '- A relative or another adult you feel safe with',
        '- If you are in danger right now, call **112** (emergency services in Nigeria)',
        '',
        'You deserve to be safe, and the adults at your school are there to help you.',
    ].join('\n'),
    explicit: [
        "That's not something I can help with here. I'm your school assistant. 📚",
        '',
        "If something online has made you feel uncomfortable or unsafe, please talk to a parent, a teacher or your **school counselor**. You won't be in trouble for asking.",
        '',
        'Would you like help with a subject or your homework instead?',
    ].join('\n'),
};

// Order matters: a message about being hurt AND wanting to die is treated as self-harm first.
const ORDER: ModerationCategory[] = ['self_harm', 'abuse', 'explicit'];

export function moderateStudentText(text: string | null | undefined): ModerationResult {
    const t = String(text || '');
    if (!t.trim()) return { flagged: false };
    for (const category of ORDER) {
        if (PATTERNS[category].some(re => re.test(t))) return { flagged: true, category, reply: REPLIES[category] };
    }
    return { flagged: false };
}

/** Moderation applies to students only (the youngest users of the assistant). */
export const isStudentRole = (role?: string | null) => String(role || '').toUpperCase() === 'STUDENT';
