"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { strApiUrl } from "@/lib/listings";

type CurrentUser = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

export default function AuthAccountLinks() {
  const objRouter = useRouter();
  const [objUser, setObjUser] = useState<CurrentUser | null>(null);
  const [blnChecked, setBlnChecked] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const objRes = await fetch(`${strApiUrl}/api/auth/me`, { credentials: "include" });
        if (objRes.ok) {
          setObjUser(await objRes.json());
        }
      } catch (objErr) {
        console.log("couldnt check sign in", objErr);
      } finally {
        setBlnChecked(true);
      }
    }
    loadUser();
  }, []);

  async function signOut() {
    try {
      await fetch(`${strApiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch (objErr) {
      console.log("couldnt sign out", objErr);
    }
    setObjUser(null);
    objRouter.push("/");
    objRouter.refresh();
  }

  if (!blnChecked) return null;

  if (objUser == null) {
    return <Link href="/login">Sign in</Link>;
  }

  return (
    <>
      {objUser.role == "ADMIN" && <Link href="/moderation">Moderation</Link>}
      <Link href="/profile">{objUser.firstName || objUser.email}</Link>
      <Button type="button" onClick={signOut} className="h-auto cursor-pointer bg-transparent p-0 text-[14px] font-medium text-[#1c2733] hover:bg-transparent hover:underline">
        Sign out
      </Button>
    </>
  );
}
