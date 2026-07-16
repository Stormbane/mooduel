# CLAUDE.md

## Project
Mooduel — discover what you're in the mood to watch through play, not forms.
30,000+ movies scored across 18 psychological mood dimensions.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
```

## Structure

```
.ai/               — project knowledge
  todo.md          — project roadmap and tasks
  knowledge/       — reference docs (spec, architecture, glossary, conventions)
```

## Reference — read when the work needs it

These are textbooks. Look things up, don't pre-load.
- .ai/knowledge/spec.md
- .ai/knowledge/architecture.md
- .ai/knowledge/glossary.md
- .ai/knowledge/conventions.md
- .ai/knowledge/calibration-replatform-plan.md — calibration platform design
  (reviewed), foundation status, and the Phase 4 game slate

## Memory

Memory persistence goes through smriti. Use `smriti_write(content, branch)` for
session observations, decisions, and project notes.

## Voice Registers

When writing text that end users will read (UI copy, mood descriptions, movie
summaries, onboarding flows, README, landing pages), use **clean public voice**:
- No em dashes in prose (use commas, parentheses, or restructure)
- No bold-header bullet lists in flowing text
- Varied sentence rhythm, conversational where appropriate
- Specific over vague, personality over neutrality
- No AI vocabulary (delve, tapestry, leverage, foster, robust, pivotal, landscape)
- Mood descriptions especially must sound human, not algorithmic
- Run /humanizer on any substantial external-facing copy before delivering

When writing code, comments, commit messages, or talking to Suti: use natural voice.

## Rules
- Check .ai/knowledge/conventions.md before introducing new patterns
- Keep commits atomic — one logical change per commit
