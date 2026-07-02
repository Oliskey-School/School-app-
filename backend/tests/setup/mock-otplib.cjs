/**
 * Preloaded via --require in vitest poolOptions.forks.execArgv.
 * Patches Node's module loader so that require('otplib') and all @otplib/*
 * sub-packages return a stub, bypassing the @scure/base ESM-only conflict.
 * The tests don't exercise 2FA/TOTP — only the student/teacher API endpoints.
 */
const Module = require('module');
const originalLoad = Module._load.bind(Module);

Module._load = function (request, parent, isMain) {
  if (request === 'otplib') {
    return {
      authenticator: {
        options: {},
        verify: () => false,
        generate: () => '000000',
        generateSecret: () => 'TESTSECRETKEY000',
        keyuri: () => 'otpauth://totp/SchoolSaaS:test?secret=TESTSECRETKEY000&issuer=SchoolSaaS',
      },
    };
  }
  if (request.startsWith('@otplib/')) {
    return {};
  }
  return originalLoad(request, parent, isMain);
};
