# Global Cursor Rules

## Development Standards

You are an expert in Solidity, TypeScript, Node.js, Next.js 14 App Router, React, Vite, Viem v2, Wagmi v2, Shadcn UI, Radix UI, and Tailwind CSS.

## Key Principles

- Write concise, technical responses with accurate TypeScript examples
- Use functional, declarative programming. Avoid classes
- Prefer iteration and modularization over duplication
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError)
- Use lowercase with dashes for directories (e.g., components/auth-wizard)
- Favor named exports for components
- Use the Receive an Object, Return an Object (RORO) pattern

## SHIP Framework: Tactical Planning Methodology

**MANDATORY**: Before writing any code with AI assistance, follow the SHIP framework for system architecture and planning. This framework prevents the cycle of building → breaking → debugging by emphasizing planning and architecture over immediate coding.

### Core Philosophy

> "The skill you actually need isn't coding. It's system architecture. You're not becoming technical in the traditional sense—you're becoming an architect, a planner, and a decision maker."

**Mindset Shift**: Think of AI as your construction crew (skilled labor you don't pay for). You provide the blueprints; they execute the work. Don't just say "build me an app"—provide a battle-tested architectural plan.

### S - Systems Planning

**Before touching any AI coder**, spend 10 minutes planning your app's high-level components.

#### What to Do:
- Write down all high-level components needed
- Identify data storage requirements (where will data live?)
- Determine authentication needs (do you need user login?)
- Map out system dependencies and integrations
- Document component requirements clearly

#### Why It Matters:
- Without planning, AI creates messy projects and gets lost in its own code
- With a clear plan, AI can create clean, organized projects
- Prevents feature creep and scope confusion
- Saves hours of debugging later

#### Action Required:
Create a written breakdown of system components before any AI coding begins.

### H - Handpick Your Tools

**CRITICAL RULE**: You make tool decisions, not AI. Research options and choose based on your specific needs.

#### What to Do:
1. **Research options** for each system component
   - Use Grok, ChatGPT, or Claude for fast research
   - Compare: cost, free tier, feature completeness, trade-offs
   - Ask: "What are my options for [component]?"

2. **Evaluate trade-offs yourself**
   - Single service (e.g., Supabase) = simplicity but vendor lock-in
   - Multiple services (e.g., Clerk + Vercel + Stripe) = flexibility but complexity
   - **You decide** based on your constraints (budget, timeline, team size)

3. **Request written plan** (not code)
   - Ask AI: "Create a detailed implementation plan with multiple phases that I can copy to an AI coding tool"
   - Get phased implementation plan
   - Copy for next step

#### Magic Phrase for Research:
> "Answer without technical jargon. I'm not an engineer. Help me understand so I can make decisions."

#### Why It Matters:
- AI often recommends multiple services when one could work
- AI can't understand your specific constraints
- You avoid expensive mistakes and over-engineering
- Example: AI might recommend Clerk + Vercel Postgres + Vercel Blob when Supabase does all three

### I - Initial Test Build

Build the **ugliest possible minimal version** to prove the concept works. No pretty designs, no extra features.

#### What to Do:
- Take the written plan from Step H
- Build the **absolute minimum** to prove your system works
- Skip everything non-essential:
  - Skip login systems (unless core to concept)
  - Skip password resets
  - Skip pretty designs
  - Skip extra features
- Focus on **core functionality only**

#### Why It Matters:
- Saves hundreds of hours by catching unworkable concepts early
- Proves technical feasibility before investing in polish
- Identifies blockers before building the full app
- Example: Built iPhone app for 3 months only to discover Apple would never approve it

#### Key Principle:
> "Build the ugliest possible version in just a couple of hours just to prove that the concept actually works."

### P - Production Build

**CRITICAL RULE**: Throw away the test and rebuild from scratch. Don't try to salvage messy test code.

#### What to Do:
1. **Don't try to fix the test version**
   - Don't spend days untangling messy code
   - Don't try to polish the minimal build
   - Every fix creates two new bugs

2. **Start fresh with all your knowledge**
   - You now know exactly what works
   - You know which tools you chose and why
   - You have a proven concept

3. **Refine your plan**
   - Update your plan based on test learnings
   - Add the features you skipped in the test
   - Include proper architecture and design

4. **Build the real app**
   - Use the same AI coding tool
   - Give it your battle-tested blueprint
   - Build with confidence

#### Why It Matters:
- Test code is messy and hard to maintain
- Starting fresh is faster than fixing broken code
- You're now in the top 1% of AI builders
- You're giving AI a battle-tested blueprint, not guessing

#### Key Principle:
> "While everyone else says 'build me an app,' you are giving the AI a battle-tested blueprint."

### When to Apply SHIP

- **Before** writing any code
- **Before** choosing new tools/services
- **Before** starting new features
- **When** stuck in debugging cycles
- **When** planning architecture changes

**Reference**: See `knowledge-base/platform/ship-framework.md` for complete methodology with examples.

## JavaScript/TypeScript

- Use "function" keyword for pure functions. Omit semicolons
- Use TypeScript for all code. Prefer interfaces over types
- Avoid enums; use maps instead
- File structure: Exported component, subcomponents, helpers, static content, types
- Avoid unnecessary curly braces in conditional statements
- For single-line statements in conditionals, omit curly braces
- Use concise, one-line syntax for simple conditional statements (e.g., `if (condition) doSomething()`)
- Use strict mode in TypeScript for better type safety

## Error Handling and Validation

Prioritize error handling and edge cases:

- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions to avoid deeply nested if statements
- Place the happy path last in the function for improved readability
- Avoid unnecessary else statements; use if-return pattern instead
- Use guard clauses to handle preconditions and invalid states early
- Implement proper error logging and user-friendly error messages
- Consider using custom error types or error factories for consistent error handling
- Use Zod for runtime validation and error handling
- Model expected errors as return values: Avoid using try/catch for expected errors in Server Actions
- Use error boundaries for unexpected errors: Implement error boundaries using error.tsx and global-error.tsx files

## React/Next.js

- Use functional components and TypeScript interfaces
- Use declarative JSX
- Use function, not const, for components
- Use Shadcn UI, Radix UI, and Tailwind CSS for components and styling
- Implement responsive design with Tailwind CSS
- Use mobile-first approach for responsive design
- Place static content and interfaces at file end
- Use content variables for static content outside render functions
- Minimize 'use client', 'useEffect', and 'setState'. Favor React Server Components (RSC)
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Optimize images: WebP format, size data, lazy loading
- Use useActionState with react-hook-form for form validation
- Code in services/ dir always throw user-friendly errors that can be caught and shown to the user
- Use next-safe-action for all server actions:
  - Implement type-safe server actions with proper validation
  - Utilize the `action` function from next-safe-action for creating actions
  - Define input schemas using Zod for robust type checking and validation
  - Handle errors gracefully and return appropriate responses
  - Use `import type { ActionResponse } from '@/types/actions'`
  - Ensure all server actions return the ActionResponse type
  - Implement consistent error handling and success responses

## Web3 Integration (Viem v2, Wagmi v2)

- Use Viem v2 for low-level Ethereum interactions
- Use Wagmi v2 hooks for React integration
- Implement proper error handling for blockchain transactions
- Handle network switching and wallet connection states gracefully
- Use proper type safety with Viem's TypeScript types
- Implement transaction status tracking and user feedback

## State Management

- Use React Context and useReducer for managing global state
- Leverage React Query (tanStack Query) for data fetching and caching
- Avoid excessive API calls; implement proper caching strategies
- For complex state management, consider using Zustand or Redux Toolkit
- Handle URL search parameters using libraries like next-usequerystate

## Performance Optimization

- Minimize the use of useState and useEffect; prefer context and reducers
- Implement code splitting and lazy loading for non-critical components
- Profile and monitor performance using React DevTools
- Avoid unnecessary re-renders by memoizing components and using useMemo and useCallback hooks appropriately
- Prioritize Web Vitals (LCP, CLS, FID)
- Use React Server Components for data fetching when possible
- Implement the preload pattern to prevent waterfalls

## Component Structure

- Break down components into smaller parts with minimal props
- Suggest micro folder structure for components
- Use composition to build complex components
- Follow the order: component declaration, styled components (if any), TypeScript types
- Keep components focused on a single responsibility

## Styling

- Use Tailwind CSS for styling, following the Utility First approach
- Utilize the Class Variance Authority (CVA) for managing component variants
- Implement dark mode support using Tailwind's dark mode classes
- Ensure high accessibility (a11y) standards using ARIA roles and semantic HTML
- Use responsive design with Tailwind's breakpoint system

## Testing

- Write unit tests using Jest and React Testing Library
- Implement integration tests for critical user flows
- Use snapshot testing for components to ensure UI consistency
- Test error handling and edge cases thoroughly

## Security

- Sanitize user inputs to prevent XSS attacks
- Use secure storage for sensitive data
- Ensure secure communication with APIs using HTTPS and proper authentication
- Validate all inputs on both client and server side
- Implement proper CORS policies

## Accessibility

- Ensure interfaces are keyboard navigable
- Implement proper ARIA labels and roles for components
- Ensure color contrast ratios meet WCAG standards for readability
- Test with screen readers and keyboard navigation

## Key Conventions

1. Rely on Next.js App Router for state changes and routing
2. Prioritize Web Vitals (LCP, CLS, FID)
3. Minimize 'use client' usage:
   - Prefer server components and Next.js SSR features
   - Use 'use client' only for Web API access in small components
   - Avoid using 'use client' for data fetching or state management
4. Follow the monorepo structure if applicable:
   - Place shared code in appropriate directories
   - Keep app-specific code organized
5. Adhere to the defined database schema and use enum tables for predefined values

## Naming Conventions

- Booleans: Use auxiliary verbs such as 'does', 'has', 'is', and 'should' (e.g., isDisabled, hasError)
- Filenames: Use lowercase with dash separators (e.g., auth-wizard.tsx)
- File extensions: Use .config.ts, .test.ts, .context.tsx, .type.ts, .hook.ts as appropriate

## Documentation

- Provide clear and concise comments for complex logic
- Use JSDoc comments for functions and components to improve IDE intellisense
- Keep the README files up-to-date with setup instructions and project overview
- Document API endpoints, data schemas, and complex business logic

## File Length & Modularity

All source files must be under 300 lines of code (including comments and whitespace).

### Principles

- **Single Purpose**: Each file serves one purpose (e.g. registry mgmt, CLI parsing, tool integration)
- **Modular Exports**: Break logic into small, reusable functions or classes
- **Split on Growth**: If approaching 300 LOC, refactor into sub-modules
- **Separate Concerns**: File I/O, prompting, and validation must be in distinct modules

### Enforcement

- All `.ts`, `.tsx`, `.js`, `.jsx` files must be ≤ 300 lines
- Files exceeding this limit must be refactored into smaller modules
- Each module should have a single, clear responsibility
- Related functionality should be grouped in subdirectories

## References

- Next.js documentation for Data Fetching, Rendering, and Routing best practices
- Vercel AI SDK documentation for AI integration
- Viem v2 documentation for Ethereum interactions
- Wagmi v2 documentation for React Web3 hooks
- Shadcn UI documentation for component usage
- Radix UI documentation for accessible primitives
