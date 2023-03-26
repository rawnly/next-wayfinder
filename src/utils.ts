import { NextRequest } from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

import {
    Middleware,
    NextRequestWithParams,
    PathMatcher,
    UrlParams,
} from "./types";

export const parse = (req: NextRequest) => {
    const domain = req.headers.get("host") ?? "";
    const path = req.nextUrl.pathname;

    return { domain, path };
};

export const getParams = (matcher: PathMatcher, pathname: string): UrlParams =>
    (match(matcher)(pathname) as any).params ?? {};

interface FindOptions {
    domain: string;
    path: string;
}

// find the middleware corrisponding to the path or domain
export function findMiddleware<T>(
    middlewares: Middleware<T>[],
    { path, domain }: FindOptions
): Middleware<T> | undefined {
    return middlewares.find(m => {
        let matches = false;

        if (m.matcher || Middleware.isRewrite(m) || Middleware.isRedirect(m)) {
            matches = pathToRegexp(m.matcher).test(path);

            if (m.guard && m.matcher) {
                return matches && m.guard(getParams(m.matcher, path));
            }

            return matches;
        }

        // domain is always defined if matcher is not
        return m.domain instanceof RegExp
            ? m.domain.test(domain)
            : m.domain?.(domain);
    });
}

// make the params key readonly
export const getParamsDescriptor = (params: UrlParams): PropertyDescriptor => ({
    enumerable: true,
    writable: false,
    value: params,
});

export const getInjectorDescriptor = <T>(data: T): PropertyDescriptor => ({
    enumerable: true,
    writable: false,
    value: data,
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
