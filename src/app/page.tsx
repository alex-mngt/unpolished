import { FC } from "react";
import { BackgroundVideo } from "@/components/BackgroundVideo";
import { Button } from "@/components/UI/Button";

const Home: FC = () => {
  return (
    <main className="flex-1 flex flex-col lg:flex-row items-center container mx-auto gap-6 px-4">
      <BackgroundVideo
        className="md:w-2/3 lg:w-1/2 aspect-square"
        src="https://stream.mux.com/Oth4kOng9AWTCfongg3AoF5BL4kGMCsAMrw3kwqhKtI.m3u8"
        crossOrigin="anonymous"
      />
      <div className="flex-1 flex flex-col md:max-w-xl lg:max-w-none">
        <h1 className="text-5xl lg:text-6xl tracking-widest uppercase font-drowner mb-4">
          unpolished
        </h1>
        <p className="mb-4">
          Sed at leo id orci fringilla aliquet. Nullam sit amet condimentum
          odio, consequat sodales elit. Aliquam ut augue porta, euismod mauris
          scelerisque, consectetur ex. Maecenas ut sodales purus. Curabitur non
          auctor elit. In hac habitasse platea dictumst. Nulla hendrerit lectus
          sed fringilla consectetur. Proin maximus blandit finibus.
        </p>
        <h2 className="text-xl font-semibold mb-2">sample pack content</h2>
        <ul className="ml-1 mb-5">
          <li>2 bass</li>
          <li>3 hats</li>
          <li>5 FX</li>
        </ul>
        <Button className="lg:w-min">download</Button>
      </div>
    </main>
  );
};

export default Home;
