# SHIP Framework: Tactical Planning Methodology
## For Harper and Cody's Project Instructions

---

## Overview

The SHIP framework is a four-step methodology for building AI-powered applications without getting stuck in endless debugging cycles. It emphasizes **system architecture** over coding skills, treating AI as skilled labor that follows your blueprints rather than making decisions for you.

---

## The Problem It Solves

When building with AI coding tools (Cursor, Claude Code, etc.), the common failure pattern is:
1. Ask AI to "build me an app"
2. It works for 5 minutes
3. It breaks
4. Ask AI to fix it
5. AI says it's fixed but it's still broken
6. AI apologizes and rewrites the same broken code differently
7. Cycle repeats

**Root Cause**: You're giving the world's best carpenter (AI) no blueprints. You're asking them to build a house without architectural plans.

**Solution**: Master system architecture, not coding. Become the architect who provides battle-tested blueprints.

---

## The SHIP Framework

### S - Systems Planning

**Before you touch an AI coder**, spend 10 minutes writing down your app's high-level components and requirements.

**Questions to Answer:**
- Where will this data live?
- Do I need user login?
- What are the individual components in my app?
- What does each component require?

**Action**: Think through all system components first, then move to the next step.

**Example**: For a custom AI chatbot platform:
- User login/authentication
- Data storage (database)
- File storage
- AI chatbot brain (LLM integration)
- Payments and subscriptions

---

### H - Handpick Your Tools

**Critical Rule**: You pick the tools, not the AI.

AI will often recommend multiple services when one could handle everything. For example:
- AI might recommend: Clerk (auth) + Vercel Postgres (database) + Vercel Blob (storage)
- But Supabase could handle all three in one service

**Process:**
1. Use research tools (Grok, ChatGPT) to explore options for each system component
2. Evaluate each option:
   - How much does it cost?
   - What can I get for free?
   - Does it have all the features I actually need?
   - What are the trade-offs?
3. **You make the decision** - not the AI
4. Ask AI to create a written plan you can copy (important for next step)

**Magic Phrase**: Add this to your research prompts:
> "Answer without technical jargon. I'm not an engineer. Help me understand so I can make decisions."

**Key Insight**: AI argues for flexibility and avoiding "single service lock-in," but you need to decide:
- Simpler solution with one provider (easier to learn, one dashboard)
- More complex solution with multiple providers (more flexibility, vendor diversity)

---

### I - Initial Test Build

**Build the ugliest possible version** in just a couple of hours to prove the concept works.

**Rules:**
- No pretty designs
- No extra features
- Absolute minimum to prove your system works
- Skip non-essential features (e.g., password resets, fancy UI)

**Example**: For an AI chatbot:
- Skip the login system
- Skip password resets
- Just prove that the AI can connect to your data first
- Don't make it fancy

**Why This Works**: This step alone saves hundreds of hours by catching fundamental issues early (like building an iPhone app for 3 months only to discover Apple would never approve it).

---

### P - Production Build

**Critical Rule**: Throw away the test and rebuild from scratch.

**Common Mistake**: Trying to fix messy minimal test versions, spending days untangling code you didn't write. Every fix creates two new bugs.

**Correct Approach:**
1. You now know exactly what works from your test project
2. Start fresh with all that knowledge
3. Refine your plan
4. Build the real app

**Why This Works**: While everyone else says "build me an app," you're giving the AI a battle-tested blueprint. This puts you in the top 1% of AI builders.

---

## Complete Workflow Example

### Step 1: Systems Planning (S)
Use a prompt like this with Grok/ChatGPT:

```
I want to build [YOUR IDEA]. I plan to use Next.js and Vercel.

Break down the system components I need:
- User login/authentication
- Data storage
- File storage
- [Other components specific to your idea]

Answer without technical jargon. Keep things simple and concise. I'm not an engineer.
```

### Step 2: Handpick Your Tools (H)
For each component, research options:

```
Great. I would like to understand why you chose multiple services over [Single Service Option] and if there are any downsides of using [Single Service] for the app that we're trying to build here.

Answer without technical jargon. I'm not an engineer. Help me understand so I can make decisions.
```

Then create a plan:

```
Go with the [chosen option]. Choose the simplest options possible and create a plan that I can copy to an AI coding tool to actually start implementing it. Don't write code yourself, but instead focus on creating a detailed plan with multiple phases that I can copy and reuse.
```

### Step 3: Initial Test Build (I)
- Copy the plan to your AI coder (Cursor, Claude Code, etc.)
- Build the absolute minimum
- Prove the concept works
- Don't make it fancy

### Step 4: Production Build (P)
- Throw away the test
- Start fresh with refined plan
- Build the real app with all your learned knowledge

---

## Key Mindset Shift

**You're not becoming a coder** - you're becoming:
- An **architect** (system design)
- A **planner** (component breakdown)
- A **decision maker** (tool selection)

Think of AI as your construction crew - skilled labor you no longer have to pay for. You're becoming more technical than most people today, just not a coder in the traditional sense.

**Analogy**: Would you call a building architect non-technical just because they don't put bricks in place? They have a different job - they understand the system, the structure, how everything connects.

---

## When to Use This Framework

- **Before starting any new feature or project**
- **When planning system integrations**
- **When choosing between multiple service options**
- **When building with AI coding tools**

---

## Integration with Pulse Development

This framework should be applied to:
- New feature development
- System architecture decisions
- Tool and service selection
- Integration planning
- Before writing any code with AI assistance

---

**Source**: YouTube transcript from Rob's AI coding workshop  
**Last Updated**: January 2025  
**Version**: 1.0
