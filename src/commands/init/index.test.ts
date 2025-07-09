import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initCommand } from './index.js';

// Mock the claude-md command
vi.mock('./claude-md.js', () => ({
  initClaudeMdCommand: vi.fn().mockResolvedValue({
    success: true,
    message: 'Mock claude-md command executed'
  })
}));

// Mock the install command
vi.mock('../install/command.js', () => ({
  installCommandCommand: vi.fn()
}));

describe('initCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('default behavior (no subcommand)', () => {
    it('should install ait3-init command guide and show instructions', async () => {
      const { installCommandCommand } = await import('../install/command.js');
      vi.mocked(installCommandCommand).mockResolvedValue({
        success: true,
        message: 'SUCCESS: Installed command guide: .claude/commands/ait3-init'
      });

      const result = await initCommand({});

      expect(installCommandCommand).toHaveBeenCalledWith({
        name: 'ait3-init',
        force: undefined
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Installed command guide: .claude/commands/ait3-init');
      expect(result.message).toContain('Next steps to generate CLAUDE.md:');
      expect(result.message).toContain('1. Launch Claude Code in your terminal: claude');
      expect(result.message).toContain('2. In Claude Code, run: /ait3-init');
      expect(result.message).toContain('3. Follow the interactive guide');
    });

    it('should pass force flag when provided', async () => {
      const { installCommandCommand } = await import('../install/command.js');
      vi.mocked(installCommandCommand).mockResolvedValue({
        success: true,
        message: 'SUCCESS: Installed command guide: .claude/commands/ait3-init'
      });

      const result = await initCommand({ force: true });

      expect(installCommandCommand).toHaveBeenCalledWith({
        name: 'ait3-init',
        force: true
      });
      expect(result.success).toBe(true);
    });

    it('should handle installation failure', async () => {
      const { installCommandCommand } = await import('../install/command.js');
      vi.mocked(installCommandCommand).mockResolvedValue({
        success: false,
        message: 'ERROR: Failed to install command guide'
      });

      const result = await initCommand({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('ERROR: Failed to install command guide');
    });

    it('should handle when command guide already exists', async () => {
      const { installCommandCommand } = await import('../install/command.js');
      vi.mocked(installCommandCommand).mockResolvedValue({
        success: true,
        message: 'NOTICE: Command guide already exists: .claude/commands/ait3-init (use --force to overwrite)'
      });

      const result = await initCommand({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Command guide already exists');
      expect(result.message).toContain('Next steps to generate CLAUDE.md:');
    });
  });

  describe('subcommand routing', () => {
    it('should route to claude-md subcommand', async () => {
      const args = { subcommand: 'claude-md' };
      
      const result = await initCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock claude-md command executed');
    });


    it('should handle unknown subcommand', async () => {
      const args = { subcommand: 'unknown' };
      
      const result = await initCommand(args);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown init subcommand: unknown');
      expect(result.message).toContain('Available subcommands');
      expect(result.message).toContain('claude-md');
    });
  });

  describe('argument passing', () => {
    it('should pass all arguments to subcommand', async () => {
      const { initClaudeMdCommand } = await import('./claude-md.js');
      
      const args = { 
        subcommand: 'claude-md',
        force: true,
        detailed: true,
        json: false,
        output: 'custom/path'
      };
      
      await initCommand(args);
      
      expect(initClaudeMdCommand).toHaveBeenCalledWith(args);
    });
  });
});