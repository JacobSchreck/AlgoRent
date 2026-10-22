export type SavedItem = {
  id: number;
  status: string;
};

const strKey = "algorentSaved";
export function getSaved(): SavedItem[] {
  try {
    const strRaw = localStorage.getItem(strKey);
    if (strRaw == null) {
      return [];
    }
    return JSON.parse(strRaw);
  } catch {
    return [];
  }
}

// write the saved list to the browser
export function setSaved(arrItems: SavedItem[]) {
  try {
    localStorage.setItem(strKey, JSON.stringify(arrItems));
  } catch {
    console.log("couldnt save to the browser");
  }
}