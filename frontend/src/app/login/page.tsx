"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    console.log(name, email, password);
  }

  const activeTab = "h-[42px] flex-1 rounded-[11px] bg-white text-sm font-bold text-[#111418] shadow hover:bg-white";
  const inactiveTab = "h-[42px] flex-1 rounded-[11px] bg-transparent text-sm font-bold text-[#5b616c] hover:bg-transparent";
  const inputStyle = "h-[50px] rounded-xl border border-[#d9dce1] bg-white px-3.5 text-[15px] md:text-[15px] focus-visible:border-[#0b7f76] focus-visible:ring-0";

  return (
    <div className={`${font.className} flex min-h-screen gap-5 bg-white p-5 text-[#111418]`}>
      <div className="relative hidden w-[560px] shrink-0 flex-col justify-between overflow-hidden rounded-[28px] bg-[url('/hero.png')] bg-cover bg-center p-9 text-white md:flex">

        <div className="absolute inset-0 bg-[#052a2a]/40"></div>
        <Link href="/" className="relative flex items-center gap-2 text-[22px] font-extrabold tracking-tight">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#5eead4] text-[#06302e]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7" />
              <path d="M6 10v10h12V10" />
            </svg>
          </span>
          AlgoRent
        </Link>
        <Card className="relative gap-0 rounded-[22px] border border-white/40 bg-white/15 p-7 text-base text-white shadow-none ring-0 backdrop-blur-xl">
          <h1 className="mb-[18px] text-[42px] font-extrabold leading-[1.05] tracking-tight">
            Find a place for the summer.
          </h1>

          <p className="mb-2.5 flex items-center gap-2.5 font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Search by city and dates
          </p>
          <p className="mb-2.5 flex items-center gap-2.5 font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Save and compare side by side
          </p>
          <p className="flex items-center gap-2.5 font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Keep every message in one place
          </p>
        </Card>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col gap-[22px]">
          <div className="flex rounded-[14px] bg-[#f1f2f4] p-1">
            <Button type="button" onClick={() => setIsSignUp(false)} className={isSignUp ? inactiveTab : activeTab}>
              Sign in
            </Button>
            <Button type="button" onClick={() => setIsSignUp(true)} className={isSignUp ? activeTab : inactiveTab}>
              Create account
            </Button>
          </div>
          <div>
            <h2 className="mb-1.5 text-[30px] font-extrabold tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-[15px] text-[#5b616c]">
              {isSignUp ? "Save listings, message hosts, and post your own place." : "Sign in to see your saved places and messages."}
            </p>
          </div>

          {isSignUp && (
            <div>
              <Label htmlFor="name" className="mb-1.5 block text-sm font-bold">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputStyle}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="mb-1.5 block text-sm font-bold">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sublease@gmail.com"
              className={inputStyle}
            />
            {isSignUp && (
              <p className="mt-1.5 text-[13px] text-[#5b616c]">Use your school email to get a verified badge faster.</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label htmlFor="password" className="text-sm font-bold">Password</Label>
              {!isSignUp && (
                <Link href="#" className="text-[13px] font-bold text-[#0b7f76]">Forgot password?</Link>
              )}
            </div>
            <div className="flex h-[50px] items-center rounded-xl border border-[#d9dce1] pl-3.5 pr-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-full flex-1 border-none bg-transparent px-0 text-[15px] md:text-[15px] focus-visible:ring-0"
              />
              <Button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="h-[38px] rounded-[9px] bg-[#f1f2f4] px-3 text-[13px] font-bold text-[#111418] hover:bg-[#e6e8eb]"
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {isSignUp && (
            <p className="text-[13px] text-[#5b616c]">We'll email you a 6 digit code to verify your account.</p>
          )}
          <Button type="submit" className="h-[54px] rounded-[14px] bg-[#0b7f76] text-base font-bold text-white hover:bg-[#096b63]">
            {isSignUp ? "Create account" : "Sign in"}
          </Button>

          <p className="text-center text-sm text-[#5b616c]">
            Just looking?{" "}
            <Link href="/search" className="font-bold text-[#111418]">Browse without an account</Link>
          </p>
        </form>
      </div>

    </div>
  );
}