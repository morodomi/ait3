import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DirectoryStructureAnalyzer } from './DirectoryStructureAnalyzer.js';

describe('DirectoryStructureAnalyzer', () => {
  let testDir: string;
  let analyzer: DirectoryStructureAnalyzer;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-structure-analyzer-'));
    analyzer = new DirectoryStructureAnalyzer(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('analyzeStructure', () => {
    it('should analyze TypeScript project structure', async () => {
      // Create typical TS project structure
      await mkdir(join(testDir, 'src'), { recursive: true });
      await mkdir(join(testDir, 'tests'), { recursive: true });
      await mkdir(join(testDir, 'dist'), { recursive: true });
      await mkdir(join(testDir, '.github/workflows'), { recursive: true });
      
      await writeFile(join(testDir, 'src', 'index.ts'), 'export const x = 1;');
      await writeFile(join(testDir, 'src', 'utils.ts'), 'export const y = 2;');
      await writeFile(join(testDir, 'tests', 'index.test.ts'), 'test("x", () => {});');
      await writeFile(join(testDir, 'package.json'), '{}');
      await writeFile(join(testDir, 'tsconfig.json'), '{}');
      await writeFile(join(testDir, '.gitignore'), 'node_modules');
      await writeFile(join(testDir, 'Dockerfile'), 'FROM node:18');
      await writeFile(join(testDir, '.github/workflows/ci.yml'), 'name: CI');

      const structure = await analyzer.analyzeStructure();

      expect(structure.rootPath).toBe(testDir);
      expect(structure.hasGitRepository).toBe(true); // .gitignore present
      expect(structure.hasCICD).toBe(true); // .github/workflows present
      expect(structure.hasDocker).toBe(true); // Dockerfile present
      
      const srcDir = structure.directories.find(d => d.name === 'src');
      expect(srcDir).toMatchObject({
        name: 'src',
        type: 'source',
        fileCount: 2
      });

      const testsDir = structure.directories.find(d => d.name === 'tests');
      expect(testsDir).toMatchObject({
        name: 'tests',
        type: 'test',
        fileCount: 1
      });

      const distDir = structure.directories.find(d => d.name === 'dist');
      expect(distDir).toMatchObject({
        name: 'dist',
        type: 'build'
      });
    });

    it('should analyze Python Flask project structure', async () => {
      // Create typical Flask structure
      await mkdir(join(testDir, 'app'), { recursive: true });
      await mkdir(join(testDir, 'tests'), { recursive: true });
      await mkdir(join(testDir, 'migrations'), { recursive: true });
      await mkdir(join(testDir, 'static'), { recursive: true });
      await mkdir(join(testDir, 'templates'), { recursive: true });
      
      await writeFile(join(testDir, 'app', '__init__.py'), '');
      await writeFile(join(testDir, 'app', 'routes.py'), '');
      await writeFile(join(testDir, 'app', 'models.py'), '');
      await writeFile(join(testDir, 'requirements.txt'), 'flask==2.0.0');
      await writeFile(join(testDir, '.gitlab-ci.yml'), 'stages: []');

      const structure = await analyzer.analyzeStructure();

      expect(structure.hasCICD).toBe(true); // GitLab CI
      
      const appDir = structure.directories.find(d => d.name === 'app');
      expect(appDir).toMatchObject({
        name: 'app',
        type: 'source',
        fileCount: 3
      });
    });

    it('should analyze PHP Laravel project structure', async () => {
      // Create typical Laravel structure
      await mkdir(join(testDir, 'app/Http/Controllers'), { recursive: true });
      await mkdir(join(testDir, 'database/migrations'), { recursive: true });
      await mkdir(join(testDir, 'resources/views'), { recursive: true });
      await mkdir(join(testDir, 'tests/Unit'), { recursive: true });
      await mkdir(join(testDir, 'public'), { recursive: true });
      
      await writeFile(join(testDir, 'composer.json'), '{}');
      await writeFile(join(testDir, 'artisan'), '#!/usr/bin/env php');
      await writeFile(join(testDir, '.env.example'), 'APP_NAME=Laravel');

      const structure = await analyzer.analyzeStructure();

      const appDir = structure.directories.find(d => d.name === 'app');
      expect(appDir?.type).toBe('source');
      
      const testsDir = structure.directories.find(d => d.name === 'tests');
      expect(testsDir?.type).toBe('test');
      
      const publicDir = structure.directories.find(d => d.name === 'public');
      expect(publicDir?.type).toBe('build');
    });

    it('should handle empty directory', async () => {
      const structure = await analyzer.analyzeStructure();

      expect(structure.rootPath).toBe(testDir);
      expect(structure.directories).toHaveLength(0);
      expect(structure.hasGitRepository).toBe(false);
      expect(structure.hasCICD).toBe(false);
      expect(structure.hasDocker).toBe(false);
    });
  });

  describe('detectFramework', () => {
    it('should detect Next.js framework', async () => {
      await writeFile(join(testDir, 'next.config.js'), 'module.exports = {};');
      await mkdir(join(testDir, 'pages'), { recursive: true });
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        dependencies: { next: '^13.0.0' }
      }));

      const framework = await analyzer.detectFramework(testDir, 'TypeScript');

      expect(framework).toEqual({
        name: 'Next.js',
        version: '13.0.0',
        type: 'fullstack',
        confidence: 0.95
      });
    });

    it('should detect Django framework', async () => {
      await writeFile(join(testDir, 'manage.py'), '#!/usr/bin/env python');
      await mkdir(join(testDir, 'myproject'), { recursive: true });
      await writeFile(join(testDir, 'myproject/settings.py'), 'DEBUG = True');
      await writeFile(join(testDir, 'requirements.txt'), 'django==4.2.0\ndjango-rest-framework==3.14.0');

      const framework = await analyzer.detectFramework(testDir, 'Python');

      expect(framework).toEqual({
        name: 'Django',
        version: '4.2.0',
        type: 'fullstack',
        confidence: 0.95
      });
    });

    it('should detect Flask framework', async () => {
      await writeFile(join(testDir, 'app.py'), 'from flask import Flask');
      await writeFile(join(testDir, 'requirements.txt'), 'flask==2.3.0\nflask-sqlalchemy==3.0.0');

      const framework = await analyzer.detectFramework(testDir, 'Python');

      expect(framework).toEqual({
        name: 'Flask',
        version: '2.3.0',
        type: 'backend',
        confidence: 0.9
      });
    });

    it('should detect Laravel framework', async () => {
      await writeFile(join(testDir, 'artisan'), '#!/usr/bin/env php');
      await mkdir(join(testDir, 'bootstrap'), { recursive: true });
      await writeFile(join(testDir, 'composer.json'), JSON.stringify({
        require: { 'laravel/framework': '^10.0' }
      }));

      const framework = await analyzer.detectFramework(testDir, 'PHP');

      expect(framework).toEqual({
        name: 'Laravel',
        version: '10.0',
        type: 'fullstack',
        confidence: 0.95
      });
    });

    it('should detect Express.js framework', async () => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        dependencies: { 
          express: '^4.18.0',
          'body-parser': '^1.20.0'
        }
      }));
      await writeFile(join(testDir, 'app.js'), 'const express = require("express");');

      const framework = await analyzer.detectFramework(testDir, 'JavaScript');

      expect(framework).toEqual({
        name: 'Express',
        version: '4.18.0',
        type: 'backend',
        confidence: 0.85
      });
    });

    it('should return unknown framework when not detected', async () => {
      await writeFile(join(testDir, 'index.js'), 'console.log("hello");');

      const framework = await analyzer.detectFramework();

      expect(framework).toEqual({
        name: 'Unknown',
        type: 'unknown',
        confidence: 0
      });
    });

    it('should detect library projects', async () => {
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        name: 'my-library',
        main: 'dist/index.js',
        types: 'dist/index.d.ts'
      }));
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src/index.ts'), 'export function myLib() {}');

      const framework = await analyzer.detectFramework(testDir, 'TypeScript');

      expect(framework.type).toBe('library');
      expect(framework.confidence).toBeGreaterThan(0.5);
    });
  });
});