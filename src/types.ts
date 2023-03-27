import { NextMiddleware, NextFetchEvent, NextRequest } from "next/server";
import { Path } from "path-to-regexp";

export type UrlParams = Record<string, string | string[] | undefined>;
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
    | PathMiddleware<T>
    | HostnameMiddleware<T>
    | RedirectMiddleware<T>
    | RewriteMiddleware<T>;

export type HostnameCheck = string | RegExp | ((hostname: string) => boolean);

export interface HostnameMiddleware<T> {
    handler: NextMiddlewareWithParams<T> | Middleware<T>[];
    hostname: HostnameCheck | HostnameCheck[];
    guard?: (params: UrlParams) => boolean;
    pre?: (request: NextRequestWithParams<T>) => MaybePromise<
        | boolean
        | {
            redirectTo: string | URL;
            statusCode?: number;
        }
    >;
}

export interface PathMiddleware<T> {
    handler: NextMiddlewareWithParams<T> | Middleware<T>[];
    path: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    pre?: (request: NextRequestWithParams<T>) => MaybePromise<
        | boolean
        | {
            redirectTo: string | URL;
            statusCode?: number;
        }
    >;
}

export interface RedirectMiddleware<T> {
    path: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    redirectTo: string | ((req: NextRequestWithParams<T>) => string);
    includeOrigin?: string | boolean;
}

export interface RewriteMiddleware<T> {
    path: PathMatcher;
    guard?: (params: UrlParams) => boolean;
    rewriteTo: string | ((req: NextRequestWithParams<T>) => string);
}

export const Middleware = {
    isRewrite: <T>(
        middleware: Middleware<T>
    ): middleware is RewriteMiddleware<T> => "rewriteTo" in middleware,
    isRedirect: <T>(
        middleware: Middleware<T>
    ): middleware is RedirectMiddleware<T> => "redirectTo" in middleware,
    isPath: <T>(middleware: Middleware<T>): middleware is PathMiddleware<T> =>
        "path" in middleware,
    isHostname: <T>(
        middleware: Middleware<T>
    ): middleware is HostnameMiddleware<T> => "hostname" in middleware,
};
