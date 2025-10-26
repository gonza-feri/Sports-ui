export interface Player {
  id: number;
  teamId: number;
  name: string;
  position: string;
  number: number;
}

export interface Team {
  id: number;
  name: string;
}