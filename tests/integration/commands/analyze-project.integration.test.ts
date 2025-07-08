import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeProject } from '../../../src/commands/analyze/project.js';
import type { Services } from '../../../src/common/types.js';
import { DefaultProjectAnalyzer } from '../../../src/services/implementations/DefaultProjectAnalyzer.js';
import { LinguistLanguageDetector } from '../../../src/services/implementations/LinguistLanguageDetector.js';
import { ConfigBasedCommandDetector } from '../../../src/services/implementations/ConfigBasedCommandDetector.js';
import { DirectoryStructureAnalyzer } from '../../../src/services/implementations/DirectoryStructureAnalyzer.js';

describe('analyze project command integration', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'test-analyze-project-'));
    
    // Create service instances
    const languageDetector = new LinguistLanguageDetector(testDir);
    const commandDetector = new ConfigBasedCommandDetector(testDir);
    const structureAnalyzer = new DirectoryStructureAnalyzer(testDir);
    const projectAnalyzer = new DefaultProjectAnalyzer(
      testDir,
      languageDetector,
      commandDetector,
      structureAnalyzer
    );

    services = {
      ticketService: {} as any, // Not used in this test
      gitService: {} as any, // Not used in this test
      projectAnalyzer
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should analyze TypeScript project end-to-end', async () => {
    // Create a minimal TypeScript project
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      scripts: {
        test: 'vitest',
        lint: 'eslint src',
        build: 'tsc'
      },
      dependencies: {
        'express': '^4.18.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        'vitest': '^0.34.0',
        'eslint': '^8.0.0'
      }
    }));
    
    await writeFile(join(testDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true
      }
    }));
    
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/index.ts'), `
      import express from 'express';
      const app = express();
      app.listen(3000);
    `);
    
    await mkdir(join(testDir, 'tests'), { recursive: true });
    await writeFile(join(testDir, 'tests/index.test.ts'), `
      import { describe, it, expect } from 'vitest';
      describe('test', () => {
        it('works', () => expect(1).toBe(1));
      });
    `);

    const result = await analyzeProject({ path: testDir }, services);

    if (!result.success) {
      console.error('Analysis failed:', result.message);
    }

    expect(result.success).toBe(true);
    expect(result.message).toContain('Project Analysis');
    
    const analysis = result.data;
    expect(analysis).toBeDefined();
    expect(analysis.languages.some(l => l.name === 'TypeScript')).toBe(true);
    expect(analysis.commands.test?.command).toContain('test');
    expect(analysis.commands.lint?.command).toContain('lint');
    expect(analysis.commands.build?.command).toContain('build');
    expect(analysis.structure.directories.some(d => d.name === 'src')).toBe(true);
  });

  it('should analyze Python Flask project', async () => {
    // Create a minimal Flask project
    await writeFile(join(testDir, 'requirements.txt'), 'flask==2.3.0\npytest==7.4.0\nruff==0.1.0');
    await writeFile(join(testDir, 'app.py'), `
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World!'
    `);
    
    await writeFile(join(testDir, 'test_app.py'), `
def test_hello():
    assert True
    `);
    
    await writeFile(join(testDir, 'pytest.ini'), `
[pytest]
testpaths = .
    `);

    const result = await analyzeProject({ path: testDir }, services);

    expect(result.success).toBe(true);
    const analysis = result.data;
    expect(analysis.languages.some(l => l.name === 'Python')).toBe(true);
    expect(analysis.framework.name).toContain('Flask');
    expect(analysis.commands.test?.command).toContain('pytest');
  });

  it('should handle missing projectAnalyzer service', async () => {
    const servicesWithoutAnalyzer = {
      ...services,
      projectAnalyzer: undefined
    };

    const result = await analyzeProject({ path: testDir }, servicesWithoutAnalyzer);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Project analyzer service not available');
  });

  it('should analyze project with cache', async () => {
    // Create simple project
    await writeFile(join(testDir, 'index.js'), 'console.log("test");');

    // First analysis
    const result1 = await analyzeProject({ path: testDir }, services);
    expect(result1.success).toBe(true);
    expect(result1.data.languages[0].files).toBe(1);

    // Second analysis should use cache (within 5 minute window)
    const result2 = await analyzeProject({ path: testDir }, services);
    expect(result2.success).toBe(true);
    expect(result2.data.languages[0].files).toBe(1); // Should return cached result
    
    // Verify it's the same analysis (cached)
    expect(result2.data.timestamp).toBe(result1.data.timestamp);
  });

  it('should provide helpful output format', async () => {
    await writeFile(join(testDir, 'package.json'), JSON.stringify({
      name: 'test-app',
      scripts: { test: 'jest' }
    }));
    await writeFile(join(testDir, 'index.js'), 'module.exports = {};');

    const result = await analyzeProject({ path: testDir, format: 'detailed' }, services);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Language');
    expect(result.message).toContain('Commands');
    expect(result.message).toContain('Structure');
  });

  it('should handle empty project gracefully', async () => {
    const result = await analyzeProject({ path: testDir }, services);

    expect(result.success).toBe(true);
    expect(result.message).toContain('No languages detected');
    expect(result.data.languages).toHaveLength(0);
  });

  it('should analyze PHP Laravel project', async () => {
    // Create minimal Laravel structure
    await writeFile(join(testDir, 'composer.json'), JSON.stringify({
      require: {
        'laravel/framework': '^10.0'
      },
      'require-dev': {
        'phpunit/phpunit': '^10.0'
      }
    }));
    
    await writeFile(join(testDir, 'artisan'), '#!/usr/bin/env php\n<?php\n// Laravel artisan');
    await mkdir(join(testDir, 'app/Http'), { recursive: true });
    await writeFile(join(testDir, 'app/Http/Kernel.php'), '<?php\nnamespace App\\Http;\nclass Kernel {}');

    const result = await analyzeProject({ path: testDir }, services);

    expect(result.success).toBe(true);
    const analysis = result.data;
    expect(analysis.languages.some(l => l.name === 'PHP')).toBe(true);
    expect(analysis.framework.name).toBe('Laravel');
  });
});