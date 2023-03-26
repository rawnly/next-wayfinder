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

`next-wayfinder` is a lightweight (_~3kb minzipped_) and flexible package that makes it easy to apply different Next.js
middlewares based on the route, without having to use cumbersome and error-prone path checks.
This allows you to easily manage and maintain your middlewares, and keep your app clean and organized.

## Installation

```sh
  npm install next-wayfinder
```

## Why

This package was created based on [this discussion][discussion-link].
In the discussion, a user highlighted the difficulty of handling complex routing inside the
Next.js middleware. For instance, you might want to have a `withAuth` middleware only for paths matching `/dashboard/:path*` and an `i18n` middleware on a subdomain.
As of now, this can be achieved through ugly path checking inside a middleware that matches almost all the routes.
With `next-wayfinder` I aim to add some ease until Next officially supports multiple middleware for different matchers.

## Quick Start

`next-wayfinder` exports an `handlePaths` function that can be used as middleware entry point.
It accepts an array of [`Middleware`](./src/types.ts) matching the route or the hostname.

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
        debug: process.env.NODE_ENV !== "production",
        // inject custom data, like session etc
        // it will be available inside `req.injected`
        injector: async request => ({ isLoggedIn: !!req.session }),

        // optional, a default will be provided as following
        parser: request => ({
            hostname: request.headers.get("host") ?? "",
            path: request.nextUrl.pathname,
        }),
    }
);
```

### What if I want to check paths on subdomain?

In some cases, you might want to check paths on a subdomain (i.e., using the same project for handling both the public website and the dashboard).
This can be easily achieved since `hanldePaths` executes recursively.
Simply by passing an array of middlewares as a handler.
The `handlePaths` function iterates over all the items provided (including nested ones), so a very high level of complexity can be "handled".
However, to improve performance, I would recommend keeping it as simple as possible.

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
                req.injected?.session ? true : { redirectTo: "/auth/sign-in" },
            handler: req => {
                console.log("User authenticated: ", req.injected?.session);

                // do your stuff here

                return NextResponse.next();
            },
        },
    ],
    {
        injector: async req => {
            const session = await getSession(req);

            return { session };
        },
    }
);
```

## Authors

This library is created by Federico Vitale - ([@rawnly](https://github.com/rawnly))

## License

The MIT License.

[discussion-link]: https://github.com/vercel/next.js/discussions/43816#discussioncomment-4348363
