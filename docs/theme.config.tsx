import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span className="font-bold">Next Wayfinder</span>,
  docsRepositoryBase: "https://github.com/rawnly/next-wayfinder",
  project: {
    link: "https://github.com/rawnly/next-wayfinder",
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
