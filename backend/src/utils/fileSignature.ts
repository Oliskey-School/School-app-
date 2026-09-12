/**
 * File-signature ("magic bytes") verification for uploads.
 *
 * multer's fileFilter only ever sees the CLIENT-DECLARED Content-Type of a
 * multipart field — trivially spoofable (rename shell.php to photo.jpg, set
 * Content-Type: image/jpeg, and the old fileFilter let it straight through).
 * This inspects the actual leading bytes of the uploaded buffer and:
 *   1. Rejects known-dangerous signatures outright, regardless of what the
 *      client claimed the file was (Windows/Linux/Mach-O executables, shell
 *      shebangs, PHP, HTML/SVG-with-script — anything that could execute).
 *   2. For the formats we can reliably fingerprint (images, PDF, the Office
 *      OOXML/OLE families), cross-checks the real bytes against the
 *      CLAIMED mime type and rejects a mismatch.
 * Deliberately dependency-free: the allowed set is small and fixed (see
 * upload.middleware.ts's ALLOWED_MIME), so hand-written signatures are exact
 * and auditable rather than pulling in a general-purpose file-type library.
 */

export interface SignatureResult {
    ok: boolean;
    reason?: string;
}

// Signatures that mean "this is executable or script content", independent of
// whatever MIME type the client claimed. Checked before anything else, on
// EVERY upload regardless of category.
const DANGEROUS_SIGNATURES: { name: string; test: (b: Buffer) => boolean }[] = [
    { name: 'Windows/DOS executable (MZ)', test: (b) => b[0] === 0x4d && b[1] === 0x5a },
    { name: 'ELF executable', test: (b) => b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46 },
    { name: 'Mach-O executable', test: (b) => {
        const magic = b.readUInt32BE(0);
        return magic === 0xfeedface || magic === 0xfeedfacf || magic === 0xcafebabe || magic === 0xcffaedfe || magic === 0xcefaedfe;
    } },
    { name: 'shebang script', test: (b) => b[0] === 0x23 && b[1] === 0x21 }, // #!
    { name: 'Java class file', test: (b) => b.readUInt32BE(0) === 0xcafebabe },
];

// A leading-bytes UTF-8/ASCII sniff for markup that could execute in a
// browser if ever served with a permissive Content-Type — catches HTML/SVG
// containing <script even when the file starts with whitespace/BOM/XML
// prolog, without needing a real XML/HTML parser for a security gate.
function containsExecutableMarkup(buffer: Buffer): boolean {
    const head = buffer.subarray(0, 4096).toString('utf8').toLowerCase();
    return /<script[\s>]/.test(head) || /on(load|error|click)\s*=/.test(head) || /<\?php/.test(head);
}

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
    'image/gif': (b) => b.subarray(0, 6).toString('ascii') === 'GIF87a' || b.subarray(0, 6).toString('ascii') === 'GIF89a',
    'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
    'image/bmp': (b) => b[0] === 0x42 && b[1] === 0x4d,
    'application/pdf': (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
    // Modern Office formats (docx/xlsx/pptx) are ZIP containers.
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => isZip(b),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => isZip(b),
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': (b) => isZip(b),
    // Legacy Office formats (doc/xls/ppt) are OLE Compound File Binary.
    'application/msword': (b) => isOle(b),
    'application/vnd.ms-excel': (b) => isOle(b),
    'application/vnd.ms-powerpoint': (b) => isOle(b),
    'audio/mpeg': (b) => (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
    'audio/wav': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WAVE',
    'audio/webm': (b) => isEbml(b),
    'video/webm': (b) => isEbml(b),
    'video/mp4': (b) => b.subarray(4, 8).toString('ascii') === 'ftyp',
};

function isZip(b: Buffer): boolean {
    return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
}
function isOle(b: Buffer): boolean {
    return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1;
}
function isEbml(b: Buffer): boolean {
    return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
}

// text/plain and text/csv have no fixed signature — anything is technically
// valid plain text — so they only go through the universal dangerous-content
// checks below, never a positive signature match.
const NO_FIXED_SIGNATURE = new Set(['text/plain', 'text/csv']);

/**
 * Verifies `buffer`'s actual content against `claimedMime`. Never trusts the
 * claim alone. `buffer` must be the full file (or at least its first ~4KB —
 * every signature checked here lives in the leading bytes).
 */
export function verifyFileSignature(buffer: Buffer, claimedMime: string): SignatureResult {
    if (!buffer || buffer.length < 4) {
        return { ok: false, reason: 'File is empty or too small to be a valid file of any kind.' };
    }

    for (const sig of DANGEROUS_SIGNATURES) {
        if (sig.test(buffer)) {
            return { ok: false, reason: `File content matches a ${sig.name} signature, which is never an allowed upload type regardless of the declared file type.` };
        }
    }

    if (containsExecutableMarkup(buffer)) {
        return { ok: false, reason: 'File content contains script/markup that could execute if ever rendered — rejected regardless of the declared file type.' };
    }

    if (NO_FIXED_SIGNATURE.has(claimedMime)) {
        return { ok: true };
    }

    const check = SIGNATURES[claimedMime];
    if (!check) {
        // Not one of the types this module knows how to fingerprint (e.g. an
        // audio/video format outside the small set above). Fail closed: an
        // unrecognized signature for a MIME type this function doesn't cover
        // should not be silently accepted as "probably fine".
        return { ok: false, reason: `No signature check is implemented for "${claimedMime}" — refusing rather than accepting it unverified.` };
    }
    if (!check(buffer)) {
        return { ok: false, reason: `File content does not match the declared type "${claimedMime}" (failed signature check) — the Content-Type/extension does not reflect the actual file.` };
    }
    return { ok: true };
}
