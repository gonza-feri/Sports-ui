// src/types/types.ts
export type Player = {
  photoPreview: string;
  id: number;
  name: string;
  number: number;
  positions: string[];
  photo?: string;
  teamId?: number;
  isStarter?: boolean;
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
  photo: unknown;
  id: number;
  name: string;
  logo?: string | null;
  description?: string;
  players?: Player[];
  formation?: string;
};
