"use client";

/* eslint-disable @next/next/no-img-element -- Company icons come from user-entered domains that cannot be declared in Next image config. */

import { useState } from "react";

import { cn } from "@/lib/utils";

function faviconCandidates(jobUrl?: string) {
  if (!jobUrl) return [];

  try {
    const url = new URL(jobUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return [];

    return [
      `${url.origin}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`,
    ];
  } catch {
    return [];
  }
}

export function CompanyAvatar({
  company,
  jobUrl,
  className,
}: {
  company: string;
  jobUrl?: string;
  className?: string;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = faviconCandidates(jobUrl);
  const faviconUrl = candidates[candidateIndex];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-semibold text-[#b9c8d4]",
        className,
      )}
      aria-hidden="true"
    >
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="size-full bg-white/[0.96] object-contain p-1.5"
          onError={() => setCandidateIndex((current) => current + 1)}
        />
      ) : (
        company.charAt(0).toUpperCase()
      )}
    </div>
  );
}
