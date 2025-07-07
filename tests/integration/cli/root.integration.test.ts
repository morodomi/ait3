import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI Integration: Root Commands', () => {
  describe('version command', () => {
    it('should show version information', () => {
      const result = execSync('node dist/cli.js --version', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('1.0.0');
    });
  });

  describe('help command', () => {
    it('should show help information', () => {
      const result = execSync('node dist/cli.js --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('AIT³ Development Platform - AI + Ticket + Test + Tool driven development');
      expect(result).toContain('Commands:');
      expect(result).toContain('ticket');
    });

    it('should show help when no command provided', () => {
      expect(() => {
        execSync('node dist/cli.js', {
          encoding: 'utf8',
          timeout: 5000
        });
      }).toThrow(/Usage: ait3 \[options\] \[command\]/);
    });
  });

  describe('ticket command group', () => {
    it('should show ticket help', () => {
      const result = execSync('node dist/cli.js ticket --help', {
        encoding: 'utf8',
        timeout: 5000
      });

      expect(result).toContain('Ticket management commands');
      expect(result).toContain('create [options] <title>');
      expect(result).toContain('Create a new ticket');
      expect(result).toContain('Examples:');
    });
  });
});