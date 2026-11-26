import { FC } from "react";

import cover from "./assets/images/concrete-cover-4k-v3.png";
import type { Metadata } from "next";
import Image from "next/image";
import { DownloadSamplePackButton } from "@/components/pages/Home/DownloadSamplePackButton";
import { Star } from "@/components/Misc/Star";
import { QuatreVinghtDixNeufStudLogo } from "@/components/Misc/QuatreVinghtDixNeufStudLogo";
import { readSiteConfig } from "@/lib/site/config";
import { OPEN_GRAPH } from "@/lib/site/metadata";
import Link from "next/link";

/** Served from `public/`. */
const SAMPLE_PACK_HREF = "/UNPOLISHED_vol.1_(V1).zip";

const { indexable } = readSiteConfig();

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH, url: "/" },
};

const Home: FC = () => {
  return (
    <>
      <Star className="fixed top-6 left-6 size-6 text-white" />
      <Star className="fixed bottom-6 left-6 size-6 text-white" />
      <Star className="fixed top-6 right-6 size-6 text-white" />
      <main className="flex-1 flex flex-col items-center justify-center container mx-auto gap-6 px-4 text-white">
        {!indexable && (
          <div className="fixed top-8 text-center font-semibold">
            <p>[private download page]</p>
            <p>*don't share it</p>
          </div>
        )}
        <div className="flex flex-col items-center">
          <Image
            preload
            className="z-10 h-60 lg:h-70 w-auto drop-shadow-xl"
            src={cover}
            // Rendered widths of the `h-60` / `lg:h-70` cover. Without this the
            // full 2508px source is served to every device.
            sizes="(min-width: 64rem) 262px, 224px"
            alt="unpolished sample pack cover"
          />
          <h1 className="text-5xl lg:text-6xl uppercase font-herbus font-bold -mt-6 lg:-mt-9 transition-[filter,opacity] duration-1000 ease-out starting:blur-sm starting:opacity-0 motion-reduce:transition-none">
            unpolished
          </h1>
          <p className="font-bold transition-[opacity,translate] duration-700 delay-300 ease-out starting:opacity-0 starting:-translate-y-1 motion-reduce:transition-none">
            vol.1
          </p>
        </div>
        <DownloadSamplePackButton
          href={SAMPLE_PACK_HREF}
          className="fixed bottom-24 lg:bottom-8 mx-auto border-0"
        >
          download
        </DownloadSamplePackButton>
      </main>
      <footer className="fixed bottom-6 right-6 text-white">
        <p className="flex items-center gap-1.5 font-semibold text-xs">
          by
          <Link
            // The padding and negative margin widen the hit area without
            // moving the logo.
            className="-m-2 p-2"
            href="https://99stud.com"
            target="_blank"
            // While the page is private, `noreferrer` keeps its URL out of the
            // destination's referrer logs.
            rel={indexable ? "noopener" : "noopener noreferrer"}
            aria-label="99stud website (opens in a new tab)"
          >
            <QuatreVinghtDixNeufStudLogo className="size-6" />
          </Link>
        </p>
      </footer>
    </>
  );
};

export default Home;
