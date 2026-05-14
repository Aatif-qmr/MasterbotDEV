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

  // Editor
  newContent = newContent.replace(/\/modules\/editor\/components/g, '/modules/editor/ui');
  newContent = newContent.replace(/\/modules\/editor\/lib/g, '/modules/editor/core');
  
  // Editor files that moved from editor/ to editor/ui/
  const editorRootFiles = ['EditorPane', 'EditorStack', 'NewEditorDialog', 'AiDiffPane', 'AiDiffStack'];
  for (const file of editorRootFiles) {
    // Replace imports like `@/modules/editor/EditorPane` with `@/modules/editor/ui/EditorPane`
    newContent = newContent.replace(new RegExp(`@/modules/editor/${file}`, 'g'), `@/modules/editor/ui/${file}`);
    // Replace relative imports like `./EditorPane` in `src/modules/editor/index.ts`
    if (filePath.endsWith('src/modules/editor/index.ts')) {
      newContent = newContent.replace(new RegExp(`\\.\\/${file}`, 'g'), `./ui/${file}`);
    }
  }

  // Inside editor/ui, relative imports might need updating
  if (filePath.includes('/modules/editor/ui/')) {
    // e.g. `./lib/extensions` -> `../core/extensions`
    newContent = newContent.replace(/\.\/lib\//g, '../core/');
    newContent = newContent.replace(/\.\.\/types/g, '../../types');
    newContent = newContent.replace(/\.\.\/store/g, '../../store');
    // If they imported sibling files like `./components/InlineEditWidget` -> `./InlineEditWidget`
    newContent = newContent.replace(/\.\/components\//g, './');
  }

  // Graphify
  newContent = newContent.replace(/\/modules\/graphify\/components/g, '/modules/graphify/core');
  newContent = newContent.replace(/\/modules\/graphify\/lib/g, '/modules/graphify/core');

  if (filePath.includes('/modules/graphify/core/')) {
    // Relative imports inside graphify/core
    newContent = newContent.replace(/\.\.\/store/g, '../../store');
    newContent = newContent.replace(/\.\.\/types/g, '../../types');
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
});
