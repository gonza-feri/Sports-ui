# Sports UI

A React application for managing football teams and players, with integrated news and a REST API backend simulation.

## Features

- ⚽ Manage teams: view, add, edit, delete
- 👥 Manage players: assign to teams, update positions
- 📰 Latest football news displayed per team
- 🔍 Team search functionality
- 🎨 Modern UI with responsive design
- 🔗 REST API integration using Axios

## Tech Stack

- **React + TypeScript**
- **Axios** for API communication
- **json-server** for simulating a REST API backend
- **React Router** for navigation
- **CSS Modules** for styling

## REST API Simulation

The backend is simulated using `json-server`.  
Endpoints available:

- `GET /teams` → list all teams
- `GET /teams/:id` → get a single team
- `POST /teams` → add a new team
- `PUT /teams/:id` → update a team
- `DELETE /teams/:id` → delete a team
- `GET /players` → list all players
- `POST /players` → add a new player
- `PUT /players/:id` → update a player
- `DELETE /players/:id` → delete a player

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/gonza-feri/Sports-ui.git
cd Sports-ui
