// src/types/types.ts
export type Player = {
  id: number;
  name: string;
  number: number;
  positions: string[];
  photo?: string;           // data URL o URL persistente
  teamId?: number;
  isStarter?: boolean;      // si es titular
  positionSlot?: string | null;
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
  formation?: string;
};
