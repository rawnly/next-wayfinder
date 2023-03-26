import { NextMiddleware, NextRequest, NextResponse } from "next/server";
import { match, P } from "ts-pattern";

import { Middleware, NextRequestWithParams, RedirectMatcher } from "./types";
import {
    parse as defaultParser,
    findMiddleware,
    addParams,
    getParamsDescriptor,
    replaceValues,
    inject,
} from "./utils";
import { type RequestParser } from "./utils";

export type {
    Middleware,
    NextMiddlewareWithParams,
    NextRequestWithParams,
} from "./types";

interface WayfinderOptions<T> {
    debug?: boolean;
    injector?: (request: NextRequestWithParams<unknown>) => Promise<T> | T;
    parser?: RequestParser;
}

export const getHost = (request: NextRequest) =>
    defaultParser(request).hostname;

export function handlePaths<T>(
    middlewares: Middleware<T>[],
    options?: WayfinderOptions<T>
): NextMiddleware {
    return async function(req, ev) {
        const parseRequest = options?.parser ?? defaultParser;

        // extract the hostname and path from the request
        const { path, hostname } = parseRequest(req);

        // find the middleware corrisponding to the path or domain
        const middleware = findMiddleware(middlewares, {
            path,
            hostname,
        });

        if (options?.debug) {
            console.debug(`Middleware ${!middleware ? "Not " : ""}Found!`);
            if (middleware) console.debug(middleware);
        }

        // if no middleware is found then continue the response pipe
        if (!middleware) {
            return NextResponse.next();
        }

        if (RedirectMatcher.is(middleware)) {
            const requestWithParams = addParams<T>(req, middleware.path, path);

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
            if (middleware.path) {
                // if is a path middleware
                // add params to the request
                const requestWithParams = addParams<T>(
                    req,
                    middleware.path,
                    path
                );

                if (middleware.pre) {
                    const result = await middleware.pre(requestWithParams);

                    if (result !== true) {
                        if (!result) return NextResponse.next();

                        if (typeof result.redirectTo === "string") {
                            const url = requestWithParams.nextUrl.clone();
                            url.pathname = result.redirectTo;

                            return NextResponse.redirect(url, {
                                status: result.statusCode,
                            });
                        }

                        return NextResponse.redirect(
                            new URL(
                                result.redirectTo,
                                requestWithParams.nextUrl
                            ),
                            {
                                status: result.statusCode,
                            }
                        );
                    }
                }

                return middleware.handler(requestWithParams, ev);
            }

            // on domain we can't add any param
            Object.defineProperty(req, "params", getParamsDescriptor({}));

            if (options?.injector) {
                const data = await options.injector(
                    req as unknown as NextRequestWithParams<unknown>
                );

                inject<T>(data)(req as NextRequestWithParams<unknown>);
            }

            return middleware.handler(req as NextRequestWithParams<T>, ev);
        }

        // if the handler is an array of middlewares
        // then use recursion to handle them
        return handlePaths(middleware.handler, options)(req, ev);
    };
}
