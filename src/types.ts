import { NextMiddleware, NextFetchEvent, NextRequest } from "next/server";
import { RequireExactlyOne } from "type-fest";

export type UrlParams = Record<string, string | string[] | undefined>;
export type Urlparams = UrlParams;
export interface NextRequestWithParams<T> extends NextRequest {
    params: UrlParams;
    injected?: T;
}

export type NextMiddlewareWithParams<T> = (
    request: NextRequestWithParams<T>,
    event: NextFetchEvent
) => ReturnType<NextMiddleware>;

export type PathMatcher = string | string[] | RegExp;

type MaybePromise<T> = T | Promise<T>;

export type Middleware<T> =
    | RequireExactlyOne<
          {
              handler: NextMiddlewareWithParams<T> | Middleware<T>[];
              domain?: RegExp | ((domain: string) => boolean);
              matcher?: PathMatcher;
              guard?: (params: UrlParams) => boolean;
              pre?: (request: NextRequestWithParams<T>) => MaybePromise<
                  | boolean
                  | {
                        redirectTo: string | URL;
                        statusCode?: number;
                    }
              >;
          },
          "domain" | "matcher"
      >
    | RedirectMatcher<T>
    | RewriteMatcher<T>;

interface RedirectMatcher<T> {
    matcher: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    redirectTo: string | ((req: NextRequestWithParams<T>) => string);
    includeOrigin?: string | boolean;
}

interface RewriteMatcher<T> {
    matcher: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    rewriteTo: string | ((req: NextRequestWithParams<T>) => string);
}

export const Middleware = {
    isRewrite: <T>(
        middleware: Middleware<T>
    ): middleware is RewriteMatcher<T> => "rewriteTo" in middleware,
    isRedirect: <T>(
        middleware: Middleware<T>
    ): middleware is RedirectMatcher<T> => "redirectTo" in middleware,
};
