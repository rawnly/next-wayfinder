/**
 * @jest-environment node
 */

import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

import { handlePaths } from "../src";

(Headers.prototype as any).getAll = () => [];

describe("handlePaths", () => {
  test("should match /dashboard", async () => {
    const m = vi.fn();
    const n = vi.fn();

    const middleware = handlePaths([
      {
        path: "/dashboard/:path*",
        handler: m,
      },
      {
        path: "/dashboard",
        handler: n,
      },
    ]);

    const req = new NextRequest(
      new Request("http://localhost:3000/dashboard")
    );

    await middleware(req, {} as NextFetchEvent);

    expect(m).toBeCalled();
    expect(n).not.toBeCalled();
  });

  test("should redirect to /login", async () => {
    const middleware = handlePaths([
      {
        path: "/:path*",
        redirectTo: "/login",
      },
    ]);

    const req = new NextRequest(
      new Request("http://api.localhost:3000/dashboard")
    );
    const res = await middleware(req, {} as NextFetchEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.statusText).toBe("Temporary Redirect");
  });
});
