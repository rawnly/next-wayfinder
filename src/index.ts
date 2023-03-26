import { NextMiddleware, NextRequest, NextResponse } from "next/server";

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

/**
 *
 * A function that filters the requests based on the path or hostname
 * and then executes the corresponding middleware or middlewares
 *
 * @param middlewares {Middleware} - An array of middlewares
 * @param options {WayfinderOptions} - An object containing the options
 *
 * @returns {NextMiddleware} - A NextMiddleware function
 *
 * @example
 * ```ts
 * import { handlePaths } from "next-wayfinder";
 *
 * export default handlePaths([
 *  {
 *      path: "/dashboard/:path",
 *      handler: async (req, ev) => {
 *           const isAuthorized = await checkAuthorization(req);
 *
 *           if (!isAuthorized) {
 *              return NextResponse.redirect("/login");
 *           }
 *
 *          return NextResponse.next();
 *      },
 *  }
 *]);
 * ```
 *
 */
export function handlePaths<T>(
    middlewares: Middleware<T>[],
    options?: WayfinderOptions<T>
): NextMiddleware {
    return async function(req, ev) {
        const parseRequest = options?.parser ?? defaultParser;

        // extract the hostname and path from the request
        const { path, hostname } = parseRequest(req);

        // find the middleware corrisponding to the path or hostname
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
            if (!middleware.path) {
                // on hostname matcher we can't add any param
                Object.defineProperty(req, "params", getParamsDescriptor({}));

                if (options?.injector) {
                    const data = await options.injector(
                        req as unknown as NextRequestWithParams<unknown>
                    );

                    inject<T>(data)(req as NextRequestWithParams<unknown>);
                }

                return middleware.handler(req as NextRequestWithParams<T>, ev);
            }

            // if is a path middleware
            // add params to the request
            const requestWithParams = addParams<T>(req, middleware.path, path);

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
                        new URL(result.redirectTo, requestWithParams.nextUrl),
                        {
                            status: result.statusCode,
                        }
                    );
                }
            }

            return middleware.handler(requestWithParams, ev);
        }

        // if the handler is an array of middlewares
        // then use recursion to handle them
        return handlePaths(middleware.handler, options)(req, ev);
    };
}
