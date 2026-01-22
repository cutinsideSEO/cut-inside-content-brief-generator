# Multi-Agent Development System

A multi-agent system for managing code changes in the Cut Inside Content Brief Generator project.

## Architecture

```
┌─────────────────────┐
│   Lead Agent        │  ← Reviews requests, plans changes, approves work
│   (Orchestrator)    │
└─────────┬───────────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
┌────────┐ ┌────────┐   ┌────────┐
│Comp Dev│ │Svc Dev │   │Scr Dev │  ← Implement changes in their domain
└────────┘ └────────┘   └────────┘
    │           │             │
    └─────┬─────┴─────────────┘
          ▼
    ┌───────────┐
    │ QA Agent  │  ← Validates, runs tests
    └───────────┘
```

## Agents

| Agent | Domain | Tools |
|-------|--------|-------|
| **Lead** | Orchestration, planning, review | Read, Glob, Grep, Task |
| **Components Dev** | Button, Header, BriefCard, Stage1-8 | Read, Edit, Write, Glob, Grep |
| **Services Dev** | geminiService, dataforseoService, markdownService | Read, Edit, Write, Glob, Grep |
| **Screens Dev** | Dashboard, InitialInput, Context screens | Read, Edit, Write, Glob, Grep |
| **QA** | Validation, testing | Read, Glob, Grep, Bash |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
export ANTHROPIC_API_KEY=your-api-key

# 3. Run in interactive mode
npm start

# Or pass a request directly
npm start "Add dark mode support to the header"
```

## Usage

### Interactive Mode

```bash
npm start
```

Then type your requests:

```
> Add a loading spinner to the Dashboard
> Fix TypeScript errors in services
> Refactor Stage1 for better readability
```

### Direct Request Mode

```bash
npm start "Your request here"
```

### Commands

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `exit` | Exit the program |
| `clear` | Clear the screen |
| `status` | Show current session info |

## Example Workflow

1. **You**: "Add dark mode toggle to the header"

2. **Lead Agent**: Analyzes request, creates plan
   - Components Dev: Add toggle to Header.tsx
   - Components Dev: Create ThemeContext
   - Services Dev: Add theme persistence

3. **Dev Agents**: Implement their assigned tasks

4. **QA Agent**: Runs build, checks types

5. **Lead Agent**: Reviews, presents summary

6. **You**: Review and approve

## Configuration

### Environment Variables

```bash
ANTHROPIC_API_KEY=your-api-key  # Required
```

### Project Structure

The system expects to be run from the `dev-agents` folder within the main project:

```
cut-inside---content-brief-generator/
├── dev-agents/          ← Run from here
│   ├── src/
│   │   ├── agents/
│   │   │   └── definitions.ts
│   │   ├── orchestrator.ts
│   │   └── index.ts
│   └── package.json
├── components/          ← Target: Components Dev
├── services/            ← Target: Services Dev
└── App.tsx              ← Target: Screens Dev
```

## Development

```bash
# Type checking
npm run typecheck

# Build
npm run build

# Watch mode
npm run dev
```
