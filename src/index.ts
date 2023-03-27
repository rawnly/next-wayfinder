import { NextMiddleware, NextRequest, NextResponse } from "next/server";
import { match } from "ts-pattern";

import {
    Middleware,
    NextRequestWithParams,
    RequestInjector,
    RequestParser,
} from "./types";
import {
    parse as defaultParse,
    findMiddleware,
    addParams,
    getParamsDescriptor,
    replaceValues,
    inject,
} from "./utils";

export type {
    Middleware,
    NextMiddlewareWithParams,
    NextRequestWithParams,
} from "./types";

interface WayfinderOptions<T> {
    debug?: boolean;

    /**
     *
     * A function that returns the data to be injected into the request
     */
    injector?: RequestInjector<T>;

    /**
     *
     * A function to extract `hostname` and `pathname` from `NextRequest`
     */
    parser?: RequestParser;
}

export const getHost = (request: NextRequest) => defaultParse(request).hostname;

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
        const { pathname: path, hostname } = (options?.parser ?? defaultParse)(
            req
        );

        const middleware = findMiddleware(middlewares, {
            path: path,
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

        // inject data asap
        if (options?.injector) {
            const data = await options.injector(
                req as unknown as NextRequestWithParams<T>
            );

            if (options.debug) {
                console.debug(`[Injector] >> Injecting: `, data);
            }

            // inject data as req.params
            inject(req, data);

            if (options.debug) {
                console.debug(
                    `[Injector] >> Injected: `,
                    (req as NextRequestWithParams<T>).injected
                );
            }
        }

        if (
            Middleware.isRewrite(middleware) ||
            Middleware.isRedirect(middleware)
        ) {
            const requestWithParams = addParams<T>(req, middleware.path, path);

            const url = requestWithParams.nextUrl.clone();
            url.pathname = match(middleware)
                .when(Middleware.isRedirect, middleware =>
                    middleware.redirectTo instanceof Function
                        ? middleware.redirectTo(requestWithParams)
                        : replaceValues(
                            middleware.redirectTo,
                            requestWithParams.params
                        )
                )
                .when(Middleware.isRewrite, middleware =>
                    middleware.rewriteTo instanceof Function
                        ? middleware.rewriteTo(requestWithParams)
                        : replaceValues(
                            middleware.rewriteTo,
                            requestWithParams.params
                        )
                )
                .otherwise(() => "");

            if (Middleware.isRewrite(middleware)) {
                return NextResponse.rewrite(url);
            }

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

        // use recursion to handle nested middlewares
        if (Array.isArray(middleware.handler)) {
            return handlePaths(middleware.handler, options)(req, ev);
        }

        if (Middleware.isHostname(middleware)) {
            // on hostname middleware we can't add any param
            Object.defineProperty(req, "params", getParamsDescriptor({}));

            return middleware.handler(req as NextRequestWithParams<T>, ev);
        }

        // if is a path-middleware
        // add extracted params to the request
        const requestWithParams = addParams<T>(req, middleware.path, path);

        // execute pre-checks
        if (middleware.pre) {
            const result = await middleware.pre(requestWithParams);

            if (result !== true) {
                // skip middleware
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
    };
}
