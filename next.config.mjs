/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    "@ant-design",
    "@rc-component",
    "antd",
    "rc-cascader",
    "rc-checkbox",
    "rc-collapse",
    "rc-dialog",
    "rc-drawer",
    "rc-dropdown",
    "rc-field-form",
    "rc-image",
    "rc-input",
    "rc-input-number",
    "rc-mentions",
    "rc-menu",
    "rc-motion",
    "rc-notification",
    "rc-pagination",
    "rc-picker",
    "rc-progress",
    "rc-rate",
    "rc-resize-observer",
    "rc-segmented",
    "rc-select",
    "rc-slider",
    "rc-steps",
    "rc-switch",
    "rc-tabs",
    "rc-textarea",
    "rc-tooltip",
    "rc-tree",
    "rc-tree-select",
    "rc-upload",
    "rc-util",
    "rc-table",
  ],
  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },

  images: {
    domains: [
      "misshowtostartablog.com",
      "www.simplilearn.com",
      "storage.cloud.google.com",
      "4.bp.blogspot.com",
      "lh3.googleusercontent.com",
      "images.pexels.com",
      "encrypted-tbn0.gstatic.com",
      "img.dealdash.com",
      "images.unsplash.com",
      "cdn.pixabay.com",
      "www.tailwind-kit.com",
      "cdn.devdojo.com",
      "m.media-amazon.com",
      "imagescdn.homes.com",
      "upload.wikimedia.org",
      "positivebloom.com",
      "www.radiojai.com",
      "www.stickdecor.co.il",
      "t4.ftcdn.net",
      "t3.ftcdn.net",
      "pic1.calcalist.co.il",
      "storage.googleapis.com",
      "b313e8803f7a4150a884-6e0b076a1e92e31c40be44f466689c50.ssl.cf5.rackcdn.com",
    ],
  },
};
export default config;
