import { NextRequest } from "next/server";
import { match, pathToRegexp } from "path-to-regexp";

import {
    Middleware,
    NextRequestWithParams,
    PathMatcher,
    RedirectMatcher,
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
export function findMiddleware(
    middlewares: Middleware[],
    { path, domain }: FindOptions
): Middleware | undefined {
    return middlewares.find(m => {
        let matches = false;

        if (m.matcher || RedirectMatcher.is(m)) {
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

// add the `params` key with url params to the request
export const addParams = (
    request: NextRequest,
    matcher: PathMatcher,
    pathname: string
): NextRequestWithParams => {
    Object.defineProperty(
        request,
        "params",
        getParamsDescriptor(getParams(matcher, pathname))
    );

    return request as unknown as NextRequestWithParams;
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
