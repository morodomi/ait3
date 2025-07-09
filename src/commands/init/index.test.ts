import { describe, it, expect, vi } from 'vitest';
import { initCommand } from './index.js';

// Mock the claude-md command
vi.mock('./claude-md.js', () => ({
  initClaudeMdCommand: vi.fn().mockResolvedValue({
    success: true,
    message: 'Mock claude-md command executed'
  })
}));

describe('initCommand', () => {
  describe('subcommand routing', () => {
    it('should route to claude-md subcommand', async () => {
      const args = { subcommand: 'claude-md' };
      
      const result = await initCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock claude-md command executed');
    });

    it('should show help when no subcommand provided', async () => {
      const args = {};
      
      const result = await initCommand(args);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Init command requires a subcommand');
      expect(result.message).toContain('Available subcommands');
      expect(result.message).toContain('ait3 init claude-md');
      expect(result.message).toContain('ait3 install command ait3-init');
      expect(result.message).toContain('ait3 install claude-md');
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