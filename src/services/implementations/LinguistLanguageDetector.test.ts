import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LinguistLanguageDetector } from './LinguistLanguageDetector.js';

// Mock linguist-js
vi.mock('linguist-js', () => ({
  default: vi.fn()
}));

describe('LinguistLanguageDetector', () => {
  let testDir: string;
  let detector: LinguistLanguageDetector;

  beforeEach(async () => {
    // Create unique test directory
    testDir = await mkdtemp(join(tmpdir(), 'test-linguist-detector-'));
    detector = new LinguistLanguageDetector(testDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectLanguages', () => {
    it('should wrap linguist-js results for TypeScript project', async () => {
      // Create TypeScript project structure
      await writeFile(join(testDir, 'tsconfig.json'), '{}');
      await writeFile(join(testDir, 'index.ts'), 'console.log("Hello");');
      await writeFile(join(testDir, 'test.spec.ts'), 'describe("test", () => {});');

      // Mock linguist-js response
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {
          TypeScript: { percentage: 95.5, bytes: 1024, files: ['index.ts', 'test.spec.ts'] },
          JSON: { percentage: 4.5, bytes: 50, files: ['tsconfig.json'] }
        },
        total: { bytes: 1074, files: 3 }
      });

      const languages = await detector.detectLanguages();

      expect(languages).toHaveLength(2);
      expect(languages[0]).toEqual({
        name: 'TypeScript',
        percentage: 95.5,
        files: 2,
        primaryLanguage: true
      });
      expect(languages[1]).toEqual({
        name: 'JSON',
        percentage: 4.5,
        files: 1,
        primaryLanguage: false
      });
    });

    it('should use fallback detection when linguist-js fails', async () => {
      // Create files
      await writeFile(join(testDir, 'app.py'), 'print("Hello")');
      await writeFile(join(testDir, 'test.py'), 'def test(): pass');
      await writeFile(join(testDir, 'requirements.txt'), 'flask==2.0.0');

      // Mock linguist-js to throw error
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockRejectedValue(new Error('linguist-js failed'));

      const languages = await detector.detectLanguages();

      // Fallback should detect Python based on file extensions
      expect(languages.length).toBeGreaterThan(0);
      const pythonLang = languages.find(l => l.name === 'Python');
      expect(pythonLang).toBeDefined();
      expect(pythonLang?.files).toBe(2);
    });

    it('should detect Python Flask project', async () => {
      await writeFile(join(testDir, 'app.py'), 'from flask import Flask');
      await writeFile(join(testDir, 'requirements.txt'), 'flask==2.0.0');

      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {
          Python: { percentage: 100, bytes: 500, files: ['app.py'] }
        },
        total: { bytes: 500, files: 1 }
      });

      const languages = await detector.detectLanguages();

      expect(languages[0]).toMatchObject({
        name: 'Python',
        primaryLanguage: true
      });
    });

    it('should detect PHP Laravel project', async () => {
      await writeFile(join(testDir, 'composer.json'), '{"require": {"laravel/framework": "^8.0"}}');
      await mkdir(join(testDir, 'app'), { recursive: true });
      await writeFile(join(testDir, 'app/Http.php'), '<?php namespace App;');

      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {
          PHP: { percentage: 90, bytes: 1000, files: ['app/Http.php'] },
          JSON: { percentage: 10, bytes: 100, files: ['composer.json'] }
        },
        total: { bytes: 1100, files: 2 }
      });

      const languages = await detector.detectLanguages();

      const phpLang = languages.find(l => l.name === 'PHP');
      expect(phpLang).toBeDefined();
      expect(phpLang?.primaryLanguage).toBe(true);
    });

    it('should handle empty directory', async () => {
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {},
        total: { bytes: 0, files: 0 }
      });

      const languages = await detector.detectLanguages();

      expect(languages).toHaveLength(0);
    });

    it('should handle mixed language projects', async () => {
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {
          JavaScript: { percentage: 45, bytes: 450, files: ['index.js', 'utils.js'] },
          Python: { percentage: 40, bytes: 400, files: ['script.py', 'test.py'] },
          CSS: { percentage: 15, bytes: 150, files: ['style.css'] }
        },
        total: { bytes: 1000, files: 5 }
      });

      const languages = await detector.detectLanguages();

      expect(languages).toHaveLength(3);
      expect(languages[0].name).toBe('JavaScript'); // Highest percentage
      expect(languages[0].primaryLanguage).toBe(true);
      expect(languages[1].primaryLanguage).toBe(false);
      expect(languages[2].primaryLanguage).toBe(false);
    });
  });

  describe('getPrimaryLanguage', () => {
    it('should return language with highest percentage', async () => {
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {
          TypeScript: { percentage: 80, bytes: 800, files: ['a.ts', 'b.ts'] },
          JavaScript: { percentage: 20, bytes: 200, files: ['c.js'] }
        },
        total: { bytes: 1000, files: 3 }
      });

      const primary = await detector.getPrimaryLanguage();

      expect(primary).toEqual({
        name: 'TypeScript',
        percentage: 80,
        files: 2,
        primaryLanguage: true
      });
    });

    it('should return null for empty project', async () => {
      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockResolvedValue({
        languages: {},
        total: { bytes: 0, files: 0 }
      });

      const primary = await detector.getPrimaryLanguage();

      expect(primary).toBeNull();
    });

    it('should use fallback when linguist-js fails', async () => {
      await writeFile(join(testDir, 'main.py'), 'print("main")');
      await writeFile(join(testDir, 'utils.py'), 'print("utils")');
      await writeFile(join(testDir, 'config.json'), '{}');

      const linguist = await import('linguist-js');
      vi.mocked(linguist.default).mockRejectedValue(new Error('Failed'));

      const primary = await detector.getPrimaryLanguage();

      expect(primary?.name).toBe('Python'); // 2 Python files vs 1 JSON
    });
  });
});