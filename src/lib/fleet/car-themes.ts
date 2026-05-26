export type CarEventTheme = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const DEFAULT: CarEventTheme = {
  backgroundColor: "#e4eaf2",
  borderColor: "#4a6278",
  textColor: "#15202c",
};

/** FullCalendar event colors keyed by fleet display name from the DB. */
export function eventThemeForCarLabel(label: string): CarEventTheme {
  switch (label) {
    case "Red Car":
      return {
        backgroundColor: "#fecaca",
        borderColor: "#dc2626",
        textColor: "#7f1d1d",
      };
    case "Black Car":
      return {
        backgroundColor: "#262626",
        borderColor: "#0a0a0a",
        textColor: "#fafafa",
      };
    default:
      return DEFAULT;
  }
}
