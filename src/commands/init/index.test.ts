import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, access, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { initCommand } from './index.js';

describe('initCommand - Redesigned', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();
    
    // Create unique test directory
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-init-${hash}-`);
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
    it('should generate exactly 4 files', async () => {
      // Create minimal package.json for project detection
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      // Check all 4 files were created
      await expect(access('CLAUDE.ait3.md')).resolves.toBeUndefined();
      await expect(access('.claude/CLAUDE.md')).resolves.toBeUndefined();
      await expect(access('.claude/commands/ait3-init')).resolves.toBeUndefined();
      await expect(access('.claude/commands/review')).resolves.toBeUndefined();
      
      // Ensure settings.local.json was NOT created
      await expect(access('.claude/settings.local.json')).rejects.toThrow();
    });

    it('should reject subcommands with helpful error', async () => {
      const result = await initCommand({ subcommand: 'claude-md' });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Subcommands are no longer supported');
      expect(result.message).toContain('ait3 init');
      expect(result.message).toContain('claude');
      expect(result.message).toContain('/ait3-init');
    });

    it('should overwrite existing files without warning', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      // Create existing files with old content
      await writeFile('CLAUDE.ait3.md', '# Old content');
      await mkdir('.claude/commands', { recursive: true });
      await writeFile('.claude/CLAUDE.md', '# Old minimal content');
      await writeFile('.claude/commands/review', '# Old review content');
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      // Verify files were overwritten
      const newContent = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(newContent).not.toContain('Old content');
      expect(newContent).toContain('AIT³');
      
      // Verify review command was overwritten
      const reviewContent = await readFile('.claude/commands/review', 'utf-8');
      expect(reviewContent).not.toContain('Old review content');
      expect(reviewContent).toContain('Multi-Agent Code Review');
    });
  });

  describe('project analysis', () => {
    it('should detect Node.js TypeScript project correctly', async () => {
      await writeFile('package.json', JSON.stringify({
        name: 'test-ts-project',
        devDependencies: { typescript: '^5.0.0' }
      }));
      await writeFile('tsconfig.json', '{}');
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      // Check CLAUDE.ait3.md contains TypeScript-specific content
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).toContain('TypeScript');
      expect(content).toContain('test-ts-project');
    });

    it('should detect Python project with requirements.txt', async () => {
      await writeFile('requirements.txt', 'fastapi==0.100.0\npytest==7.0.0');
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).toContain('Python');
      expect(content).toContain('pip install');
    });

    it('should detect Go project', async () => {
      await writeFile('go.mod', 'module example.com/test\n\ngo 1.21');
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).toContain('Go');
      expect(content).toContain('go mod');
    });

    it('should handle unknown project type gracefully', async () => {
      // No recognizable project files
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).toContain('Project');
      expect(content).toContain('AIT³');
    });
  });

  describe('file content validation', () => {
    it('should generate valid CLAUDE.ait3.md with AIT³ methodology', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      
      // Check for AIT³ methodology sections
      expect(content).toContain('AIT³');
      expect(content).toContain('PLANNING');
      expect(content).toContain('RED');
      expect(content).toContain('GREEN');
      expect(content).toContain('REFACTOR');
      expect(content).toContain('SQUASH');
      
      // Check for project analysis
      expect(content).toContain('test-project');
      expect(content).toContain('## Architecture');
      expect(content).toContain('## Key Commands');
    });

    it('should generate minimal .claude/CLAUDE.md', async () => {
      await writeFile('package.json', JSON.stringify({ 
        name: 'test-project',
        version: '1.0.0'
      }));
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/CLAUDE.md', 'utf-8');
      
      // Check minimal content
      expect(content).toContain('test-project');
      expect(content).toContain('/ait3-init');
      expect(content).toContain('Project type');
      expect(content).toContain('Language');
      
      // Should NOT contain full AIT³ methodology
      expect(content.length).toBeLessThan(1000); // Minimal content
    });

    it('should generate correct ait3-init command guide', async () => {
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/commands/ait3-init', 'utf-8');
      
      // Check command guide content
      expect(content).toContain('Initialize Complete CLAUDE.md');
      expect(content).toContain('ait3 install security');
      expect(content).toContain('Read CLAUDE.ait3.md');
      expect(content).toContain('Delete CLAUDE.ait3.md');
      expect(content).toContain('Optional but Recommended');
    });

    it('should generate correct review command guide', async () => {
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      
      const content = await readFile('.claude/commands/review', 'utf-8');
      
      // Check review command guide content
      expect(content).toContain('Multi-Agent Code Review');
      expect(content).toContain('Correctness Review (Claude)');
      expect(content).toContain('Performance Review (Gemini)');
      expect(content).toContain('Security Review (Claude)');
      expect(content).toContain('Synthesize Results');
      expect(content).toContain('Document Decision');
      expect(content).toContain('gemini -p "@src/ @tests/');
      expect(content).toContain('review(#TICKET): implement review feedback');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Make directory read-only to cause write error
      await writeFile('.claude', '', { mode: 0o444 });
      
      const result = await initCommand({});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    it('should handle malformed package.json', async () => {
      await writeFile('package.json', 'invalid json content');
      
      const result = await initCommand({});
      
      // Should still succeed with generic template
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).toContain('Project'); // Generic content
    });
  });

  describe('success message', () => {
    it('should provide clear next steps', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS');
      expect(result.message).toContain('claude');
      expect(result.message).toContain('/ait3-init');
      expect(result.message).toContain('4 files generated');
    });

    it('should include review command in file list', async () => {
      await writeFile('package.json', JSON.stringify({ name: 'test-project' }));
      
      const result = await initCommand({});
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Files created:');
      expect(result.message).toContain('CLAUDE.ait3.md');
      expect(result.message).toContain('.claude/CLAUDE.md');
      expect(result.message).toContain('.claude/commands/ait3-init');
      expect(result.message).toContain('.claude/commands/review');
    });
  });

  describe('backward compatibility', () => {
    it('should ignore force option (always overwrites)', async () => {
      await writeFile('CLAUDE.ait3.md', 'old content');
      
      const result = await initCommand({ force: true });
      
      expect(result.success).toBe(true);
      
      const content = await readFile('CLAUDE.ait3.md', 'utf-8');
      expect(content).not.toContain('old content');
    });

    it('should ignore other legacy options', async () => {
      const result = await initCommand({ 
        detailed: true,
        json: true,
        output: '/some/path'
      });
      
      expect(result.success).toBe(true);
      // Options are ignored, standard behavior applies
    });
  });

  describe('hierarchical CLAUDE.md generation', () => {
    describe('TypeScript project', () => {
      beforeEach(async () => {
        await writeFile('package.json', JSON.stringify({
          name: 'test-cli',
          scripts: { test: 'vitest', build: 'tsc' },
          devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' }
        }));
      });

      it('should generate src/CLAUDE.md for TypeScript project', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('src/CLAUDE.md')).resolves.toBeUndefined();
        const content = await readFile('src/CLAUDE.md', 'utf-8');
        expect(content).toContain('Implementation Guidelines');
        expect(content).toContain('TypeScript');
        expect(content).toContain('pure functions');
        expect(content).toContain('strict mode');
      });

      it('should generate tests/CLAUDE.md for TypeScript project', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('tests/CLAUDE.md')).resolves.toBeUndefined();
        const content = await readFile('tests/CLAUDE.md', 'utf-8');
        expect(content).toContain('Test Strategy');
        expect(content).toContain('Vitest');
        expect(content).toContain('describe');
        expect(content).toContain('vi.mock');
      });
    });

    describe('Laravel project', () => {
      beforeEach(async () => {
        await writeFile('composer.json', JSON.stringify({
          require: { 'laravel/framework': '^10.0' }
        }));
        await writeFile('artisan', '#!/usr/bin/env php');
      });

      it('should generate app/CLAUDE.md for Laravel project', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('app/CLAUDE.md')).resolves.toBeUndefined();
        const content = await readFile('app/CLAUDE.md', 'utf-8');
        expect(content).toContain('Backend');
        expect(content).toContain('Laravel');
        expect(content).toContain('Controller');
        expect(content).toContain('Service');
      });

      it('should generate resources/views/CLAUDE.md for Laravel project', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('resources/views/CLAUDE.md')).resolves.toBeUndefined();
        const content = await readFile('resources/views/CLAUDE.md', 'utf-8');
        expect(content).toContain('Blade');
        expect(content).toContain('Component');
        expect(content).toContain('Tailwind');
      });

      it('should generate resources/js/CLAUDE.md for Laravel project', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('resources/js/CLAUDE.md')).resolves.toBeUndefined();
        const content = await readFile('resources/js/CLAUDE.md', 'utf-8');
        expect(content).toContain('Frontend');
        expect(content).toContain('Vue');
        expect(content).toContain('Alpine.js');
      });

      it('should generate Laravel infrastructure template', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('CLAUDE.laravel-infra.md')).resolves.toBeUndefined();
        const content = await readFile('CLAUDE.laravel-infra.md', 'utf-8');
        expect(content).toContain('Docker');
        expect(content).toContain('Bref');
        expect(content).toContain('CodePipeline');
      });
    });

    describe('Flask project', () => {
      beforeEach(async () => {
        await writeFile('requirements.txt', 'Flask==2.3.0\npytest==7.4.0');
      });

      it('should generate Flask template files', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        // Backend template
        await expect(access('CLAUDE.flask-backend.md')).resolves.toBeUndefined();
        const backendContent = await readFile('CLAUDE.flask-backend.md', 'utf-8');
        expect(backendContent).toContain('Flask');
        expect(backendContent).toContain('Python');
        expect(backendContent).toContain('Poetry');
        
        // Frontend template
        await expect(access('CLAUDE.flask-frontend.md')).resolves.toBeUndefined();
        const frontendContent = await readFile('CLAUDE.flask-frontend.md', 'utf-8');
        expect(frontendContent).toContain('Vite');
        expect(frontendContent).toContain('Alpine.js');
        
        // Tests template
        await expect(access('CLAUDE.flask-tests.md')).resolves.toBeUndefined();
        const testsContent = await readFile('CLAUDE.flask-tests.md', 'utf-8');
        expect(testsContent).toContain('pytest');
        
        // Infrastructure template
        await expect(access('CLAUDE.flask-infra.md')).resolves.toBeUndefined();
        const infraContent = await readFile('CLAUDE.flask-infra.md', 'utf-8');
        expect(infraContent).toContain('Docker');
        expect(infraContent).toContain('Zappa');
      });

      it('should update ait3-init command with Flask instructions', async () => {
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        const content = await readFile('.claude/commands/ait3-init', 'utf-8');
        expect(content).toContain('Flask project');
        expect(content).toContain('CLAUDE.flask-backend.md');
        expect(content).toContain('rm -f CLAUDE.flask-*.md');
      });
    });

    describe('edge cases', () => {
      it('should not overwrite existing hierarchical CLAUDE.md files', async () => {
        await mkdir('src', { recursive: true });
        await writeFile('src/CLAUDE.md', '# Custom content');
        await writeFile('package.json', JSON.stringify({
          devDependencies: { typescript: '^5.0.0' }
        }));
        
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        const content = await readFile('src/CLAUDE.md', 'utf-8');
        expect(content).toBe('# Custom content');
      });

      it('should create necessary directories', async () => {
        await writeFile('composer.json', JSON.stringify({
          require: { 'laravel/framework': '^10.0' }
        }));
        
        const result = await initCommand({});
        
        expect(result.success).toBe(true);
        
        await expect(access('app')).resolves.toBeUndefined();
        await expect(access('resources/views')).resolves.toBeUndefined();
        await expect(access('resources/js')).resolves.toBeUndefined();
      });

      it('should generate review command for all project types', async () => {
        // Test TypeScript project
        await writeFile('package.json', JSON.stringify({
          devDependencies: { typescript: '^5.0.0' }
        }));
        
        let result = await initCommand({});
        expect(result.success).toBe(true);
        await expect(access('.claude/commands/review')).resolves.toBeUndefined();
        
        // Clean up and test Laravel project
        await rm('.claude', { recursive: true, force: true });
        await writeFile('composer.json', JSON.stringify({
          require: { 'laravel/framework': '^10.0' }
        }));
        
        result = await initCommand({});
        expect(result.success).toBe(true);
        await expect(access('.claude/commands/review')).resolves.toBeUndefined();
        
        // Clean up and test unknown project
        await rm('.claude', { recursive: true, force: true });
        await rm('composer.json', { force: true });
        await rm('package.json', { force: true });
        
        result = await initCommand({});
        expect(result.success).toBe(true);
        await expect(access('.claude/commands/review')).resolves.toBeUndefined();
      });
    });
  });
});