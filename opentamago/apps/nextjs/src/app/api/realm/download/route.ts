import { NextRequest, NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type RealmErrorCode =
  | "INVALID_UUID"
  | "INVALID_CHARX"
  | "FILE_TOO_LARGE"
  | "DOWNLOAD_FAILED";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const uuid = searchParams.get("id");

  if (!uuid || !UUID_REGEX.test(uuid)) {
    console.log("[Realm] INVALID_UUID:", uuid);
    return NextResponse.json(
      { code: "INVALID_UUID" as RealmErrorCode },
      { status: 400 }
    );
  }

  try {
    const realmUrl = `https://realm.risuai.net/api/v1/download/charx-v3/${uuid}`;
    console.log("[Realm] Fetching:", uuid, "from", realmUrl);

    const response = await fetch(realmUrl, {
      headers: {
        "User-Agent": "OpenTamago/1.0",
        Accept: "application/octet-stream, */*",
      },
      // Vercel has function timeout limits, add signal for better error handling
      signal: AbortSignal.timeout(25000), // 25s timeout
    });

    if (!response.ok) {
      console.log("[Realm] INVALID_CHARX:", {
        uuid,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      const errorBody = await response.text().catch(() => "Unable to read body");
      console.log("[Realm] Error response body:", errorBody);
      return NextResponse.json(
        { code: "INVALID_CHARX" as RealmErrorCode },
        { status: response.status }
      );
    }

    // Check Content-Length header to reject large files early
    const contentLength = response.headers.get("content-length");
    const contentLengthNum = contentLength ? parseInt(contentLength, 10) : 0;
    const sizeInMB = (contentLengthNum / (1024 * 1024)).toFixed(1);
    console.log("[Realm] Content-Length:", uuid, contentLength, `(${sizeInMB}MB)`);

    if (contentLengthNum > MAX_FILE_SIZE) {
      console.log("[Realm] FILE_TOO_LARGE:", uuid, `${sizeInMB}MB`);
      return NextResponse.json(
        { code: "FILE_TOO_LARGE" as RealmErrorCode, size: `${sizeInMB}MB` },
        { status: 413 }
      );
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${uuid}.charx"`,
      },
    });
  } catch (error) {
    console.error("[Realm] Error downloading from RisuRealm:", {
      uuid,
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { code: "DOWNLOAD_FAILED" as RealmErrorCode },
      { status: 500 }
    );
  }
}
