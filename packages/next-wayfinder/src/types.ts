import {
    NextMiddleware,
    NextFetchEvent,
    NextRequest,
    NextResponse,
} from "next/server";
import { Path } from "path-to-regexp";

type MaybePromise<T> = T | Promise<T>;
export type UrlParams = Record<string, string | string[] | undefined>;
export interface NextRequestWithParams<T> extends NextRequest {
    params: UrlParams;
    ctx?: T;
}

export type BeforeAllMiddleware = (
    req: NextRequest,
    res: NextResponse
) => MaybePromise<NextResponse>;

export type NextMiddlewareWithParams<T> = (
    request: NextRequestWithParams<T>,
    response: NextResponse,
    event: NextFetchEvent
) => ReturnType<NextMiddleware>;

export type PathMatcher = Path;

export type ResponseFactory =
    | NextResponse
    | ((request: NextRequest, ev: NextFetchEvent) => NextResponse);

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
    (request: NextRequestWithParams<T>): MaybePromise<T>;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';


export type Middleware<T> =
        | PathMiddleware<T>
        | RedirectMiddleware<T>
        | RewriteMiddleware<T>
        | HostnameMiddleware<T>;

export type HostnameCheck = string | RegExp | ((hostname: string) => boolean);

export interface HostnameMiddleware<T> {
    handler: NextMiddlewareWithParams<T> | Middleware<T>[];
    hostname: HostnameCheck | HostnameCheck[];
    beforeAll?: BeforeAllMiddleware;
    pre?: (request: NextRequestWithParams<T>) => MaybePromise<
        | boolean
        | {
              redirectTo: string | URL;
              statusCode?: number;
          }
    >;
}

export interface PathMiddleware<T> {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    guard?: (params: UrlParams) => boolean;
    handler: NextMiddlewareWithParams<T> | Middleware<T>[];
    path: PathMatcher;
    pre?: (request: NextRequestWithParams<T>) => MaybePromise<
        | boolean
        | {
              redirectTo: string | URL;
              statusCode?: number;
          }
    >;
}

export interface RedirectMiddleware<T> {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    guard?: (params: UrlParams) => boolean;
    path: PathMatcher;
    redirectTo: string | ((req: NextRequestWithParams<T>) => string);
    includeOrigin?: string | boolean;
}

export interface RewriteMiddleware<T> {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    guard?: (params: UrlParams) => boolean;
    path: PathMatcher;
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
