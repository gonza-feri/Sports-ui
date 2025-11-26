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
  id?: number;
  name: string;
  number: number;
  positions: string[];
  photo: File | null;
  photoPreview?: string | null; // Data URL o URL persistente
};
