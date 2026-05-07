"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (els?: HTMLElement[]) => Promise<void>;
      startup?: { promise?: Promise<unknown> };
    };
  }
}

const MATHJAX_SCRIPT_ID = "mathjax-cdn";
const MATHJAX_CONFIG_ID = "mathjax-config";

function ensureMathJaxLoaded() {
  if (typeof window === "undefined") return;
  if (!document.getElementById(MATHJAX_CONFIG_ID)) {
    const cfg = document.createElement("script");
    cfg.id = MATHJAX_CONFIG_ID;
    cfg.text = `window.MathJax = {
      tex: { inlineMath: [['\\\\(', '\\\\)']], displayMath: [['\\\\[', '\\\\]']] },
      options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] }
    };`;
    document.head.appendChild(cfg);
  }
  if (!document.getElementById(MATHJAX_SCRIPT_ID)) {
    const s = document.createElement("script");
    s.id = MATHJAX_SCRIPT_ID;
    s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    s.async = true;
    document.head.appendChild(s);
  }
}

export function HtmlContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureMathJaxLoaded();
    let cancelled = false;
    const typeset = async () => {
      const startupPromise = window.MathJax?.startup?.promise;
      if (startupPromise) await startupPromise;
      if (cancelled || !ref.current) return;
      await window.MathJax?.typesetPromise?.([ref.current]);
    };
    // Defer slightly so MathJax has a chance to attach if just loaded
    const t = window.setTimeout(typeset, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
