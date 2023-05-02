import { NextRequest, NextResponse } from "next/server";
import { test, expect } from "vitest";

import { type Middleware } from "../src/types";
import { addParams, findMiddleware, getParams, inject } from "../src/utils";

const queryForDomain = { hostname: "app.acme.org", path: "/" };
const queryForPath = { hostname: "", path: "/dashboard/it" };

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

test("should use the fallback middleware", () => {
    const middleware = findMiddleware(middlewares, {
        ...queryForPath,
        path: "/abc",
    });

    expect(middleware).toBeDefined();
    expect(middleware?.path).toEqual("/:path*");
});

test("should find the middleware with array", () => {
    const middleware = findMiddleware(
        [
            {
                path: ["/login"],
                handler: () => null,
            },
        ],
        { ...queryForPath, path: "/login" }
    );

    expect(middleware).toBeTruthy();
});

test("should find the middleware with string", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware?.path) return;

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

    if (!middleware?.path) return;

    const params = getParams(middleware.path, "/dashboard/it");

    expect(params).toHaveProperty("lang");
    expect(params.lang).toBe("it");
});

test("should add the params", () => {
    const middleware = findMiddleware(middlewares, queryForPath);

    expect(middleware).not.toBeUndefined();
    expect(middleware).toHaveProperty("path");

    if (!middleware?.path) return;

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

    if (!middleware?.path) return;

    const request = new NextRequest(new URL("http://localhost:3000"));
    const injectedRequest = inject(request, { ok: true });

    expect(request).toHaveProperty("injected");
    expect(injectedRequest).toHaveProperty("injected");
    expect(injectedRequest.injected).toHaveProperty("ok", true);
});
