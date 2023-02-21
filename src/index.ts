import { NextMiddleware, NextRequest, NextResponse } from "next/server";

import { Middleware, NextRequestWithParams, RedirectMatcher } from "./types";
import {
    parse,
    findMiddleware,
    addParams,
    getParamsDescriptor,
    replaceValues,
} from "./utils";

export type {
    Middleware,
    NextMiddlewareWithParams,
    NextRequestWithParams,
} from "./types";

interface WayfinderOptions {
    debug?: boolean;
}

export const getDomain = (request: NextRequest) => parse(request).domain;

export function handlePaths(
    middlewares: Middleware[],
    options?: WayfinderOptions
): NextMiddleware {
    return async function (req, ev) {
        const { path, domain } = parse(req);
        const middleware = findMiddleware(middlewares, { path, domain });

        if (options?.debug) {
            console.debug(`Middleware ${!middleware ? "Not " : ""}Found!`);
            if (middleware) console.debug(middleware);
        }

        if (middleware) {
            if (RedirectMatcher.is(middleware)) {
                const requestWithParams = addParams(
                    req,
                    middleware.matcher,
                    path
                );

                const pathname =
                    middleware.redirectTo instanceof Function
                        ? middleware.redirectTo(requestWithParams)
                        : replaceValues(
                              middleware.redirectTo,
                              requestWithParams.params
                          );
                const url = requestWithParams.nextUrl.clone();
                url.pathname = pathname;

                if (middleware.includeOrigin) {
                    url.searchParams.set(
                        middleware.includeOrigin === true
                            ? "origin"
                            : middleware.includeOrigin,
                        requestWithParams.nextUrl.pathname
                    );
                }

                return NextResponse.redirect(url);
            }

            // if the middleware handler is a function
            // we suppose it is a NextMiddleware or NextMiddlewareWithParams
            if (middleware.handler instanceof Function) {
                if (middleware.matcher) {
                    // if is a path middleware
                    // add params to the request
                    const requestWithParams = addParams(
                        req,
                        middleware.matcher,
                        path
                    );

                    return middleware.handler(requestWithParams, ev);
                }

                Object.defineProperty(req, "params", getParamsDescriptor({}));

                return middleware.handler(req as NextRequestWithParams, ev);
            }

            // if the handler is an array of middlewares
            // then use recursion to handle them
            return handlePaths(middleware.handler, options)(req, ev);
        }

        // if no middleware is found then continue the response pipe
        return NextResponse.next();
    };
}
