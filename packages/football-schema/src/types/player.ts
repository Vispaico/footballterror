export type PlayerPosition =
  | 'goalkeeper'
  | 'centre_back'
  | 'left_back'
  | 'right_back'
  | 'defensive_midfielder'
  | 'central_midfielder'
  | 'left_midfielder'
  | 'right_midfielder'
  | 'attacking_midfielder'
  | 'left_winger'
  | 'right_winger'
  | 'second_striker'
  | 'centre_forward'
  | 'striker';

export interface Player {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  dateOfBirth?: Date;
  nationality?: string;
  secondaryNationality?: string;
  position?: PlayerPosition;
  subPosition?: string;
  height?: number;
  weight?: number;
  foot?: 'left' | 'right' | 'both';
  currentClubId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerAlias {
  id: string;
  playerId: string;
  alias: string;
  source: string;
}
