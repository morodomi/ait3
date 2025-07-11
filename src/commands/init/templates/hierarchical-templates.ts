/**
 * Hierarchical CLAUDE.md templates for different project types
 * Extracted from init command for better maintainability
 */

interface TemplateFile {
  path: string;
  content: string;
}

export const TYPESCRIPT_HIERARCHICAL_TEMPLATES: TemplateFile[] = [
  {
    path: 'src/CLAUDE.md',
    content: `# Source Code Implementation Guidelines

## TypeScript Best Practices

- Use TypeScript strict mode
- Write pure functions with explicit types
- Follow functional programming principles
- Use service injection for dependencies
- Avoid any types

## Code Organization

- Commands as pure functions
- Services for external dependencies
- Clear separation of concerns
- Comprehensive error handling

## Naming Conventions

- camelCase for functions and variables
- PascalCase for types and classes
- Descriptive names that reveal intent
`
  },
  {
    path: 'tests/CLAUDE.md',
    content: `# Test Strategy

## Testing Framework: Vitest

### Test Structure
\`\`\`typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });
  
  it('should do something specific', () => {
    // Test implementation
  });
});
\`\`\`

## Mocking Strategy

- Use vi.mock() for module mocking
- Service injection for easy testing
- Avoid mocking what you don't own

## Test Categories

- Unit tests for pure functions
- Integration tests for services
- E2E tests for CLI commands
`
  }
];

export const LARAVEL_HIERARCHICAL_TEMPLATES: TemplateFile[] = [
  {
    path: 'app/CLAUDE.md',
    content: `# Laravel Backend Guidelines

## Architecture Patterns

- Repository pattern for data access
- Service layer for business logic
- Form requests for validation
- Resources for API responses

## Laravel Best Practices

- Use dependency injection
- Follow PSR standards
- Implement proper error handling
- Use Laravel's built-in features

## Controllers

- Keep controllers thin
- Single responsibility principle
- Use form requests for validation
- Return resources, not models
`
  },
  {
    path: 'resources/views/CLAUDE.md',
    content: `# Blade Template Guidelines

## Component Architecture

- Use Blade components for reusability
- Implement proper component slots
- Follow atomic design principles

## Styling with Tailwind CSS

- Utility-first approach
- Component classes for repeated patterns
- Responsive design by default
- Dark mode support

## Blade Best Practices

- Use @forelse instead of @foreach when possible
- Proper escaping with {{ }} vs {!! !!}
- Component-based architecture
- Avoid logic in views
`
  },
  {
    path: 'resources/js/CLAUDE.md',
    content: `# Frontend JavaScript Guidelines

## Framework Choice

- Alpine.js for simple interactions
- Vue.js for complex SPAs
- Livewire for server-driven apps

## Alpine.js Patterns

\`\`\`javascript
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open">Content</div>
</div>
\`\`\`

## Build Process

- Vite for asset bundling
- ES modules approach
- Tree shaking enabled
- Hot module replacement
`
  },
  {
    path: 'tests/CLAUDE.md',
    content: `# Laravel Testing Strategy

## PHPUnit Configuration

- Feature tests for HTTP endpoints
- Unit tests for services
- Database transactions for isolation

## Testing Patterns

\`\`\`php
public function test_user_can_create_post(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)
        ->post('/posts', [
            'title' => 'Test Post',
            'content' => 'Content'
        ]);
        
    $response->assertStatus(201);
    $this->assertDatabaseHas('posts', [
        'title' => 'Test Post'
    ]);
}
\`\`\`
`
  },
  {
    path: 'CLAUDE.laravel-infra.md',
    content: `# Laravel Infrastructure Guidelines

## Docker Configuration

- Multi-stage builds
- Separate containers for services
- Environment-specific configs

## AWS Deployment with Bref

- Serverless Laravel on Lambda
- CodePipeline for CI/CD
- RDS for database
- S3 for file storage

## Environment Management

- .env for local development
- AWS Parameter Store for production
- Proper secret rotation
`
  }
];

export const FLASK_TEMPLATE_FILES: TemplateFile[] = [
  {
    path: 'CLAUDE.flask-backend.md',
    content: `# Flask Backend Guidelines

## Project Structure

\`\`\`
app/
├── __init__.py
├── routes/
├── models/
├── services/
└── utils/
\`\`\`

## Flask Best Practices

- Use blueprints for route organization
- Implement proper error handlers
- Use Flask-SQLAlchemy for ORM
- Environment-based configuration

## Python Patterns

- Type hints for all functions
- Dependency injection where possible
- Poetry for dependency management
- Black for code formatting
`
  },
  {
    path: 'CLAUDE.flask-frontend.md',
    content: `# Flask Frontend Guidelines

## Static Assets with Vite

- ES modules for JavaScript
- Alpine.js for interactivity
- Tailwind CSS for styling
- Hot reload in development

## Template Structure

- Jinja2 template inheritance
- Reusable components via macros
- Proper context passing
- XSS prevention
`
  },
  {
    path: 'CLAUDE.flask-tests.md',
    content: `# Flask Testing Strategy

## pytest Configuration

\`\`\`python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        yield client
\`\`\`

## Test Patterns

- Fixtures for common setup
- Mock external services
- Test database isolation
- Coverage reporting
`
  },
  {
    path: 'CLAUDE.flask-infra.md',
    content: `# Flask Infrastructure Guidelines

## Docker Setup

- Python slim images
- Multi-stage builds
- Gunicorn for production

## AWS Deployment with Zappa

- Serverless Flask on Lambda
- API Gateway integration
- CodePipeline CI/CD
- CloudWatch logging
`
  }
];