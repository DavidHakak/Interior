type Country = {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  numeric_code: string;
  phone_code: string;
  capital: string;
  currency: string;
  currency_name: string;
  currency_symbol: string;
  tld: string;
  native: string;
  region: string;
  region_id: string;
  subregion: string;
  subregion_id: string;
  nationality: string;
  timezones: {
    zoneName: string;
    gmtOffset: number;
    gmtOffsetName: string;
    abbreviation: string;
    tzName: string;
  }[];
  translations: {
    [key: string]: string;
  };
  latitude: string;
  longitude: string;
  emoji: string;
  emojiU: string;
};

export function getCountries() {
  const countries = require("../data/countries.json") as Country[];
  return countries;
}

type State = {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  country_name: string;
  state_code: string;
  type: string;
  latitude: string;
  longitude: string;
};

export function getStates(countryCode?: string) {
  const states = require("../data/states.json") as State[];
  if (!countryCode) return states;
  return states.filter((state) => state.country_code === countryCode);
}

export const locationData = {
  getCountries,
  getStates,
};
