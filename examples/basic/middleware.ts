import { handlePaths } from "next-wayfinder";
import { NextResponse } from "next/server";

export default handlePaths(
  [
    {
      path: "/test/:lang/:path*",
      guard: (params) => params.lang === "en",
      handler: async (req, res, _) => {
        console.log("URL PARAMS", req.params); // <= params are injected by `handlePaths`
        console.log("cookie", res.cookies.get("beforeAll"));

        // render index page
        return NextResponse.rewrite(new URL("/", req.url), res);
      },
    },
  ],
  {
    beforeAll: (req, res) => {
      res.cookies.set("beforeAll", "true");
      return res;
    },
  }
);
