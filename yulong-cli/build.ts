#!/usr/bin/env bun
/**
 * 编译 yulong CLI 为单二进制文件
 *
 * 用法：
 *   bun run build.ts              # 默认编译为 Linux x64
 *   bun run build.ts --target=bun-darwin-arm64
 */

import { $ } from 'bun';

const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1]
  || 'bun-linux-x64';

const outfile = 'yulong';

console.log(`编译目标: ${target}`);
console.log(`输出文件: ${outfile}`);

await $`bun build --compile --target=${target} src/index.ts --outfile ${outfile}`;

console.log('编译完成');
