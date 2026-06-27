import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        const tokenResponse = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: process.env.ONEMAP_EMAIL,
                password: process.env.ONEMAP_PASSWORD,
            }),
        });

        const tokenData = await tokenResponse.json();
        const token = tokenData.access_token;

        if (!token) {
            return NextResponse.json(
                { error: "Unable to get OneMap token", results: [] },
                { status: 500 }
            );
        }

        const searchResponse = await fetch(
            `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
                query
            )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
            {
                headers: {
                    Authorization: token,
                },
            }
        );

        const searchData = await searchResponse.json();

        return NextResponse.json({
            results: searchData.results || [],
        });
    } catch (error) {
        console.error("OneMap search failed:", error);

        return NextResponse.json(
            { error: "Search failed", results: [] },
            { status: 500 }
        );
    }
}