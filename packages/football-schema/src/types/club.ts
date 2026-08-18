export interface Club {
  id: string;
  name: string;
  shortName?: string;
  country: string;
  countryId: string;
  city?: string;
  founded?: number;
  venue?: string;
  crestUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubAlias {
  id: string;
  clubId: string;
  alias: string;
  source: string;
}
