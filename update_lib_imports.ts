import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, callback);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        callback(filePath);
      }
    }
  }
}

walk('terax-ai-0.6.1/src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Global alias
  newContent = newContent.replace(/@\/lib\//g, '@/modules/core/');
  
  // Relative imports like `../../lib/utils`
  // We can just find all occurrences of lib/utils, lib/fonts, etc. and fix them, but usually they use the alias @/lib/...
  // Let's also check for exact relative imports
  newContent = newContent.replace(/\.\.\/\.\.\/lib\//g, '../../modules/core/');
  newContent = newContent.replace(/\.\.\/lib\//g, '../modules/core/');
  // Note: if the file was in src/lib and moved to src/modules/core, its relative imports to other files in src/ might need fixing,
  // but it's simpler to just fix the @/ components alias. 
  // e.g., in utils.ts: import { clsx, type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge"; -> no internal relative imports.

  // Let's also create an index.ts for core
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
});
