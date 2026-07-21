#!/usr/bin/env node
/**
 * Patches @otplib/plugin-base32-scure/dist/index.cjs to inline the base32
 * implementation, removing the require('@scure/base') call which fails in
 * Node 20 because @scure/base v1.2+ ships ESM-only.
 *
 * Run automatically via npm postinstall.
 */
const fs = require('fs');
const path = require('path');

const target = path.resolve(
  __dirname,
  '../node_modules/@otplib/plugin-base32-scure/dist/index.cjs'
);

if (!fs.existsSync(target)) {
  console.log('[patch-otplib] target not found, skipping.');
  process.exit(0);
}

const src = fs.readFileSync(target, 'utf8');
if (!src.includes("require(\"@scure/base\")") && !src.includes("require('@scure/base')")) {
  console.log('[patch-otplib] already patched, skipping.');
  process.exit(0);
}

const patched = src
  .replace(/var c=require\(["']@scure\/base["']\),/, '')
  .replace(
    'module.exports=g(y);',
    `module.exports=g(y);
/* Inlined base32 — replaces require('@scure/base') which is ESM-only */
var B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
var c={base32:{encode:function(bytes){var bits=0,val=0,out='';for(var i=0;i<bytes.length;i++){val=(val<<8)|bytes[i];bits+=8;while(bits>=5){out+=B32[(val>>>(bits-5))&31];bits-=5;}}if(bits>0)out+=B32[(val<<(5-bits))&31];return out;},decode:function(str){var lk={};for(var i=0;i<B32.length;i++)lk[B32[i]]=i;str=str.toUpperCase().replace(/=/g,'');var bits=0,val=0,idx=0,res=new Uint8Array(Math.floor(str.length*5/8));for(var j=0;j<str.length;j++){val=(val<<5)|lk[str[j]];bits+=5;if(bits>=8){res[idx++]=(val>>>(bits-8))&255;bits-=8;}}return res;}}};`
  );

fs.writeFileSync(target, patched, 'utf8');
console.log('[patch-otplib] patched successfully.');
