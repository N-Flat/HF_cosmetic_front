"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { Template } from "@/lib/ai/types";
import { assetPath } from "@/lib/ai/client";
export function TemplateArt({ template }: { template: Template }) {
  const [failed, setFailed] = useState(false);
  const src = template.thumbnail ? assetPath(template.thumbnail) : undefined;
  return (
    <span className={`template-art ${template.era}`} aria-hidden="true">
      <span className="building a" />
      <span className="building b" />
      <span className="building c" />
      <span className="art-sun" />
      {template.era === "future" && <span className="orbit" />}
      {src && !failed && (
        <img
          src={src}
          width={75}
          height={59}
          alt=""
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
