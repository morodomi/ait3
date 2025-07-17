# AIT³ Guided Discovery Workflow - Implementation Examples

**Date**: 2025-07-17  
**Version**: 1.0  
**Approach**: Balanced control with creative freedom

## 🎯 Overview

The "Guided Discovery" approach balances human control with AI creativity through:
- Clear scope boundaries (sandbox)
- Interactive dialogue within boundaries
- Permission-based scope expansion
- Continuous documentation

## 📋 Workflow Implementation Examples

### Scenario: Adding User Authentication Feature

---

## Phase 1: PLAN (Collaborative Charter)

### Command
```bash
ait3 flow plan "user-authentication"
```

### Output
```
🎭 PLANNING Phase: User Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Please describe your goal:
> Users should be able to register and login with email/password. Need JWT tokens for session management.

🤖 AI Analysis in progress...

📋 Proposed Implementation Charter:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Goal: Email/password authentication with JWT

📁 Primary Scope (sandbox):
  • src/auth/AuthService.ts (new)
  • src/auth/types.ts (new)
  • tests/unit/auth/AuthService.test.ts (new)

🔍 Secondary Scope (may need during implementation):
  • src/middleware/auth.ts (likely)
  • src/config/jwt.ts (likely)
  • src/models/User.ts (modification)

📊 Test Strategy:
  1. Unit tests for AuthService
     - Registration validation
     - Password hashing
     - JWT generation/validation
  2. Integration tests for middleware
     - Protected route access
     - Token expiration

⚠️ Out of Scope (requires permission):
  • Database schema changes
  • API endpoint modifications
  • Email service integration

🎯 Success Criteria:
  ✓ Users can register with email/password
  ✓ Passwords are securely hashed (bcrypt)
  ✓ JWT tokens are generated on login
  ✓ Middleware protects routes

Do you approve this charter? [Y/n/edit]: Y

✅ Charter approved. Ticket #001 created.
📄 Charter saved to: .tickets/doing/0001-user-authentication.md
```

### File Operation
```yaml
# .tickets/doing/0001-user-authentication.md
---
id: "0001"
title: "User Authentication"
phase: "PLAN"
charter:
  primary_scope:
    - src/auth/AuthService.ts
    - src/auth/types.ts
    - tests/unit/auth/AuthService.test.ts
  secondary_scope:
    - src/middleware/auth.ts
    - src/config/jwt.ts
    - src/models/User.ts
  out_of_scope:
    - database_changes
    - api_endpoints
    - email_service
---

# User Authentication Implementation

## Goal
Users should be able to register and login with email/password. Need JWT tokens for session management.

## Test Strategy
[... AI proposed strategy ...]
```

---

## Phase 2: IMPLEMENT (Guided TDD Cycle)

### Step 2.1: RED Phase

#### Command
```bash
ait3 flow red 0001
```

#### Output
```
🔴 RED Phase: Creating Tests for User Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Charter Review:
  Primary: AuthService.ts, types.ts
  Test: AuthService.test.ts

🎯 Test Creation Strategy:
  1. Start with simplest case (following KISS)
  2. Reuse patterns from existing tests
  3. Cover charter requirements only (YAGNI)

📝 Searching for test patterns...
  ✓ Found: tests/unit/services/TicketService.test.ts
  ✓ Pattern: describe/it blocks with service mocking

🤖 Creating initial test...

📄 Created: tests/unit/auth/AuthService.test.ts
```

#### File Created
```typescript
// tests/unit/auth/AuthService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../../src/auth/AuthService';
import { AuthError } from '../../../src/auth/types';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register user with valid email and password', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).not.toBe('SecurePass123!'); // hashed
      expect(result.token).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      await expect(authService.register({
        email: 'invalid-email',
        password: 'SecurePass123!'
      })).rejects.toThrow(AuthError);
    });

    it('should reject weak passwords', async () => {
      await expect(authService.register({
        email: 'test@example.com',
        password: '123'
      })).rejects.toThrow('Password too weak');
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      // First register
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      // Then login
      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
```

#### Status Update
```
🧪 Test Status:
  ✗ 4 tests created, 0 passing
  
Ready to proceed to GREEN phase? [Y/n]: Y
```

### Step 2.2: GREEN Phase

#### Command
```bash
ait3 flow green 0001
```

#### Output
```
🟢 GREEN Phase: Implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Charter Scope:
  ✓ src/auth/AuthService.ts
  ✓ src/auth/types.ts
  ? Secondary files available if needed

🎯 Implementing minimal code to pass tests...

📄 Creating: src/auth/types.ts
```

#### Files Created/Modified

**src/auth/types.ts**
```typescript
/**
 * Authentication types and interfaces
 * @module auth/types
 */

export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  password: string; // hashed
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

**src/auth/AuthService.ts**
```typescript
/**
 * Authentication service handling user registration and login
 * @module auth/AuthService
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterDto, LoginDto, User, AuthResponse, AuthError } from './types';

export class AuthService {
  private users: Map<string, User> = new Map(); // In-memory for now
  
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Validate email
    if (!this.isValidEmail(dto.email)) {
      throw new AuthError('Invalid email format');
    }
    
    // Validate password
    if (!this.isStrongPassword(dto.password)) {
      throw new AuthError('Password too weak');
    }
    
    // Check if user exists
    if (this.users.has(dto.email)) {
      throw new AuthError('User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Create user
    const user: User = {
      id: this.generateId(),
      email: dto.email,
      password: hashedPassword
    };
    
    this.users.set(dto.email, user);
    
    // Generate token
    const token = this.generateToken(user);
    
    return { user, token };
  }
  
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = this.users.get(dto.email);
    
    if (!user) {
      throw new AuthError('Invalid credentials');
    }
    
    const isValid = await bcrypt.compare(dto.password, user.password);
    
    if (!isValid) {
      throw new AuthError('Invalid credentials');
    }
    
    const token = this.generateToken(user);
    
    return { user, token };
  }
  
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  private isStrongPassword(password: string): boolean {
    return password.length >= 8;
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36);
  }
  
  private generateToken(user: User): string {
    return jwt.sign({ id: user.id, email: user.email }, 'secret', {
      expiresIn: '7d'
    });
  }
}
```

#### Scope Expansion Request
```
🤔 AI Request: Permission to modify secondary scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The JWT secret should not be hardcoded. May I create:
  • src/config/jwt.ts (in secondary scope)

This will improve security and follow best practices.

Allow this change? [Y/n]: Y

📄 Creating: src/config/jwt.ts
```

**src/config/jwt.ts**
```typescript
/**
 * JWT configuration
 * @module config/jwt
 */

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  expiresIn: '7d'
};
```

#### Test Results
```
🧪 Running tests...

 ✓ AuthService › register › should register user with valid email and password
 ✓ AuthService › register › should reject invalid email format  
 ✓ AuthService › register › should reject weak passwords
 ✓ AuthService › login › should login with correct credentials

Test Files  1 passed (1)
     Tests  4 passed (4)

✅ All tests passing! Ready for REFACTOR phase? [Y/n]: Y
```

### Step 2.3: REFACTOR Phase

#### Command
```bash
ait3 flow refactor 0001
```

#### Output
```
🔧 REFACTOR Phase: Code Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Code Analysis:
  ✓ Tests: 100% passing
  ✓ Principles Check:
    • KISS: Simple implementation ✓
    • DRY: No duplication detected ✓
    • YAGNI: Only required features ✓
    • SOLID: Single responsibility ✓

🔍 Refactoring Opportunities:
  1. Extract email validation to utils
  2. Move user storage to repository pattern
  3. Add password complexity rules

🤖 Suggested Refactoring:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Out of Scope Warning:
Creating a UserRepository would require database integration,
which is outside the current charter.

Within scope improvements:
1. Extract validation logic (DRY principle)
2. Add JSDoc comments
3. Improve error messages

Proceed with in-scope refactoring? [Y/n]: Y
```

#### Refactored Code
```typescript
// src/auth/validators.ts (new file - auto-approved as utility)
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  return { valid: true };
};
```

---

## Phase 3: INTEGRATE & FINALIZE

### Command
```bash
ait3 flow finalize 0001
```

### Output
```
📦 FINALIZE Phase: Integration & Documentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Verification Steps:
  • Running linter... ✓
  • Type checking... ✓
  • Test coverage... ✓ (100%)
  • Security scan... ✓

📄 Updating High-Level Documentation:

1. README.md - Adding authentication section
2. CHANGELOG.md - Adding feature entry

🔀 Git Operations:
━━━━━━━━━━━━━━━━━━━━━━━━

Files to commit:
  new: src/auth/AuthService.ts
  new: src/auth/types.ts  
  new: src/auth/validators.ts
  new: src/config/jwt.ts
  new: tests/unit/auth/AuthService.test.ts
  modified: .tickets/doing/0001-user-authentication.md

Suggested commit message:
━━━━━━━━━━━━━━━━━━━━━━━━
feat(auth): implement user authentication with JWT

- Add AuthService with register/login functionality
- Implement secure password hashing with bcrypt
- Add JWT token generation for sessions
- Include comprehensive test coverage
- Extract validation logic for reusability

Closes #1
━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with commit? [Y/n/edit]: Y

✅ Changes committed
🎫 Ticket #0001 moved to done
📋 Charter archived with implementation notes
```

### Final Ticket State
```yaml
# .tickets/done/0001-user-authentication.md
---
id: "0001"
title: "User Authentication"
phase: "COMPLETED"
charter:
  primary_scope: [...original...]
  files_created:
    - src/auth/AuthService.ts
    - src/auth/types.ts
    - src/auth/validators.ts (emerged during refactor)
    - src/config/jwt.ts (approved expansion)
    - tests/unit/auth/AuthService.test.ts
  decisions:
    - "Used in-memory storage to stay within scope"
    - "Added JWT config for security best practices"
    - "Enhanced password validation during refactor"
---

# Implementation Summary

Successfully implemented authentication within charter boundaries.
Key decision: Avoided database integration (out of scope) by using in-memory storage.
```

---

## 🎯 Key Features Demonstrated

### 1. **Clear Boundaries (Sandbox)**
- Primary scope clearly defined
- Secondary scope available with permission
- Out-of-scope items require explicit approval

### 2. **Interactive Dialogue**
- AI explains reasoning for changes
- Human approves scope expansions
- Continuous feedback loop

### 3. **Principles in Action**
- KISS: Started with minimal implementation
- DRY: Extracted validators during refactor
- YAGNI: Avoided database integration (not in requirements)
- Documentation: Inline during coding, high-level at end

### 4. **Flexibility within Structure**
- validators.ts emerged naturally during refactor
- jwt.ts added with permission (security need)
- Repository pattern suggested but deferred (scope limit)

This workflow provides the "rails" to guide AI while preserving creative problem-solving within defined boundaries.