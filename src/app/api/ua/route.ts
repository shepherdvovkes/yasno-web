import { NextResponse } from "next/server";

const API_BASE = "https://api.ukrainealarm.com";

function getApiKey() {
  const key = process.env.UKRAINEALARM_API_KEY;
  if (!key) {
    throw new Error("UKRAINEALARM_API_KEY is not set");
  }
  return key;
}

function buildTargetUrl(path: string, search: URLSearchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE}${normalizedPath}`);

  for (const [k, v] of search.entries()) {
    if (k === "path") continue;
    url.searchParams.set(k, v);
  }

  return url;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Missing required query param: path" },
        { status: 400 },
      );
    }

    const targetUrl = buildTargetUrl(path, url.searchParams);

    const upstream = await fetch(targetUrl, {
      headers: {
        "X-API-Key": getApiKey(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (!upstream.ok) {
      const body = contentType.includes("application/json")
        ? await upstream.json().catch(() => null)
        : await upstream.text().catch(() => "");

      return NextResponse.json(
        {
          error: "Upstream request failed",
          upstreamStatus: upstream.status,
          upstreamBody: body,
          target: targetUrl.toString(),
        },
        { status: 502 },
      );
    }

    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      return NextResponse.json(data, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": contentType || "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
