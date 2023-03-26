import { NextRequest } from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

import {
    Middleware,
    NextRequestWithParams,
    PathMatcher,
    RedirectMatcher,
    UrlParams,
} from "./types";

export interface RequestParser {
    (req: NextRequest): {
        hostname: string;
        path: string;
    };
}

export const parse: RequestParser = req => {
    const hostname = req.headers.get("host") ?? "";
    const path = req.nextUrl.pathname;

    return { hostname: hostname, path };
};

export const getParams = (matcher: PathMatcher, pathname: string): UrlParams =>
    (match(matcher)(pathname) as any).params ?? {};

interface FindOptions {
    hostname: string;
    path: string;
}

// find the middleware corrisponding to the path or domain
export function findMiddleware<T>(
    middlewares: Middleware<T>[],
    { path, hostname }: FindOptions
): Middleware<T> | undefined {
    return middlewares.find((m, idx) => {
        let matches = false;

        // checks whether the matcher has a path
        if (RedirectMatcher.is(m) || m.path) {
            matches = pathToRegexp(m.path).test(path);

            if (m.filter && m.path) {
                return matches && m.filter(getParams(m.path, path));
            }

            return matches;
        }

        // domain is always defined if matcher is not
        return m.hostname instanceof RegExp
            ? m.hostname.test(hostname)
            : m.hostname?.(hostname);
    });
}

// make the params key readonly
export const getParamsDescriptor = (params: UrlParams): PropertyDescriptor => ({
    enumerable: true,
    writable: false,
    value: params,
});

export const inject =
    <T>(value: T) =>
        (req: NextRequestWithParams<any>) => {
            const descriptor: PropertyDescriptor = {
                enumerable: true,
                writable: false,
                value,
            };

            Object.assign(req, "injected", descriptor);

            return req as unknown as NextRequestWithParams<T>;
        };

// add the `params` key with url params to the request
export const addParams = <T>(
    request: NextRequest,
    matcher: PathMatcher,
    pathname: string
): NextRequestWithParams<T> => {
    Object.defineProperty(
        request,
        "params",
        getParamsDescriptor(getParams(matcher, pathname))
    );

    return request as unknown as NextRequestWithParams<T>;
};

export const replaceValues = (pathname: string, values: UrlParams): string =>
    Object.entries(values).reduce(
        (acc, [key, val]) =>
            val
                ? acc.replace(
                    `:${key}`,
                    Array.isArray(val) ? val.join("/") : val
                )
                : acc,
        pathname
    );
