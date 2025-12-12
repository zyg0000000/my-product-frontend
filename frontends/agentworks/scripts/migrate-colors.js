#!/usr/bin/env node
/**
 * 硬编码颜色迁移脚本
 *
 * 用法:
 *   node scripts/migrate-colors.js --dry-run    # 预览将要修改的内容
 *   node scripts/migrate-colors.js              # 执行迁移
 *
 * 迁移规则:
 * 1. gray 系列 -> 语义化类 (text-content, bg-surface-*, border-stroke)
 * 2. blue/yellow/red/green 系列 -> 品牌色 + dark: 变体
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 是否为预览模式
const isDryRun = process.argv.includes('--dry-run');

// 迁移映射表
const migrations = {
  // === 文字颜色迁移 ===
  // Gray 系列 -> 语义化
  'text-gray-900': 'text-content',
  'text-gray-800': 'text-content',
  'text-gray-700': 'text-content-secondary',
  'text-gray-600': 'text-content-secondary',
  'text-gray-500': 'text-content-muted',
  'text-gray-400': 'text-content-muted',
  'text-slate-900': 'text-content',
  'text-slate-700': 'text-content-secondary',
  'text-slate-500': 'text-content-muted',

  // Blue 系列 -> Primary + dark 变体
  'text-blue-900': 'text-primary-900 dark:text-primary-100',
  'text-blue-800': 'text-primary-800 dark:text-primary-200',
  'text-blue-700': 'text-primary-700 dark:text-primary-300',
  'text-blue-600': 'text-primary-600 dark:text-primary-400',

  // Green 系列 -> Success + dark 变体
  'text-green-900': 'text-success-900 dark:text-success-100',
  'text-green-700': 'text-success-700 dark:text-success-300',
  'text-green-600': 'text-success-600 dark:text-success-400',

  // Yellow 系列 -> Warning + dark 变体
  'text-yellow-900': 'text-warning-900 dark:text-warning-100',
  'text-yellow-800': 'text-warning-800 dark:text-warning-200',
  'text-yellow-700': 'text-warning-700 dark:text-warning-300',
  'text-yellow-600': 'text-warning-600 dark:text-warning-400',

  // Red 系列 -> Danger + dark 变体
  'text-red-900': 'text-danger-900 dark:text-danger-100',
  'text-red-800': 'text-danger-800 dark:text-danger-200',
  'text-red-700': 'text-danger-700 dark:text-danger-300',
  'text-red-600': 'text-danger-600 dark:text-danger-400',
  'text-red-500': 'text-danger-500',

  // === 背景颜色迁移 ===
  // Gray 系列 -> 语义化
  'bg-gray-50': 'bg-surface-base',
  'bg-gray-100': 'bg-surface-sunken',
  'bg-gray-200': 'bg-surface-sunken',
  'bg-gray-800': 'bg-surface-elevated dark:bg-gray-900',

  // Blue 系列 -> Primary + dark 变体
  'bg-blue-50': 'bg-primary-50 dark:bg-primary-900/20',
  'bg-blue-100': 'bg-primary-100 dark:bg-primary-900/30',

  // Green 系列 -> Success + dark 变体
  'bg-green-50': 'bg-success-50 dark:bg-success-900/20',
  'bg-green-100': 'bg-success-100 dark:bg-success-900/30',
  'bg-green-500': 'bg-success-500',
  'bg-green-600': 'bg-success-600',

  // Yellow 系列 -> Warning + dark 变体
  'bg-yellow-50': 'bg-warning-50 dark:bg-warning-900/20',
  'bg-yellow-100': 'bg-warning-100 dark:bg-warning-900/30',

  // Red 系列 -> Danger + dark 变体
  'bg-red-50': 'bg-danger-50 dark:bg-danger-900/20',
  'bg-red-100': 'bg-danger-100 dark:bg-danger-900/30',
  'bg-red-600': 'bg-danger-600',

  // === 边框颜色迁移 ===
  'border-gray-200': 'border-stroke',
  'border-gray-300': 'border-stroke',
  'border-blue-200': 'border-primary-200 dark:border-primary-700',
  'border-green-200': 'border-success-200 dark:border-success-700',
  'border-yellow-200': 'border-warning-200 dark:border-warning-700',
  'border-red-200': 'border-danger-200 dark:border-danger-700',
  'border-red-300': 'border-danger-300 dark:border-danger-600',

  // === Hover 状态迁移 ===
  'hover:bg-gray-50': 'hover:bg-surface-base',
  'hover:bg-gray-100': 'hover:bg-surface-sunken',
  'hover:bg-gray-200': 'hover:bg-surface-sunken',
  'hover:bg-gray-300': 'hover:bg-gray-300 dark:hover:bg-gray-600',
  'hover:text-gray-900': 'hover:text-content',
  'hover:text-gray-600': 'hover:text-content-secondary',
  'hover:bg-red-50': 'hover:bg-danger-50 dark:hover:bg-danger-900/20',
  'hover:bg-green-700': 'hover:bg-success-700',
  'hover:bg-red-700': 'hover:bg-danger-700',
};

// 需要跳过的目录
const skipDirs = ['node_modules', 'dist', 'build', '.git'];

// 递归获取所有文件
function getFiles(dir, extensions = ['.tsx', '.ts', '.css']) {
  const results = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!skipDirs.includes(item.name)) {
        results.push(...getFiles(fullPath, extensions));
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext) && !item.name.includes('STYLE-GUIDE')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// 迁移单个文件
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = [];

  // 应用迁移规则
  for (const [oldClass, newClass] of Object.entries(migrations)) {
    // 使用正则确保匹配完整的类名（避免部分匹配）
    const regex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      changes.push({
        from: oldClass,
        to: newClass,
        count: matches.length,
      });
      content = content.replace(regex, newClass);
    }
  }

  if (changes.length > 0) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n📄 ${relativePath}`);
    changes.forEach(change => {
      console.log(`   ${change.from} → ${change.to} (${change.count}处)`);
    });

    if (!isDryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('   ✅ 已更新');
    }

    return { file: relativePath, changes };
  }

  return null;
}

// 主函数
function main() {
  console.log('🎨 硬编码颜色迁移工具');
  console.log('========================');
  console.log(isDryRun ? '📋 预览模式 (不会修改文件)\n' : '🚀 执行模式\n');

  const srcDir = path.join(__dirname, '../src');
  const files = getFiles(srcDir);
  console.log(`找到 ${files.length} 个文件待检查...\n`);

  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    const result = migrateFile(file);
    if (result) {
      filesChanged++;
      totalChanges += result.changes.reduce((sum, c) => sum + c.count, 0);
    }
  }

  console.log('\n========================');
  console.log(`📊 统计: ${filesChanged} 个文件, ${totalChanges} 处修改`);

  if (isDryRun && totalChanges > 0) {
    console.log('\n💡 运行 `node scripts/migrate-colors.js` 执行迁移');
  }
}

main();
