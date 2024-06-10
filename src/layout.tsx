// import "@/styles/tailwind.css";
// import { Providers } from "./providers";
// import { cx } from "@/utils/all";
// import { Inter, Lora } from "next/font/google";

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--"
// });

// const lora = Lora({
//   subsets: ["latin"],
//   variable: "--font-lora"
// });

// export default function RootLayout({
//   children
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html
//       lang="en"
//       suppressHydrationWarning
//       className={cx(inter.variable, lora.variable)}>
//        <body className="antialiased text-gray-800 dark:bg-black dark:text-gray-400" >
//         <noscript
//           dangerouslySetInnerHTML={{
//             __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-xxxx" height="0" width="0" style="display: none; visibility: hidden;" />`,
//           }}
//         />
//         <Providers>{children}</Providers>
//       </body>
//     </html>
//   );
// }