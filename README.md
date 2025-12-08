# DreamLeague — Sports Team Manager

**Repository:** https://github.com/gonza-feri/DreamLeague

## Overview
DreamLeague is a **React + TypeScript** web application to manage football teams and players, build matchday lineups with drag‑and‑drop, and surface related news. During development the project uses a lightweight REST backend (`json-server`). Players are persisted as an embedded array inside each team record so lineup and player data remain in sync.

## Features
- **Team management:** create, view, edit, and delete teams.  
- **Player management:** add and edit players, set positions, numbers, photos, and mark matchday starters.  
- **Lineup editor:** visual pitch with drag‑and‑drop to place players; lineup is persisted with the team.  
- **News integration:** fetch recent articles related to a team (configurable API key).  
- **CSV import:** import players from CSV files; multi‑position players supported via delimited fields.  
- **Local cache:** lineup edits are cached in `localStorage` while editing for quick recovery.  
- **Single source of truth:** players are stored inside `team.players` and updated via `PUT /teams/:id`.

## CSV import format (brief)

**Required columns**
- **name** — Player full name (string).  
- **number** — Squad number (integer).  
- **positions** — One field with one or more positions (see formats below).  
- **isStarter** — `true` / `false` (optional; marks matchday starters).

**Optional columns**
- **id** — Backend id (number) to preserve original ids; otherwise the importer generates a temporary id.  
- **photo** — URL to the player photo (optional).  
- **teamId** — Numeric team id to associate the player (optional).  
- **positionSlot** — Free text slot hint (optional).

**Positions field formats (recommended)**
- Semicolon: `GK;CB;LB`  
- Pipe: `GK|CB|LB`  
- Comma: `"GK,CB,LB"` (wrap in quotes if CSV uses comma as separator)  
- JSON array: `["GK","CB","LB"]` (accepted but requires JSON parsing)

**Parsing notes**
- The importer splits the `positions` field on common delimiters (`;`, `|`, `,`) and trims values.  
- Numeric `id` values are preserved when possible; non‑numeric or missing ids get a generated temporary id for UI use.  
- Photo URLs are copied into `photo`/`photoPreview` fields; large images are not embedded.  
- Keep header names exactly as shown (case‑insensitive) to simplify automatic mapping.

## Technical notes and recent changes
- **Players persistence:** the app updates the `players` array inside the team object and persists it with `PUT /teams/:id`. There is no separate `/players` endpoint in the current workflow.  
- **ID handling:** the UI normalizes player IDs to a stable form to avoid mismatches between numeric and string IDs. When possible numeric IDs are preserved for backend compatibility; temporary IDs are generated for new players.  
- **Drag and drop fixes:** drag operations include both `playerId` and `slotId` so swaps and moves target the correct slot and avoid duplicate assignments. The lineup builder prevents assigning the same player to multiple slots.  
- **CSV positions:** multi‑position players can be encoded in a single CSV field; recommended delimiters are `;` or `|`.

## Installation and run (development)
1. Clone the repository:
```bash
git clone https://github.com/gonza-feri/DreamLeague.git
cd DreamLeague
