#!/usr/bin/env bun
/**
 * 编译 yulong CLI 为单二进制文件
 *
 * 用法：
 *   bun run build.ts              # 默认编译为 Linux x64、本地模式
 *   bun run build.ts --target=bun-darwin-arm64
 *   bun run build.ts --target=bun-linux-x64 --mode=token --outfile=yulong-token
 *
 * 选项：
 *   --target=<target>   bun 编译目标（默认 bun-linux-x64）
 *   --mode=<mode>       认证模式 local|token（默认 local），编译期注入为 Config.mode 的默认值
 *   --outfile=<name>    输出文件名（默认 yulong）
 */

import { $ } from 'bun';

const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1]
  || 'bun-linux-x64';

const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1]
  || 'local';

if (mode !== 'local' && mode !== 'token') {
  console.error(`无效的 --mode 值: ${mode}（仅支持 local | token）`);
  process.exit(1);
}

const outfile = process.argv.find(arg => arg.startsWith('--outfile='))?.split('=')[1]
  || 'yulong';

console.log(`编译目标: ${target}`);
console.log(`认证模式: ${mode}`);
console.log(`输出文件: ${outfile}`);

// --define 的值必须是 JS 字面量，字符串需带引号（JSON.stringify 正好产出带引号的形式）
await $`bun build --compile --target=${target} --define ${`YULONG_BUILD_MODE=${JSON.stringify(mode)}`} src/index.ts --outfile ${outfile}`;

console.log('编译完成');
