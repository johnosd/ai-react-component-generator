import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

// Mock server-only so it doesn't throw outside Next.js runtime
vi.mock("server-only", () => ({}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

// Shared cookie store mock
const cookieStoreMock = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStoreMock)),
}));

// Import after mocks are set up
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

async function makeValidToken(
  payload: object,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a signed JWT", async () => {
    await createSession("user-1", "user@example.com");

    expect(cookieStoreMock.set).toHaveBeenCalledOnce();
    const [name, _token, options] = cookieStoreMock.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets cookie expiry ~7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = cookieStoreMock.set.mock.calls[0];
    const expMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("JWT contains the correct userId and email claims", async () => {
    await createSession("user-42", "hello@example.com");

    const [, token] = cookieStoreMock.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("JWT is signed with HS256", async () => {
    await createSession("user-1", "user@example.com");

    const [, token] = cookieStoreMock.set.mock.calls[0];
    // A valid HS256 JWT has three base64url parts
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    const header = JSON.parse(atob(parts[0]));
    expect(header.alg).toBe("HS256");
  });

  test("sets secure=false in non-production environments", async () => {
    const original = process.env.NODE_ENV;
    // NODE_ENV is read-only in some runtimes; cast to bypass
    (process.env as Record<string, string>).NODE_ENV = "development";

    await createSession("user-1", "user@example.com");
    const [, , options] = cookieStoreMock.set.mock.calls[0];
    expect(options.secure).toBe(false);

    (process.env as Record<string, string>).NODE_ENV = original;
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    cookieStoreMock.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const payload = {
      userId: "user-1",
      email: "user@example.com",
      expiresAt: new Date().toISOString(),
    };
    const token = await makeValidToken(payload);
    cookieStoreMock.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await new SignJWT({ userId: "u", email: "e@e.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1ms")
      .setIssuedAt(new Date(Date.now() - 1000))
      .sign(JWT_SECRET);
    cookieStoreMock.get.mockReturnValue({ value: token });

    expect(await getSession()).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    cookieStoreMock.get.mockReturnValue({ value: "not.a.valid.jwt" });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(cookieStoreMock.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/api/test");
    if (token) {
      req.cookies.set("auth-token", token);
    }
    return req;
  }

  test("returns null when no cookie is present", async () => {
    expect(await verifySession(makeRequest())).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeValidToken({
      userId: "user-2",
      email: "b@example.com",
      expiresAt: new Date().toISOString(),
    });

    const session = await verifySession(makeRequest(token));
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("b@example.com");
  });

  test("returns null for an invalid token", async () => {
    expect(await verifySession(makeRequest("garbage"))).toBeNull();
  });

  test("returns null for a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "x", email: "x@x.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(otherSecret);

    expect(await verifySession(makeRequest(token))).toBeNull();
  });
});
