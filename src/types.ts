import { NextMiddleware, NextFetchEvent, NextRequest } from "next/server";
import { Path } from "path-to-regexp";
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

export type PathMatcher = Path;

/**
 *
 * A function to extract `hostname` and `pathname` from `NextRequest`
 */
export interface RequestParser {
    (req: NextRequest): {
        hostname: string;
        pathname: string;
    };
}

export interface RequestInjector<T> {
    (request: NextRequestWithParams<T>): Promise<T> | T;
}

type MaybePromise<T> = T | Promise<T>;

export type Middleware<T> =
    | RequireExactlyOne<
        {
            handler: NextMiddlewareWithParams<T> | Middleware<T>[];
            hostname?: RegExp | ((hostname: string) => boolean);
            path?: PathMatcher;
            guard?: (params: UrlParams) => boolean;
            pre?: (request: NextRequestWithParams<T>) => MaybePromise<
                | boolean
                | {
                    redirectTo: string | URL;
                    statusCode?: number;
                }
            >;
        },
        "path" | "hostname"
    >
    | RedirectMatcher<T>
    | RewriteMatcher<T>;

interface RedirectMatcher<T> {
    path: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    redirectTo: string | ((req: NextRequestWithParams<T>) => string);
    includeOrigin?: string | boolean;
}

interface RewriteMatcher<T> {
    path: PathMatcher;
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
