# DreamLeague — Sports Team Manager

**Repository:** https://github.com/gonza-feri/DreamLeague

## Overview
DreamLeague is a **React + TypeScript** web application to manage football teams and players, build matchday lineups with drag‑and‑drop, and surface related news. During development the project uses a lightweight REST backend (`json-server`). Players are persisted as an embedded array inside each team record so lineup and player data remain in sync.

## Features
- **Team management:** create, view, edit, and delete teams.  
- **Player management:** add and edit players, set positions, numbers, photos, and mark matchday starters.  
- **Lineup editor:** visual pitch with drag‑and‑drop to place players; lineup is persisted with the team.  
- **News integration:** fetch recent articles related to a team (configurable API key).  
- **CSV import/export:** import players from CSV files and export them back; multi‑position players supported via delimited fields.  
- **Local cache:** lineup edits are cached in `localStorage` while editing for quick recovery.  
- **Single source of truth:** players are stored inside `team.players` and updated via `PUT /teams/:id`.

## CSV format (import/export)

**Columns**
- **name** — Player full name (string).  
- **number** — Squad number (integer).  
- **positions** — One field with one or more positions (comma‑separated or other delimiters).  
- **summoned** — `"si"` if the player is marked as starter, otherwise empty.  
- **photo** — URL or Data URL to the player photo (optional; if missing, an SVG avatar is generated).

**Positions field formats (supported)**
- Semicolon: `GK;CB;LB`  
- Pipe: `GK|CB|LB`  
- Comma: `GK,CB,LB`  
- JSON array: `["GK","CB","LB"]` (accepted but requires JSON parsing)

**Parsing notes**
- The importer splits the `positions` field on common delimiters (`;`, `|`, `,`) and trims values.  
- Starter flag is recognized from values like `si`, `sí`, `yes`, `true`, `1`, `x`.  
- Photo URLs are fetched and converted to Data URLs when possible; otherwise an SVG avatar is generated.  
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
