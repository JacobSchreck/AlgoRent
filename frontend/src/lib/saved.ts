import { strApiUrl } from "@/lib/listings";

export type SavedItem = {
  id: number;
  status: string;
  notes?: string[];
};

// Saved listings used to live only in the browser under this key. They now live in the
// user's account (/api/saved). Anything still in the browser is moved over once.
const strOldKey = "algorentSaved";

// Returns the signed-in user's saved listings, or null if they are not signed in.
export async function loadSaved(): Promise<SavedItem[] | null> {
  const objRes = await fetch(`${strApiUrl}/api/saved`, { credentials: "include" });
  if (objRes.status == 401) {
    return null;
  }
  if (!objRes.ok) {
    throw new Error(`Could not load saved listings (status ${objRes.status})`);
  }
  let arrItems: SavedItem[] = await objRes.json();

  const arrOld = readOldBrowserList();
  if (arrOld.length > 0) {
    for (const objOld of arrOld) {
      if (!arrItems.some((objItem) => objItem.id == objOld.id)) {
        await saveItem(objOld);
      }
    }
    clearOldBrowserList();
    const objAgain = await fetch(`${strApiUrl}/api/saved`, { credentials: "include" });
    if (objAgain.ok) {
      arrItems = await objAgain.json();
    }
  }
  return arrItems;
}

// Saves a listing, or replaces its status and notes. Empty notes are skipped by the server.
export async function saveItem(objItem: SavedItem): Promise<boolean> {
  try {
    const objRes = await fetch(`${strApiUrl}/api/saved/${objItem.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: objItem.status, notes: objItem.notes ?? [] }),
    });
    return objRes.ok;
  } catch {
    return false;
  }
}

export async function removeItem(numId: number): Promise<boolean> {
  try {
    const objRes = await fetch(`${strApiUrl}/api/saved/${numId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return objRes.ok;
  } catch {
    return false;
  }
}

// read what an older version of the site saved in this browser
function readOldBrowserList(): SavedItem[] {
  try {
    const strRaw = localStorage.getItem(strOldKey);
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
          arrNotes = [objItem.note];
        }
        return { id: objItem.id, status: objItem.status, notes: arrNotes };
      });
  } catch {
    return [];
  }
}

function clearOldBrowserList() {
  try {
    localStorage.removeItem(strOldKey);
  } catch {
    console.log("couldnt clear the old saved list");
  }
}
