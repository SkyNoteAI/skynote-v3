#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

interface MigrationFile {
  id: string;
  filename: string;
  content: string;
  rollbackFilename?: string;
  rollbackContent?: string;
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const migrations: MigrationFile[] = [];

  try {
    // For now, we'll manually list our migrations
    // In a production system, you'd scan the directory
    const migrationFiles = [
      '001_initial_schema.sql'
    ];

    for (const filename of migrationFiles) {
      const content = readFileSync(join(migrationsDir, filename), 'utf-8');
      const id = filename.split('_')[0];
      
      // Check for rollback file
      const rollbackFilename = filename.replace('.sql', '_rollback.sql');
      let rollbackContent: string | undefined;
      
      try {
        rollbackContent = readFileSync(join(migrationsDir, rollbackFilename), 'utf-8');
      } catch (error) {
        console.warn(`No rollback file found for ${filename}`);
      }

      migrations.push({
        id,
        filename,
        content,
        rollbackFilename: rollbackContent ? rollbackFilename : undefined,
        rollbackContent
      });
    }

    return migrations.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error reading migration files:', error);
    return [];
  }
}

/**
 * Apply migrations to the database
 */
async function applyMigrations() {
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    console.log('No migrations found.');
    return;
  }

  console.log(`Found ${migrations.length} migration(s):`);
  
  for (const migration of migrations) {
    console.log(`  - ${migration.filename}`);
  }

  console.log('\nTo apply migrations, run:');
  console.log('  pnpm migrate');
  console.log('\nTo seed the database, run:');
  console.log('  pnpm seed');
}

/**
 * Validate migration files
 */
function validateMigrations(): boolean {
  const migrations = getMigrationFiles();
  let isValid = true;

  console.log('Validating migration files...');

  for (const migration of migrations) {
    console.log(`\nValidating ${migration.filename}:`);
    
    // Check if content exists
    if (!migration.content.trim()) {
      console.error(`  ❌ Empty migration file`);
      isValid = false;
      continue;
    }

    // Check for common SQL patterns
    if (migration.content.includes('CREATE TABLE')) {
      console.log(`  ✅ Contains CREATE TABLE statements`);
    }

    if (migration.content.includes('CREATE INDEX')) {
      console.log(`  ✅ Contains CREATE INDEX statements`);
    }

    // Check for rollback file
    if (migration.rollbackContent) {
      console.log(`  ✅ Rollback file exists: ${migration.rollbackFilename}`);
      
      if (migration.rollbackContent.includes('DROP TABLE')) {
        console.log(`  ✅ Rollback contains DROP TABLE statements`);
      }
      
      if (migration.rollbackContent.includes('DROP INDEX')) {
        console.log(`  ✅ Rollback contains DROP INDEX statements`);
      }
    } else {
      console.warn(`  ⚠️  No rollback file found`);
    }
  }

  return isValid;
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'list':
    await applyMigrations();
    break;
  case 'validate':
    const isValid = validateMigrations();
    process.exit(isValid ? 0 : 1);
    break;
  default:
    console.log('Usage: pnpm migrate [list|validate]');
    console.log('  list     - List available migrations');
    console.log('  validate - Validate migration files');
    break;
}