import { describe, it, expect } from 'vitest';
import chalk from 'chalk';
import { STYLES, migrateStyle } from './styles.js';

// Force chalk to use colors in tests
chalk.level = 3;

describe('STYLES - Simplified Style System', () => {
  describe('new STYLES constant', () => {
    it('should have exactly 7 style properties', () => {
      const styleKeys = Object.keys(STYLES);
      expect(styleKeys).toHaveLength(7);
      expect(styleKeys).toEqual([
        'success', 'info', 'warning', 'danger', 'muted', 'bold', 'code'
      ]);
    });

    it('should use semantic 5-color system', () => {
      // Semantic colors
      expect(STYLES.success).toBe(chalk.green);
      expect(STYLES.info).toBe(chalk.blue);
      expect(STYLES.warning).toBe(chalk.yellow);
      expect(STYLES.danger).toBe(chalk.red);
      expect(STYLES.muted).toBe(chalk.gray);
    });

    it('should provide minimal decorations', () => {
      // Basic decorations
      expect(STYLES.bold).toBe(chalk.bold);
      expect(STYLES.code).toBe(chalk.gray);
    });

    it('should apply styles correctly', () => {
      // Test style application
      expect(STYLES.success('Success')).toContain('\u001b[32m'); // green
      expect(STYLES.info('Info')).toContain('\u001b[34m'); // blue
      expect(STYLES.warning('Warning')).toContain('\u001b[33m'); // yellow
      expect(STYLES.danger('Error')).toContain('\u001b[31m'); // red
      expect(STYLES.muted('Muted')).toContain('\u001b[90m'); // gray
      expect(STYLES.bold('Bold')).toContain('\u001b[1m'); // bold
    });
  });

  describe('FLOW_STYLES removal', () => {
    it('should not export FLOW_STYLES', async () => {
      // FLOW_STYLES should be completely removed
      // Verify that FLOW_STYLES is not exported from styles.ts
      const stylesModule = await import('./styles.js');
      expect(stylesModule.FLOW_STYLES).toBeUndefined();
    });
  });

  describe('migration helpers', () => {
    it('should provide migration mapping function', () => {
      
      // Test migration mappings
      expect(migrateStyle('success')).toBe('success');
      expect(migrateStyle('error')).toBe('danger');
      expect(migrateStyle('warning')).toBe('warning');
      expect(migrateStyle('info')).toBe('info');
      expect(migrateStyle('gitSuccess')).toBe('success');
      expect(migrateStyle('gitWarning')).toBe('warning');
      expect(migrateStyle('gitInfo')).toBe('info');
      expect(migrateStyle('gitCommand')).toBe('muted');
      expect(migrateStyle('dim')).toBe('muted');
      expect(migrateStyle('code')).toBe('muted');
      expect(migrateStyle('path')).toBe('info');
      expect(migrateStyle('title')).toBe('bold');
      expect(migrateStyle('section')).toBe('bold');
    });
  });

  describe('style guidelines', () => {
    it('should follow semantic usage patterns', () => {
      // Success scenarios
      const successMessage = STYLES.success('Ticket created successfully');
      expect(successMessage).toContain('\u001b[32m');
      
      // Error scenarios
      const errorMessage = STYLES.danger('Failed to create ticket');
      expect(errorMessage).toContain('\u001b[31m');
      
      // Warning scenarios
      const warningMessage = STYLES.warning('Manual steps required');
      expect(warningMessage).toContain('\u001b[33m');
      
      // Info scenarios
      const infoMessage = STYLES.info('Ticket ID: 0001');
      expect(infoMessage).toContain('\u001b[34m');
      
      // Muted scenarios
      const mutedMessage = STYLES.muted('git checkout -b feature/0001');
      expect(mutedMessage).toContain('\u001b[90m');
    });
  });
});