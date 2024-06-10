import { NextPage } from "next";
import { cn } from "~/utils";
import { panameraFont } from "~/pages/fonts";

const Home: NextPage = () => {
  return (
    <main
      className={cn(
        "w-full bg-white font-medium text-[#171E42]",
        panameraFont.className
      )}
    >


    </main>
  );
};

export default Home;
