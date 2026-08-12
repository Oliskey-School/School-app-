// After tsc compiles backend/src/**/*.ts, the output lands nested under
// backend/dist/backend/src/... (not backend/dist/src/...) because
// backend/src/routes/student.routes.ts imports ../../../shared/utils/validation,
// which pulls in a file outside backend/, widening tsc's inferred rootDir to
// the repo root. Every backend/src file that does `require('../../generated/prisma-client')`
// still resolves that relative path against its *compiled* location, so it now
// needs backend/dist/backend/generated/prisma-client to exist. This links it
// there (or copies it on platforms/permissions where symlinking isn't available)
// so the compiled server can actually boot.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'backend', 'generated', 'prisma-client');
const linkDir = path.join(__dirname, '..', 'backend', 'dist', 'backend', 'generated');
const linkPath = path.join(linkDir, 'prisma-client');

if (!fs.existsSync(target)) {
  console.error(`[link-prisma-dist] Expected generated Prisma client at ${target} — run prisma generate first.`);
  process.exit(1);
}

fs.mkdirSync(linkDir, { recursive: true });
fs.rmSync(linkPath, { recursive: true, force: true });

try {
  fs.symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`[link-prisma-dist] Linked ${linkPath} -> ${target}`);
} catch (err) {
  console.warn(`[link-prisma-dist] Symlink failed (${err.message}), copying instead.`);
  fs.cpSync(target, linkPath, { recursive: true });
  console.log(`[link-prisma-dist] Copied ${target} -> ${linkPath}`);
}
