import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { installSecurity } from './security.js';

describe('installSecurity', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();
    
    // Create unique test directory
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-install-security-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('basic functionality', () => {
    it('should fail if settings.local.json does not exist', async () => {
      const result = await installSecurity();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('settings.local.json not found');
      expect(result.message).toContain('Please launch Claude Code first');
    });

    it('should add security settings to existing file', async () => {
      // Create .claude directory and basic settings file
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({
        permissions: {
          allow: ['Bash(ls:*)']
        }
      }));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Security settings applied');
      
      // Verify file was updated
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      const settings = JSON.parse(content);
      
      expect(settings.permissions.deny).toContain('Bash(curl:*)');
      expect(settings.permissions.deny).toContain('Bash(wget:*)');
      expect(settings.permissions.deny).toContain('Bash(rm:*)');
      expect(settings.permissions.allow).toContain('Bash(ls:*)'); // Preserved
    });

    it('should merge with existing deny list', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({
        permissions: {
          deny: ['Bash(dd:*)']
        }
      }));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      const settings = JSON.parse(content);
      
      // Should have both existing and new deny entries
      expect(settings.permissions.deny).toContain('Bash(dd:*)');
      expect(settings.permissions.deny).toContain('Bash(curl:*)');
      expect(settings.permissions.deny).toContain('Bash(wget:*)');
      expect(settings.permissions.deny).toContain('Bash(rm:*)');
    });

    it('should not duplicate existing security settings', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({
        permissions: {
          deny: ['Bash(curl:*)', 'Bash(wget:*)']
        }
      }));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      const settings = JSON.parse(content);
      
      // Should not have duplicates
      const curlCount = settings.permissions.deny.filter((d: string) => d === 'Bash(curl:*)').length;
      const wgetCount = settings.permissions.deny.filter((d: string) => d === 'Bash(wget:*)').length;
      
      expect(curlCount).toBe(1);
      expect(wgetCount).toBe(1);
      expect(settings.permissions.deny).toContain('Bash(rm:*)');
    });
  });

  describe('edge cases', () => {
    it('should handle empty permissions object', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({}));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      const settings = JSON.parse(content);
      
      expect(settings.permissions.deny).toHaveLength(3);
      expect(settings.permissions.deny).toContain('Bash(curl:*)');
      expect(settings.permissions.deny).toContain('Bash(wget:*)');
      expect(settings.permissions.deny).toContain('Bash(rm:*)');
    });

    it('should handle malformed JSON gracefully', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', 'invalid json');
      
      const result = await installSecurity();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to parse settings.local.json');
    });

    it('should preserve other settings', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({
        mcpServers: {
          example: { command: 'node', args: ['server.js'] }
        },
        permissions: {
          allow: ['Bash(grep:*)']
        },
        customSetting: 'preserved'
      }));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      const settings = JSON.parse(content);
      
      // Other settings should be preserved
      expect(settings.mcpServers.example).toBeDefined();
      expect(settings.customSetting).toBe('preserved');
      expect(settings.permissions.allow).toContain('Bash(grep:*)');
      expect(settings.permissions.deny).toHaveLength(3);
    });
  });

  describe('formatting', () => {
    it('should format JSON with proper indentation', async () => {
      await mkdir('.claude', { recursive: true });
      await writeFile('.claude/settings.local.json', JSON.stringify({
        permissions: {}
      }));
      
      const result = await installSecurity();
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/settings.local.json', 'utf-8');
      
      // Should be properly formatted (not minified)
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });
});