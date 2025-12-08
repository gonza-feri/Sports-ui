# DreamLeague — Sports Team Manager

**Repository**: https://github.com/gonza-feri/DreamLeague

## Overview
DreamLeague is a **React + TypeScript** web application to manage football teams and players, build matchday lineups with drag‑and‑drop, and surface related news. During development the project uses a lightweight REST backend (json‑server). Players are persisted as an embedded array inside each team record so lineup and player data remain in sync.

## Features
- **Team Management**: create, view, edit, and delete teams.  
- **Player Management**: add and edit players, set positions, numbers, photos, and mark matchday starters.  
- **Lineup Editor**: visual pitch with drag‑and‑drop to place players; lineup is persisted with the team.  
- **News Integration**: fetch recent articles related to a team (configurable API key).  
- **CSV Import**: import players from CSV files; multi‑position players supported via delimited fields.  
- **Local Cache**: lineup edits are cached in `localStorage` while editing for quick recovery.  
- **Single Source of Truth**: players are stored inside `team.players` and updated via `PUT /teams/:id`.

## Tech Stack
- **React** with **TypeScript**  
- **Axios** for HTTP requests  
- **React Router** for navigation  
- **json-server** for a simulated REST backend during development  
- Plain CSS for styling (project stylesheets included)

## Installation and Run
1. Clone the repository:
```bash
git clone https://github.com/gonza-feri/DreamLeague.git
cd DreamLeague
