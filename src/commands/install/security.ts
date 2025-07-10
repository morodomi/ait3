import { readFile, writeFile, access } from 'fs/promises';
import type { CLIResult } from '../../common/types.js';

interface Settings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
}

/**
 * Install security settings to restrict dangerous commands
 * Updates existing .claude/settings.local.json file
 */
export async function installSecurity(): Promise<CLIResult> {
  const settingsPath = '.claude/settings.local.json';
  
  // Check if settings file exists (Claude Code must create it first)
  try {
    await access(settingsPath);
  } catch {
    return {
      success: false,
      message: 'settings.local.json not found. Please launch Claude Code first.'
    };
  }
  
  try {
    // Read existing settings
    const content = await readFile(settingsPath, 'utf-8');
    let settings: Settings;
    
    try {
      settings = JSON.parse(content);
    } catch {
      return {
        success: false,
        message: 'Failed to parse settings.local.json'
      };
    }
    
    // Initialize permissions if not exists
    if (!settings.permissions) {
      settings.permissions = {};
    }
    
    if (!settings.permissions.deny) {
      settings.permissions.deny = [];
    }
    
    // Security rules to add
    const securityDenyRules = [
      'Bash(curl:*)',
      'Bash(wget:*)',
      'Bash(rm:*)'
    ];
    
    // Add rules without duplicates
    const existingDeny = new Set(settings.permissions.deny);
    for (const rule of securityDenyRules) {
      existingDeny.add(rule);
    }
    
    settings.permissions.deny = Array.from(existingDeny);
    
    // Write back with proper formatting
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    
    return {
      success: true,
      message: 'Security settings applied to .claude/settings.local.json'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update security settings: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}