import { chatRepository } from './repository';

export async function runStorageMigration() {
  if (localStorage.getItem('cipher_migration_complete') === 'true') {
    return;
  }

  console.log('Starting chat history migration from localStorage to SQLite...');

  try {
    const keys = Object.keys(localStorage);
    const historyKeys = keys.filter(k => k.startsWith('chat_history_'));

    for (const key of historyKeys) {
      const projectPath = key.replace('chat_history_', '');
      if (!projectPath || projectPath === 'null' || projectPath === 'undefined') {
        continue;
      }

      try {
        const legacyData = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(legacyData) && legacyData.length > 0) {
          await chatRepository.migrateFromLocalStorage(projectPath, legacyData);
          console.log(`Migrated history for project: ${projectPath}`);
        }
      } catch (err) {
        console.error(`Failed to migrate history for project ${projectPath}:`, err);
      }
    }

    localStorage.setItem('cipher_migration_complete', 'true');
    console.log('Chat history migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}
