import { NextRequest } from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

import {
    Middleware,
    NextRequestWithParams,
    PathMatcher,
    RequestParser,
    UrlParams,
} from "./types";

export const parse: RequestParser = req => {
    const hostname = req.headers.get("host") ?? "";
    const pathname = req.nextUrl.pathname;

    return { hostname, pathname };
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
    return middlewares.find(m => {
        let matches = false;

        if (m.path || Middleware.isRewrite(m) || Middleware.isRedirect(m)) {
            matches = pathToRegexp(m.path).test(path);

            if (m.guard && m.path) {
                return matches && m.guard(getParams(m.path, path));
            }

            return matches;
        }

        // domain is always defined if path is not
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
    configurable: true,
});

export const getInjectorDescriptor = <T>(data: T): PropertyDescriptor => ({
    enumerable: true,
    writable: false,
    value: data,
    configurable: true,
});

export const inject = <T>(
    request: NextRequest,
    data?: T
): NextRequestWithParams<T> => {
    Object.defineProperty(request, "injected", getInjectorDescriptor(data));

    return request as unknown as NextRequestWithParams<T>;
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
