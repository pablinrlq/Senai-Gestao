"use client";

import React from "react";

interface ProfilePillProps {
  name?: string | null;
  role?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function pickColor(name: string) {
  const palette = [
    "#2563EB",
    "#0EA5A4",
    "#7C3AED",
    "#F97316",
    "#059669",
    "#DB2777",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash << 5) - hash + name.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

function initialsFromName(name?: string | null) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePill({
  name,
  role,
  size = "md",
  className = "",
}: ProfilePillProps) {
  const initials = initialsFromName(name) || "AD";
  const bg = pickColor(name || "default");

  const sizeMap: Record<string, string> = {
    sm: "w-8 h-8 text-sm",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  const circleClasses = `${sizeMap[size]} flex items-center justify-center rounded-full font-medium text-white`;

  // create an inline SVG data URL for accessibility and consistent rendering
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' fill='${bg}' rx='20' ry='20'/><text x='50%' y='55%' font-family='Arial, Helvetica, sans-serif' font-size='56' fill='white' text-anchor='middle' alignment-baseline='middle'>${initials}</text></svg>`
  );
  const dataUrl = `data:image/svg+xml;utf8,${svg}`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={dataUrl} alt={name || "Avatar"} className={circleClasses} />
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-sm text-slate-800">{name}</span>
        {role && <span className="text-xs text-muted-foreground">{role}</span>}
      </div>
    </div>
  );
}
