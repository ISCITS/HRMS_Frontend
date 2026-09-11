"use client";

import createCache, { EmotionCache, Options as OptionsOfCreateCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { ReactNode, useState } from "react";

type ThemeRegistryProps = {
  options?: Omit<OptionsOfCreateCache, "insertionPoint">;
  children: ReactNode;
};

// Registers Emotion cache and injects SSR styles for App Router hydration.
export default function ThemeRegistry({ options, children }: ThemeRegistryProps) {
  /*
  Functional responsibility:
  - Provide Emotion cache compatible with Next.js App Router SSR.
  
  Inputs:
  - optional cache options and children tree.
  
  Output:
  - Injects collected Emotion styles into SSR HTML and renders children in CacheProvider.
  
  Failure behavior:
  - If no styles were inserted in current render, returns null style tag safely.
  Tracks Emotion styles generated during server render and injects them into HTML.
  */
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "mui", prepend: true, ...options });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }

    let styles = "";
    names.forEach((name) => {
      styles += cache.inserted[name];
    });

    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache as EmotionCache}>{children}</CacheProvider>;
}
