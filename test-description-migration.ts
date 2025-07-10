#!/usr/bin/env node
import { LocalTicketService } from './src/services/implementations/LocalTicketService.js';
import { GitHubTicketService } from './src/services/implementations/GitHubTicketService.js';
import { TicketMigrationService } from './src/services/implementations/TicketMigrationService.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function testDescriptionMigration() {
  // Create temporary directory for test
  const testDir = await mkdtemp(join(tmpdir(), 'test-migration-'));
  
  try {
    // Create local ticket service
    const localService = new LocalTicketService(testDir);
    
    // Create a ticket with description
    const ticket = await localService.createTicket('Test ticket with description', {
      priority: 'high',
      labels: ['feature', 'urgent'],
      description: `# Detailed Description

This is a comprehensive description of the feature.

## Background
- Point 1
- Point 2

## Technical Details
\`\`\`typescript
function example() {
  return 'test';
}
\`\`\`

## Notes
Additional implementation notes.`
    });
    
    console.log('Created local ticket:', ticket.id);
    
    // Read the ticket to verify description was saved
    const savedTicket = await localService.getTicket(ticket.id);
    if (savedTicket?.description) {
      console.log('\\nDescription successfully saved in local ticket:');
      console.log('----------------------------------------');
      console.log(savedTicket.description);
      console.log('----------------------------------------');
    } else {
      console.error('ERROR: Description was not saved!');
    }
    
    // Mock GitHub service for demonstration
    const mockGitHubService = {
      createTicket: async (title: string, options: any) => {
        console.log('\\nMigrating to GitHub with:');
        console.log('Title:', title);
        console.log('Options:', JSON.stringify(options, null, 2));
        return { id: '#1', title, ...options };
      },
      listTickets: async () => [],
      startTicket: async () => {},
      completeTicket: async () => {}
    } as any;
    
    // Perform migration
    const migrationService = new TicketMigrationService();
    const result = await migrationService.migrateLocalToGitHub(
      localService,
      mockGitHubService
    );
    
    console.log('\\nMigration result:', result);
    
  } finally {
    // Clean up
    await rm(testDir, { recursive: true, force: true });
  }
}

// Run the test
testDescriptionMigration().catch(console.error);