// src/types/types.ts
export type Player = {
  id: number;
  name: string;
  number: number;
  positions: string[];
  photo?: string;
  teamId?: number;
  isStarter?: boolean;        // nuevo: si es titular
  positionSlot?: string | null; // opcional: "GK","LB","CB1",...
};

export type PlayerForm = {
  id?: number;
  name: string;
  number: number;
  positions: string[];
  photo: File | null;
  photoPreview?: string | null;
  isStarter?: boolean;
  positionSlot?: string | null;
};

export type Team = {
  id: number;
  name: string;
  logo?: string;
  description?: string;
  players?: Player[];
  formation?: string; // e.g., "4-3-3"
};
