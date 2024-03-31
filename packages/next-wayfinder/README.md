<p align="center">
  <br/>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/next-wayfinder">
    <img alt="" src="https://badgen.net/npm/v/next-wayfinder">
  </a>
  <a aria-label="Package size" href="https://bundlephobia.com/result?p=next-wayfinder">
    <img alt="" src="https://badgen.net/bundlephobia/minzip/next-wayfinder">
  </a>
  <a aria-label="License" href="https://github.com/rawnly/next-wayfinder/blob/main/LICENSE">
    <img alt="" src="https://badgen.net/npm/license/next-wayfinder">
  </a>
</p>

# Introduction

`next-wayfinder` is a lightweight (_~3kb minzipped_) and flexible package that simplifies the organization of middleware in Next.js applications.
With `next-wayfinder`, you can easily apply different middlewares based on the route or hostname, without having to use cumbersome and error-prone path checks.

Traditionally, managing middleware in Next.js can be challenging, especially when dealing with complex routing scenarios.
For example, you may want to apply an authentication middleware only for certain paths or a subdomain-specific middleware for certain hostnames.
With `next-wayfinder`, you can easily manage and maintain your middleware and keep your code clean and organized.
`next-wayfinder` exports an `handlePaths` function that can be used as middleware entry point.
It accepts an array of `Middleware` objects that match the route or hostname, and applies the first matching middleware.
This allows you to easily handle complex routing scenarios and reduce the amount of code needed to manage your middleware.

## Installation

```sh
  npm install next-wayfinder
```

## Why

`next-wayfinder` was created based on [this discussion][discussion-link] that highlighted the difficulty of handling complex routing inside the Next.js middleware.
Traditionally, if you want to apply different middlewares for different routes in Next.js, you have to use cumbersome and error-prone path checks.
For instance, you might want to have an authentication middleware only for paths matching `/dashboard/:path*` and a subdomain-specific middleware on another set of routes.
As of now, this can be achieved through ugly path checking inside a middleware that matches almost all the routes.

With `next-wayfinder`, you can declare sub-middlewares via `path-regexp` and custom rules in order to achieve a nice, clear middleware file where you can come back after months and instantly understand what's happening.
This makes it easy to handle complex routing scenarios and keep your code organized.
In summary, `next-wayfinder` simplifies middleware management in Next.js applications and reduces the amount of code needed to manage your middleware, making it easier to write and maintain clean, organized code.

## Quick Start

`next-wayfinder` exports an `handlePaths` function that can be used as middleware entry point.
It accepts an array of [`Middleware`](./src/types.ts) objects that match route or hostname, and applies the first matching middleware.

```ts
// middleware.ts

import { handlePaths } from "next-wayfinder";
import { NextResponse } from "next/server";

// the first matching middleware will be applied
export default handlePaths(
    [
        {
            path: "/dashboard/:lang/:path*",
            // We can filter this to apply only if some params matches exactly our needs
            guard: params => params.lang === "en",
            handler: async req => {
                // url params are injected by `handlePaths`
                // in addition to req.query
                // this is done because you might want to handle paths
                // that are not available under your `app` or `pages` directory.
                console.log(req.params);

                // do some checks
                if (!isAuthenticated(req)) {
                    return NextResponse.redirect("/");
                }

                // continue the request
                return NextResponse.next();
            },
        },
        {
            hostname: /^app\./,
            // rewrites all routes on hostname app.* to the `pages/app/<path>`
            handler: req =>
                NextResponse.rewrite(
                    new URL("/app${req.nextUrl.pathname}", req.url)
                ),
        },
        {
            // easy syntax for redirects
            path: "/blog/:slug/edit",
            // params will be replaced automatically
            redirectTo: "/dashboard/posts/:slug",
        },
    ],
    {
        // inject custom data, like session etc
        // it will be available inside `req.ctx`
        context: async req => ({ isLoggedIn: !!req.session }),
        debug: process.env.NODE_ENV !== "production",
    }
);
```

### What if I want to check paths on subdomain?

In some cases, you might want to check paths on a subdomain (i.e., using the same project for handling both the public website and the dashboard).
This can be easily achieved by passing an array of middleware as a handler. The `handlePaths` function iterates recursively over all the items provided (including nested ones), so a very high level of complexity can be "handled". However, to improve performance, I would recommend keeping it as simple as possible.

```ts
// middleware.ts

export default handlePaths([
    {
        hostname: /^app\./,
        handler: [
            {
                path: "/",
                handler: req =>
                    NextResponse.redirect(new URL("/dashboard", req.url)),
            },
            {
                path: "/:path*",
                handler: () => NextResponse.next(),
            },
        ],
    },
]);
```

### Example - Supabase Authentication

```ts
// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { handlePaths, NextREquestWithParams } from "next-wayfinder";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";

const getSession = async (req: NextRequestWithParams) => {
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient({ req, res });

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        console.error(`Auth Error: `, error);
        return null;
    }

    return session;
};

export default handlePaths(
    [
        {
            // auth guard
            path: "/dashboard/:path*",
            pre: req =>
                req.ctx?.session ? true : { redirectTo: "/auth/sign-in" },
            handler: (req, res) => {
                console.log("User authenticated: ", req.ctx?.session);

                // do your stuff here
                return res;
            },
        },
    ],
    {
        // this injects `session` property into the request object
        context: async req => {
            const session = await getSession(req);

            return { session };
        },
    }
);
```

### Example - Filter by request method
This examples shows you how you can filter by request method 

```ts
// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { handlePaths, NextREquestWithParams } from "next-wayfinder";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";

const getSession = async (req: NextRequestWithParams) => {
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient({ req, res });

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        console.error(`Auth Error: `, error);
        return null;
    }

    return session;
};

export default handlePaths(
    [
        {
            // do not check auth on GET requests
            path: "/events/:id",
            method: "GET",
            handler: (_, res) => res,
        },
        {
            // auth guard on PATCH
            path: "/events/:id",
            method: "PATCH",
            pre: req => req.ctx?.session ? true : { redirectTo: "/auth/sign-in" },
            handler: (req, res) => {
                console.log("User authenticated: ", req.ctx?.session);
                // do your stuff here
                return res;
            },
        },
    ],
    {
        // this injects `session` property into the request object
        context: async req => {
            const session = await getSession(req);

            return { session };
        },
    }
);
```

### Options

You can pass several options to configure your middleware

```ts
interface WayfinderOptions<T> {
  debug?: boolean;

  /**
   *
   * A function that returns the data to be injected into the request
   */
  context?: <T>((request: NextRequest) => T) | T;

  /**
   * Global middleware to be executed before all other middlewares
   * Useful if you want to set a cookie or apply some logic before each request
   * It receives the `options.response` (or `NextResponse.next()` if not provided) and `NextRequest` as params
   */
  beforeAll?: (request: NextRequest, response: NextResponse) => Promise<NextResponse> | NextResponse;

  /**
   *
   * A function to extract `hostname` and `pathname` from `NextRequest`
   */
  parser?: RequestParser;

  /**
   * The response to be used.
   * Useful when you want to chain other middlewares or return a custom response
   * Default to `NextResponse.next()`
   */
  response?: NextResponse | ((request: NextRequest) => NextResponse);
}
```

## Authors

This library is created by [Federico Vitale](https://untitled.dev) - ([@rawnly](https://github.com/rawnly))

## License

The MIT License.

[discussion-link]: https://github.com/vercel/next.js/discussions/43816#discussioncomment-4348363
