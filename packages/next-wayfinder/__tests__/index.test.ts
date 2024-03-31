import { NextRequest, NextResponse } from "next/server";
import { test, expect, vi } from "vitest";

import { Middleware, NextRequestWithParams } from "../src/types";
import {
    addParams,
    findMiddleware,
    getParams,
    applyContext,
    type FindOptions
} from "../src/utils";

const queryForDomain: FindOptions = { hostname: "app.acme.org", path: "/", method: "GET" };
const queryForPath: FindOptions = { hostname: "", path: "/dashboard/it", method:"GET" };

const middlewares: Middleware<unknown>[] = [
    {
        path: "/dashboard/:lang",
        guard: params => params.lang === "en",
        handler: _r => NextResponse.next(),
    },
    {
        path: "/dashboard/:lang/:path*",
        guard: params => params.lang === "it",
        handler: _r => NextResponse.next(),
    },
    {
        hostname: d => d.startsWith("app"),
        handler: () => NextResponse.next(),
    },
    {
        path: "/:path*",
        handler: () => NextResponse.next(),
    },
    {
        path: "/events/:slug/edit",
        redirectTo: "/dashboard/events/:slug",
        includeOrigin: "origin",
    },
    {
        path: "/events/:slug/edit",
        redirectTo: "/dashboard/events/:slug",
        includeOrigin: true,
    },
    
];

test('should find the middleware with the right method', () => {
    const post = vi.fn();
    const get = vi.fn();

    const extra: Middleware<unknown>[] = [
        {
            path: "/api/events/create",
            handler: post,
            method: "POST"
        },
        {
            path: "/api/events/create",
            handler: get,
            method: "GET"
        }
    ]

    const post_middleware = findMiddleware([...extra, ...middlewares], {
        ...queryForPath,
        path: '/api/events/create',
        method: "POST",
    })

    expect(post_middleware).toBeDefined();
    expect(post_middleware).toHaveProperty("method");
    if (!post_middleware || Middleware.isHostname(post_middleware)) return;
    expect(post_middleware.method).toBe("POST");

    if (Middleware.isPath(post_middleware)) {
        expect(post_middleware.handler).toBeInstanceOf(Function)

        if (Array.isArray(post_middleware.handler)) return
        const request = new NextRequest(new URL("https://google.it")) as NextRequestWithParams<unknown>
        post_middleware.handler(request, {} as any, {} as any)
        expect(post).toHaveBeenCalledWith(request, {}, {})
    }

    const get_middleware = findMiddleware([...extra, ...middlewares], {
        ...queryForPath,
        path: '/api/events/create',
        method: "GET",
    })

    expect(get_middleware).toBeDefined();
    expect(get_middleware).toHaveProperty("method");
    if (!get_middleware || Middleware.isHostname(get_middleware)) return;
    expect(get_middleware.method).toBe("GET");

    if (Middleware.isPath(get_middleware)) {
        expect(get_middleware.handler).toBeInstanceOf(Function)

        if (Array.isArray(get_middleware.handler)) return
        const request = new NextRequest(new URL("https://google.it")) as NextRequestWithParams<unknown>
        get_middleware.handler(request, {} as any, {} as any)
        expect(get).toHaveBeenCalledWith(request, {}, {})
    }
})

test("should use the fallback middleware", () => {
    const middleware = findMiddleware(middlewares, {
        ...queryForPath,
        path: "/abc",
        method: 'GET'
    });

    expect(middleware).toBeDefined();

    if (middleware && Middleware.isPath(middleware)) {
        expect(middleware?.path).toEqual("/:path*");
    }
});

test("should find the middleware with array", () => {
    const middleware = findMiddleware(
        [
            {
                path: ["/login"],
                handler: () => null,
            },
        ],
        { ...queryForPath, path: "/login", method: "GET" }
    );

    expect(middleware).toBeTruthy();
});

test("should find the middleware with string", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware || Middleware.isHostname(middleware)) return;

    expect(middleware.guard?.({ lang: "it" })).toBe(true);

    const m2 = findMiddleware(middlewares, queryForDomain);

    expect(m2).not.toBeUndefined();
    expect(m2).not.toHaveProperty("path");
    expect(m2).toHaveProperty("hostname");
});

test("should retrive the params", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware || Middleware.isHostname(middleware)) return;

    const params = getParams(middleware.path, "/dashboard/it");

    expect(params).toHaveProperty("lang");
    expect(params.lang).toBe("it");
});

test("should add the params", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware || Middleware.isHostname(middleware)) return;

    const request = new NextRequest(new URL("http://localhost:3000"));
    const requestWithParams = addParams(
        request,
        middleware.path,
        "/dashboard/it"
    );

    expect(request).toHaveProperty("params");
    expect(requestWithParams.params).toHaveProperty("lang");
    expect(requestWithParams.params).not.toHaveProperty("path");
    expect(requestWithParams.params.lang).toBe("it");
});

test("shuld inject", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware || Middleware.isHostname(middleware)) return;

    const request = new NextRequest(new URL("http://localhost:3000"));
    const injectedRequest = applyContext(request, { ok: true });

    expect(request).toHaveProperty("ctx");
    expect(injectedRequest).toHaveProperty("ctx");
    expect(injectedRequest.ctx).toHaveProperty("ok", true);
});
