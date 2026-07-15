import React from "react";
import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";
import ArticleClient from "./ArticleClient";
import { getBackendUrl } from "@/config/api";

const LOG = (...args) => console.log("[ARTICLE]", ...args);
const ERR = (...args) => console.error("[ARTICLE][ERROR]", ...args);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🥇 ARTICLE FETCH - Dengan Dukungan Token Bearer
 */
async function getArticle(slug, token = null) {
    if (!slug) return null;

    const headersList = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    if (token) {
        headersList["Authorization"] = `Bearer ${token}`;
    }

    const url = getBackendUrl(`post/slug/${slug}`);
    LOG("Fetching article with token from URL:", url);

    try {
        const res = await fetch(url, {
            headers: headersList,
            cache: "no-store"
        });

        const rawText = await res.text();
        LOG("Backend raw response status:", res.status);

        if (!res.ok) {
            LOG("Slug fetch failed, trying ID fallback...");
            const resId = await fetch(getBackendUrl(`post/${slug}`), {
                headers: headersList,
                cache: "no-store"
            });
            if (!resId.ok) return null;
            const jsonId = await resId.json();
            return jsonId?.data ?? null;
        }

        const json = JSON.parse(rawText);
        return json?.data ?? null;
    } catch (e) {
        ERR("Critical fetch error:", e);
        return null;
    }
}

async function getAllArticles(token = null) {
    const headersList = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    if (token) {
        headersList["Authorization"] = `Bearer ${token}`;
    }

    const url = getBackendUrl("post");
    try {
        const res = await fetch(url, {
            headers: headersList,
            cache: "no-store"
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data ?? [];
    } catch (e) {
        return [];
    }
}

/**
 * 🥈 METADATA
 */
export async function generateMetadata({ params }) {
    const awaitedParams = await params;
    const { slug } = awaitedParams || {};

    // Kita bisa fetch article di sini untuk dapet title asli
    const data = await getArticle(slug);

    return {
        title: data?.title
            ? `${data.title} | Ternak Properti`
            : (slug ? `${slug} | Ternak Properti` : "Article | Ternak Properti"),
        description: data?.subtitle || "Knowledge base and support articles for Ternak Properti.",
    };
}

/**
 * 🥉 MAIN PAGE
 */
export default async function PublicArticlePage({ params }) {
    await headers(); // force dynamic

    // 🔥 PENTING: Di Next.js 15+, cookies() dan params adalah async
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const awaitedParams = await params;
    const { slug } = awaitedParams || {};

    if (!slug) {
        LOG("Slug not found in route params");
        notFound();
    }

    LOG("Processing article with auth for slug:", slug);
    const [data, allArticles] = await Promise.all([
        getArticle(slug, token),
        getAllArticles(token)
    ]);

    if (!data) {
        LOG("Article data not found in backend for slug:", slug);
        notFound();
    }

    return (
        <ArticleClient
            article={{
                title: data.title,
                author: data.author || "Ternak Properti Team",
                date: data.create_at || "Just now",
                content: data.content,
                slug: data.slug || slug
            }}
            allArticles={allArticles}
        />
    );
}
