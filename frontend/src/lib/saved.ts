export type SavedItem = {
  id: number;
  status: string;
  notes?: string[];
};

const strKey = "algorentSaved";
export function getSaved(): SavedItem[] {
  try {
    const strRaw = localStorage.getItem(strKey);
    if (strRaw == null) {
      return [];
    }
    const arrParsed = JSON.parse(strRaw);
    if (!Array.isArray(arrParsed)) {
      return [];
    }
    return arrParsed
      .filter((objItem) => Number.isInteger(objItem?.id) && typeof objItem?.status == "string")
      .map((objItem) => {
        let arrNotes: string[] = [];
        if (Array.isArray(objItem.notes)) {
          arrNotes = objItem.notes.filter((strNote: unknown) => typeof strNote == "string" && strNote.trim() != "");
        } else if (typeof objItem.note == "string" && objItem.note.trim() != "") {
          // Migrate notes saved before multiple notes were supported.
          arrNotes = [objItem.note];
        }
        return { id: objItem.id, status: objItem.status, notes: arrNotes };
      });
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
