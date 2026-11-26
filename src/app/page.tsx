import { FC } from "react";

import cover from "./assets/images/concrete-cover-4k-v3.png";
import Image from "next/image";
import { DownloadSamplePackButton } from "@/components/pages/Home/DownloadSamplePackButton";
import { Star } from "@/components/Misc/Star";
import { QuatreVinghtDixNeufStudLogo } from "@/components/Misc/QuatreVinghtDixNeufStudLogo";
import Link from "next/link";

const Home: FC = () => {
  return (
    <>
      <Star className="fixed top-6 left-6 size-6" />
      <Star className="fixed bottom-6 left-6 size-6" />
      <Star className="fixed top-6 right-6 size-6" />
      <main className="flex-1 flex flex-col items-center justify-center container mx-auto gap-6 px-4 text-white">
        <div className="fixed top-8 text-center font-semibold">
          <p>[private download page]</p>
          <p>*don't share it</p>
        </div>
        <div className="flex flex-col items-center">
          <Image
            className="z-10 drop-shadow-xl"
            src={cover}
            style={{ height: 280, width: "auto" }}
            alt="unpolished sample pack cover"
          />
          <h1 className="text-6xl uppercase font-herbus font-bold -mt-9 ">
            unpolished
          </h1>
          <p className="font-bold">vol.1</p>
        </div>
        <DownloadSamplePackButton className="fixed bottom-8 mx-auto lg:w-min border-0">
          download
        </DownloadSamplePackButton>
        <div className="fixed bottom-6 right-6 flex items-center">
          <p className="mr-2 font-semibold">by</p>
          <Link target="_blank" href="https://99stud.com">
            <QuatreVinghtDixNeufStudLogo className="size-6" />
          </Link>
        </div>
      </main>
    </>
  );
};

export default Home;
