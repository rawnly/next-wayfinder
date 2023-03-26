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

/**
 *
 * Supported `path-to-regexp` input types.
 */
export type PathMatcher = Path;

type MaybePromise<T> = T | Promise<T>;

export type Middleware<T> =
    | RequireExactlyOne<
        {
            /**
             *
             * The middleware to run if the requirements matches
             */
            handler: NextMiddlewareWithParams<T> | Middleware<T>[];
            /**
             *
             * A function to match the hostname of the request
             * or a regex to match the hostname
             */
            hostname?: RegExp | ((hostname: string) => boolean);

            /**
             *
             * A regex or path-regexp to match the path
             * This is the argument passed to `pathRegexp`
             */
            path?: PathMatcher;

            /**
             *
             * A function to filter the path
             * based on the params
             */
            filter?: (params: UrlParams) => boolean;

            /**
             * A function to run before the handler
             * @returns true to continue, false to stop
             * @returns `{ redirectTo: string | URL; statusCode?: number }` to redirect
             */
            pre?: (request: NextRequestWithParams<T>) => MaybePromise<
                | boolean
                | {
                    redirectTo: string | URL;
                    statusCode?: number;
                }
            >;
        },
        "hostname" | "path"
    >
    | RedirectMatcher<T>;

interface RedirectMatcher<T> {
    /**
     *
     * A regex or path-regexp to match the path
     * This is the argument passed to `pathRegexp`
     */
    path: PathMatcher;

    /**
     *
     * A function to filter the path
     * based on the params
     */
    filter?: (params: UrlParams) => boolean;

    /**
     *
     * A function that retuns the path to redirect to
     */
    redirectTo: string | ((req: NextRequestWithParams<T>) => string);

    /**
     *
     * If set to `true` add a query-param `origin` with the current path
     * If set to a string, add a query-param with as key the value of the string, as value the current path
     *
     * @default false
     *
     * @example
     * {
     *    path: "/foo/bar",
     *    redirectTo: "/baz",
     *    includeOrigin: true,
     * } // => /baz?origin=/foo/bar
     *
     * @example
     * {
     *    path: "/foo/bar",
     *    redirectTo: "/baz",
     *    includeOrigin: "redirected_from",
     * } // => /baz?redirected_from=/foo/bar
     */
    includeOrigin?: string | boolean;
}

export const Middleware = {
    is: <T>(m: any): m is Middleware<T> =>
        "handler" in m && ("hostname" in m || "path" in m),
};

export const RedirectMatcher = {
    is: <T>(middleware: Middleware<T>): middleware is RedirectMatcher<T> =>
        "redirectTo" in middleware,
};
