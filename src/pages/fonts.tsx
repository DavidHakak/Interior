import localFont from "next/font/local";

export const interFont = localFont({
  src: "./InterVariable.ttf",
  display: "swap",
});

export const panameraFont = localFont({
  src: "./Panamera.ttf",
  display: "swap",
});

export default function Fonts() {
  return <>interFont panameraFont</>;
}
