import { NextMiddleware, NextFetchEvent, NextRequest } from "next/server";
import { RequireExactlyOne } from "type-fest";

export type UrlParams = Record<string, string | string[] | undefined>;
export type Urlparams = UrlParams;
export interface NextRequestWithParams extends NextRequest {
    params: UrlParams;
}

export type NextMiddlewareWithParams = (
    request: NextRequestWithParams,
    event: NextFetchEvent
) => ReturnType<NextMiddleware>;

export type PathMatcher = string | string[] | RegExp;

export type Middleware =
    | RequireExactlyOne<
          {
              handler: NextMiddlewareWithParams | Middleware[];
              domain?: RegExp | ((domain: string) => boolean);
              matcher?: PathMatcher;
              guard?: (params: UrlParams) => boolean;
          },
          "domain" | "matcher"
      >
    | RedirectMatcher;

interface RedirectMatcher {
    matcher: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    redirectTo: string | ((req: NextRequestWithParams) => string);
    includeOrigin?: string | boolean;
}

export const RedirectMatcher = {
    is: (middleware: Middleware): middleware is RedirectMatcher =>
        "redirectTo" in middleware,
};
