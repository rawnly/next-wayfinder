import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span className="font-bold">Next Wayfinder</span>,
  docsRepositoryBase: "https://github.com/rawnly/next-wayfinder",
  search: {
    placeholder: "Search docs...",
  },
  toc: {
    backToTop: true,
  },
  project: {
    link: "https://github.com/rawnly/next-wayfinder",
  },
  useNextSeoProps() {
    return {
      title: "Next Wayfinder",
      description: "Lightweight and flexible middleware manager for Next.js",
      titleTemplate: "%s - Next Wayfinder",
      themeColor: "#000",
    };
  },
  footer: {
    text: (
      <span>
        Brought to you by{" "}
        <a
          className="text-blue-500 hover:underline"
          href="https://github.com/rawnly"
        >
          @rawnly
        </a>
      </span>
    ),
  },
};

export default config;
