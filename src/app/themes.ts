export const themes = [
  { id: "stickshift-light", label: "StickShift light" },
  { id: "stickshift-dark", label: "StickShift dark" },
  { id: "xbox-light", label: "Xbox light" },
  { id: "xbox-dark", label: "Xbox dark" },
  { id: "playstation-light", label: "PlayStation light" },
  { id: "playstation-dark", label: "PlayStation dark" },
  { id: "switch-light", label: "Switch light" },
  { id: "switch-dark", label: "Switch dark" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

const storageKey = "stickshift.theme.v1";
export const defaultTheme: ThemeId = "stickshift-light";

export function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved && isThemeId(saved) ? saved : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(storageKey, theme);
  } catch (error) {
    console.warn("Could not save theme", error);
  }
}
