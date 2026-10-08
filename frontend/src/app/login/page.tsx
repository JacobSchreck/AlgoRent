"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const objFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const strApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// same gradient as the home page
const strPageCss = `
  .bg-drift {
    background: linear-gradient(125deg, #b9cbe0 0%, #9fb6d1 25%, #c3c9e3 50%, #a8c0d6 75%, #b9cbe0 100%);
    background-size: 300% 300%;
    animation: drift 22s ease-in-out infinite;
  }
  @keyframes drift {
    0% { background-position: 0% 30%; }
    50% { background-position: 100% 70%; }
    100% { background-position: 0% 30%; }
  }
  .fade-in { animation: rise 1s ease-out both; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function LoginPage() {
  const objRouter = useRouter();

  const [blnSignUp, setBlnSignUp] = useState(false);
  const [blnShowPass, setBlnShowPass] = useState(false);

  const [strName, setStrName] = useState("");
  const [strEmail, setStrEmail] = useState("");
  const [strPass, setStrPass] = useState("");

  const [strMsg, setStrMsg] = useState("");
  const [blnErr, setBlnErr] = useState(false);
  const [blnLoading, setBlnLoading] = useState(false);

  function changeMode() {
    setBlnSignUp(!blnSignUp);
    setStrMsg("");
    setBlnErr(false);
  }

  async function handleSubmit(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setStrMsg("");
    setBlnErr(false);
    setBlnLoading(true);

    try {
      let strEndpoint = "login";
      let objBody: object = { email: strEmail, password: strPass };

      if (blnSignUp == true) {
        strEndpoint = "signup";
        objBody = { fullName: strName, email: strEmail, password: strPass };
      }

      const objRes = await fetch(`${strApiUrl}/api/auth/${strEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(objBody),
      });

      const objData = await objRes.json();

      if (objRes.ok == false) {
        setBlnErr(true);
        setStrMsg(objData.message);
        return;
      }

      if (blnSignUp == true) {
        setBlnSignUp(false);
        setStrName("");
        setStrPass("");
        setStrMsg("Account created. Sign in to continue.");
        return;
      }

      objRouter.push("/");
      objRouter.refresh();

    } catch (objErr) {
      console.log("couldnt reach backend", objErr);
      setBlnErr(true);
      setStrMsg("Unable to connect to the server.");
    } finally {
      setBlnLoading(false);
    }
  }

  const strInStyle = "h-[46px] rounded-[10px] border border-[#d1d5db] bg-white px-3.5 text-[15px] md:text-[15px] focus-visible:border-[#3f5b6e] focus-visible:ring-0";
  const strLblStyle = "text-sm font-semibold";

  let strHeading = "Sign in";
  let strSwitchText = "Don't have an account?";
  let strSwitchLink = "Create one";
  if (blnSignUp == true) {
    strHeading = "Create an account";
    strSwitchText = "Already have an account?";
    strSwitchLink = "Sign in";
  }

  let strBtnText = strHeading == "Sign in" ? "Sign in" : "Create account";
  if (blnLoading == true) {
    strBtnText = "Please wait...";
  }

  return (
    <div className={`${objFont.className} bg-drift flex min-h-screen flex-col text-[#1c2733]`}>
      <style>{strPageCss}</style>

      <nav className="flex h-16 items-center border-b border-white/50 bg-white/40 px-8 backdrop-blur-lg">
        <Link href="/" className="text-[18px] font-extrabold tracking-tight">AlgoRent</Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="fade-in w-full max-w-[400px] gap-0 rounded-[18px] border border-white/80 bg-white/80 p-9 text-base text-[#1c2733] shadow-[0_10px_30px_rgba(63,91,110,0.15)] ring-0 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">

            <h1 className="text-[26px] font-extrabold">{strHeading}</h1>

            {blnSignUp == true && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className={strLblStyle}>Full name</Label>
                <Input id="name" value={strName} onChange={(evt) => setStrName(evt.target.value)} className={strInStyle} required />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={strLblStyle}>Email</Label>
              <Input id="email" type="email" value={strEmail} onChange={(evt) => setStrEmail(evt.target.value)} placeholder="you@ufl.edu" className={strInStyle} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className={strLblStyle}>Password</Label>
              <div className="flex h-[46px] items-center rounded-[10px] border border-[#d1d5db] bg-white pl-3.5 pr-1.5">
                <Input id="password" type={blnShowPass == true ? "text" : "password"} value={strPass} onChange={(evt) => setStrPass(evt.target.value)} className="h-full flex-1 border-none bg-transparent px-0 text-[15px] md:text-[15px] focus-visible:ring-0" required />
                <Button type="button" onClick={() => setBlnShowPass(!blnShowPass)} className="h-[34px] rounded-lg bg-[#eef1f4] px-3 text-[13px] font-bold text-[#1c2733] hover:bg-[#e2e7ec]">
                  {blnShowPass == true ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            {strMsg != "" && (
              <p className={blnErr == true ? "text-sm text-red-600" : "text-sm text-[#3f5b6e]"}>{strMsg}</p>
            )}

            <Button type="submit" disabled={blnLoading} className="h-12 rounded-[10px] bg-[#3f5b6e] text-[15px] font-bold text-white hover:bg-[#34495a]">
              {strBtnText}
            </Button>

            <p className="text-center text-sm text-[#4a5866]">
              {strSwitchText}{" "}
              <Button type="button" onClick={changeMode} className="h-auto bg-transparent p-0 text-sm font-bold text-[#3f5b6e] hover:bg-transparent">
                {strSwitchLink}
              </Button>
            </p>

            <p className="text-center text-sm text-[#4a5866]">
              Just looking? <Link href="/search" className="font-bold text-[#1c2733]">Browse without an account</Link>
            </p>

          </form>
        </Card>
      </div>
    </div>
  );
}