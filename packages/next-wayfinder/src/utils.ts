import { NextRequest } from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

import {
    HostnameCheck,
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

/**
 *
 * checks if the given hostnamecheck matches the given hostname
 */
const checkHostName = (a: HostnameCheck, b: string): boolean => {
    if (typeof a === "string") {
        return a === b;
    }

    if (a instanceof RegExp) {
        return a.test(b);
    }

    if (a instanceof Function) {
        return a(b);
    }

    return false;
};

// find the middleware corrisponding to the path or domain
export function findMiddleware<T>(
    middlewares: Middleware<T>[],
    { path, hostname }: FindOptions
): Middleware<T> | undefined {
    return middlewares.find(m => {
        let matches = false;

        if (Middleware.isHostname(m)) {
            if (Array.isArray(m.hostname)) {
                return m.hostname.some(check => checkHostName(check, hostname));
            }

            return checkHostName(m.hostname, hostname);
        }

        matches = pathToRegexp(m.path).test(path);

        if (m.guard && m.path) {
            return matches && m.guard(getParams(m.path, path));
        }

        return matches;
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
