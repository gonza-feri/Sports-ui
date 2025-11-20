export type Player = {
  id: number;
  teamId: number;
  name: string;
  number: number;
  positions: string[];
  photo: string;
};

export type Team = {
  id: number;
  name: string;
  description: string;
  logo: string;
  players: Player[];
};


export type PlayerForm = {
  name: string;
  number: number;
  positions: string[];
  photo: File | null;
};
