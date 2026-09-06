"use client";

/* eslint-disable @next/next/no-img-element -- Company icons come from user-entered domains that cannot be declared in Next image config. */

import { useState } from "react";

import { cn } from "@/lib/utils";

const hiringPlatformDomains = [
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "successfactors.com",
  "successfactors.eu",
  "oraclecloud.com",
  "smartrecruiters.com",
  "greenhouse.io",
  "lever.co",
  "icims.com",
  "taleo.net",
  "phenompeople.com",
  "ashbyhq.com",
  "eightfold.ai",
  "jobvite.com",
  "applytojob.com",
  "bamboohr.com",
  "dayforcehcm.com",
  "csod.com",
  "avature.net",
  "brassring.com",
  "workable.com",
  "recruitee.com",
  "powerappsportals.com",
  "microsoftcrmportals.com",
  "dynamics.com",
  "dynamics365.com",
  "sharepoint.com",
  "azurewebsites.net",
] as const;

function isHiringPlatform(hostname: string) {
  return hiringPlatformDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

function companyDomainStems(company: string) {
  const words = company
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word, index, allWords) =>
        index < allWords.length - 1 ||
        !["inc", "llc", "corp", "corporation", "company", "co", "plc", "ltd"].includes(
          word,
        ),
    );

  if (!words.length) return [];

  const compact = words.join("");
  const withoutAnd = words.filter((word) => word !== "and").join("");
  const hyphenated = words.join("-");

  return [...new Set([compact, withoutAnd, hyphenated].filter(Boolean))];
}

function workdayTenant(hostname: string) {
  if (
    !hostname.endsWith(".myworkdayjobs.com") &&
    !hostname.endsWith(".myworkdaysite.com")
  ) {
    return undefined;
  }

  const tenant = hostname.split(".")[0];
  return tenant && !tenant.startsWith("wd") ? tenant : undefined;
}

function faviconCandidates(company: string, jobUrl?: string) {
  const domainCandidates: string[] = [];
  let highConfidenceDomain: string | undefined;

  try {
    if (jobUrl) {
      const url = new URL(jobUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
        const tenant = workdayTenant(hostname);

        if (tenant) {
          highConfidenceDomain = `${tenant}.com`;
          domainCandidates.push(highConfidenceDomain);
        } else if (!isHiringPlatform(hostname)) {
          highConfidenceDomain = hostname;
          domainCandidates.push(hostname);
        }
      }
    }
  } catch {
    // A malformed or incomplete job URL should still use company-name fallbacks.
  }

  for (const stem of companyDomainStems(company)) {
    domainCandidates.push(`${stem}.com`, `${stem}.org`);
  }

  const uniqueDomains = [...new Set(domainCandidates)];
  const directFavicons = uniqueDomains.map(
    (domain) => `https://${domain}/favicon.ico`,
  );

  return highConfidenceDomain
    ? [
        ...directFavicons,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(highConfidenceDomain)}&sz=128`,
      ]
    : directFavicons;
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
  const [loaded, setLoaded] = useState(false);
  const candidates = faviconCandidates(company, jobUrl);
  const faviconUrl = candidates[candidateIndex];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] text-sm font-semibold text-[#b9c8d4]",
        className,
      )}
      aria-hidden="true"
    >
      <span>{company.charAt(0).toUpperCase()}</span>
      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          className={cn(
            "absolute inset-0 size-full bg-white/[0.96] object-contain p-1.5 transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}
