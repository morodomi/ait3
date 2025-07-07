/**
 * Common message templates for flow commands
 * Provides consistent error messages and validation across all AIT³ flow phases
 */

export const FLOW_MESSAGES = {
  // Ticket validation messages
  TICKET_ID_REQUIRED: (phase: string) => `Ticket ID is required for ${phase} phase`,
  TICKET_NOT_FOUND: (id: string) => `Ticket with ID '${id}' not found`,
  TICKET_NOT_IN_PROGRESS: (id: string) => `Ticket #${id} must be in progress (doing status)`,
  TICKET_ALREADY_COMPLETED: (id: string) => `Ticket #${id} is already completed`,
  
  // Phase-specific messages
  FEATURE_REQUIRED: 'Feature name is required for planning phase',
  PLANNING_SUCCESS: 'Planning phase completed',
  RED_SUCCESS: 'Tests generated successfully',
  TEST_GENERATION_SUCCESS: 'Test files generated successfully',
  DRY_RUN_PREFIX: 'DRY RUN - No files will be created',
  GREEN_SUCCESS: 'Implementation completed',
  TARGET_TEST_NOT_FOUND: (path: string) => `Target test file not found: ${path}`,
  TEST_MODIFICATION_WARNING: 'WARNING: Test file modification detected!',
  IMPLEMENTATION_COMPLETE: 'All tests passing - implementation complete!',
  REFACTOR_SUCCESS: 'Refactoring analysis completed',
  SQUASH_SUCCESS: 'Git suggestions generated',
  
  // Common workflow messages
  PHILOSOPHY: 'Claude proposes → Gemini refutes → Human decides',
  NEXT_STEP_RED: 'Next step: ait3 flow red',
  NEXT_STEP_GREEN: 'Next step: ait3 flow green', 
  NEXT_STEP_REFACTOR: 'Next step: ait3 flow refactor',
  NEXT_STEP_SQUASH: 'Next step: ait3 flow squash',
  NEXT_STEP_COMPLETE: 'Next step: ait3 ticket complete'
} as const;

export type FlowMessagesType = typeof FLOW_MESSAGES;