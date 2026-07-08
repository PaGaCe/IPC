import * as Flags from "country-flag-icons/react/3x2";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

const FOOTBALL_COUNTRY_MAP = {
  england: "GB",
  uk: "GB",
  "united kingdom": "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  usa: "US",
  "united states": "US",
  "ivory coast": "CI",
  "south korea": "KR",
  "north korea": "KP",
  russia: "RU",
  iran: "IR",
  eng: "GB",
  esp: "ES",
  fra: "FR",
  ger: "DE",
  ita: "IT",
  bra: "BR",
  arg: "AR",
};

const getCountryCode = (input) => {
  if (!input) return null;
  const normalized = input.toString().trim().toLowerCase();
  if (FOOTBALL_COUNTRY_MAP[normalized]) {
    return FOOTBALL_COUNTRY_MAP[normalized];
  }
  const iso = countries.getAlpha2Code(input.trim(), "en");
  return iso || null;
};

export const CountryFlag = ({ country, width = 16, height = 12 }) => {
  const code = getCountryCode(country);
  if (!code) return <span>🌍</span>;
  const Key = code.toUpperCase();
  const Component = Flags[Key];
  if (!Component) return <span>🌍</span>;
  return (
    <Component
      title={country}
      style={{ width, height }}
    />
  );
};
