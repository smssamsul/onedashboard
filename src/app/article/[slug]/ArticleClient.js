"use client";

import React, { useState, useEffect } from "react";
import {
    ArrowLeft, ChevronRight, CheckCircle, Search, HelpCircle,
    MessageSquare, Smile, Meh, Frown
} from "lucide-react";
import { useRouter } from "next/navigation";

// Intercom-style Article Renderer
const ArticleRenderer = ({ data }) => {
    if (!data) return null;

    let contentObj;
    try {
        contentObj = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        return <div className="intercom-prose" dangerouslySetInnerHTML={{ __html: data }} />;
    }

    if (!contentObj) return null;

    const renderTiptapNode = (node, index) => {
        if (!node) return null;
        if (node.type === 'text') {
            let content = node.text;
            if (node.marks) {
                node.marks.forEach(mark => {
                    if (mark.type === 'bold') content = <strong key={index}>{content}</strong>;
                    if (mark.type === 'italic') content = <em key={index}>{content}</em>;
                    if (mark.type === 'underline') content = <u key={index}>{content}</u>;
                    if (mark.type === 'link') content = <a key={index} href={mark.attrs.href} target="_blank" rel="noopener" className="intercom-link">{content}</a>;
                });
            }
            return content;
        }

        const children = node.content ? node.content.map((child, i) => renderTiptapNode(child, i)) : null;

        switch (node.type) {
            case 'doc': return <div key={index}>{children}</div>;
            case 'paragraph': return <p key={index} className="intercom-p" style={{ textAlign: node.attrs?.textAlign || 'left' }}>{children}</p>;
            case 'heading':
                const Tag = `h${node.attrs?.level || 1}`;
                return <Tag key={index} className={`intercom-h${node.attrs?.level || 1}`} style={{ textAlign: node.attrs?.textAlign || 'left' }}>{children}</Tag>;
            case 'bulletList': return <ul key={index} className="intercom-list-bullet">{children}</ul>;
            case 'orderedList': return <ol key={index} className="intercom-list-ordered">{children}</ol>;
            case 'listItem': return <li key={index} className="intercom-li">{children}</li>;
            case 'blockquote': return <blockquote key={index} className="intercom-quote">{children}</blockquote>;
            case 'image':
                return (
                    <figure key={index} className="intercom-figure">
                        <img src={node.attrs.src} alt={node.attrs.alt} className="intercom-img" />
                        {node.attrs.title && <figcaption className="intercom-caption">{node.attrs.title}</figcaption>}
                    </figure>
                );
            case 'horizontalRule': return <hr key={index} className="intercom-hr" />;
            case 'hardBreak': return <br key={index} />;
            default: return null;
        }
    };

    if (contentObj.type === 'doc') {
        return <div className="intercom-renderer">{renderTiptapNode(contentObj, 0)}</div>;
    }

    if (contentObj.blocks) {
        return (
            <div className="intercom-renderer">
                {contentObj.blocks.map((block, index) => {
                    switch (block.type) {
                        case "header":
                            const Tag = `h${block.data.level || 2}`;
                            return <Tag key={index} className={`intercom-h${block.data.level || 2}`}>{block.data.text}</Tag>;
                        case "paragraph":
                            return <p key={index} className="intercom-p" dangerouslySetInnerHTML={{ __html: block.data.text }}></p>;
                        case "list":
                            const ListTag = block.data.style === "ordered" ? "ol" : "ul";
                            const listClass = block.data.style === "ordered" ? "intercom-list-ordered" : "intercom-list-bullet";
                            return (
                                <ListTag key={index} className={listClass}>
                                    {block.data.items.map((item, i) => (
                                        <li key={i} className="intercom-li" dangerouslySetInnerHTML={{ __html: item }}></li>
                                    ))}
                                </ListTag>
                            );
                        case "image":
                            return (
                                <figure key={index} className="intercom-figure">
                                    <img src={block.data.file?.url || "/placeholder.jpg"} alt={block.data.caption} className="intercom-img" />
                                    {block.data.caption && <figcaption className="intercom-caption">{block.data.caption}</figcaption>}
                                </figure>
                            );
                        default: return null;
                    }
                })}
            </div>
        );
    }
    return null;
};

export default function ArticleClient({ article, allArticles = [] }) {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!article) return null;

    return (
        <div className="intercom-layout-root">
            {/* INTERCOM NAVBAR */}
            <header className="intercom-navbar">
                <div className="intercom-nav-container">
                    <div className="intercom-nav-left">
                        <img src="/assets/logo.png" alt="Logo" className="intercom-logo" onClick={() => router.push('/')} />
                    </div>
                </div>
            </header>

            {/* INTERCOM CONTENT AREA */}
            <main className="intercom-main">
                <div className="intercom-content-wrapper">
                    {/* LEFT COLUMN: MAIN CONTENT */}
                    <div className="intercom-article-container">

                        <header className="intercom-article-header">
                            <h1 className="intercom-title">{article.title}</h1>
                        </header>

                        <article className="intercom-article-body">
                            {hasMounted ? (
                                <ArticleRenderer data={article.content} />
                            ) : (
                                <div className="intercom-skeleton"></div>
                            )}
                        </article>

                        {/* FEEDBACK SECTION */}
                        <footer className="intercom-feedback">
                            <div className="feedback-inner">
                                <h3>Did this answer your question?</h3>
                                <div className="feedback-icons">
                                    <button title="Disappointed"><Frown size={32} /></button>
                                    <button title="Neutral"><Meh size={32} /></button>
                                    <button title="Smiley"><Smile size={32} /></button>
                                </div>
                            </div>
                        </footer>
                    </div>

                    {/* RIGHT COLUMN: SIDEBAR */}
                    <aside className="intercom-sidebar">
                        <div className="sidebar-group">
                            {allArticles.map((other, idx) => {
                                const isActive = other.slug === article.slug;
                                return (
                                    <div
                                        key={other.id || idx}
                                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            if (!isActive) {
                                                window.location.href = `/article/${other.slug}`;
                                            }
                                        }}
                                    >
                                        {other.title}
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                </div>
            </main>

            <style jsx>{`
                .intercom-layout-root {
                    background: #fff;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif;
                    color: #111827;
                }

                /* NAVBAR */
                .intercom-navbar {
                    height: 64px;
                    border-bottom: 1px solid #E5E7EB;
                    display: flex;
                    align-items: center;
                    background: #fff;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .intercom-nav-container {
                    max-width: 1100px;
                    width: 100%;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 1.5rem;
                }
                .intercom-logo { height: 40px; width: auto; cursor: pointer; }
                .intercom-nav-right { display: flex; align-items: center; gap: 1.5rem; }
                .intercom-search-box {
                    display: flex;
                    align-items: center;
                    background: #F3F4F6;
                    border-radius: 8px;
                    padding: 8px 12px;
                    width: 280px;
                    gap: 10px;
                }
                .search-icon { color: #9CA3AF; }
                .intercom-search-box input {
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 14px;
                    width: 100%;
                    color: #111827;
                }
                .intercom-nav-link {
                    background: none;
                    border: none;
                    color: #0057FF;
                    font-weight: 500;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* MAIN LAYOUT */
                .intercom-main {
                    padding: 3rem 1.5rem 6rem;
                    display: flex;
                    justify-content: center;
                }
                .intercom-content-wrapper {
                    max-width: 1100px;
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 5rem;
                }
                .intercom-article-container {
                    min-width: 0;
                }

                /* SIDEBAR STYLES */
                .intercom-sidebar {
                    position: sticky;
                    top: 100px;
                    height: fit-content;
                }
                .sidebar-group {
                    display: flex;
                    flex-direction: column;
                    border-left: 1px solid #E5E7EB;
                }
                .sidebar-item {
                    font-size: 15px;
                    color: #4B5563;
                    padding: 0.75rem 0 0.75rem 1.5rem;
                    cursor: pointer;
                    line-height: 1.4;
                    position: relative;
                    margin-left: -1px;
                    transition: all 0.2s;
                }
                .sidebar-item:hover {
                    color: #111827;
                }
                .sidebar-item.active {
                    color: #111827;
                    font-weight: 600;
                    border-left: 2px solid #111827;
                    padding-left: calc(1.5rem - 1px);
                }

                /* BREADCRUMB */
                .intercom-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    color: #6B7280;
                    margin-bottom: 2.5rem;
                }
                .intercom-breadcrumb a { color: #0057FF; text-decoration: none; }
                .intercom-breadcrumb a:hover { text-decoration: underline; }
                .intercom-breadcrumb .current { color: #6B7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                /* HEADER */
                .intercom-title {
                    font-size: 40px;
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 0.75rem;
                    letter-spacing: -0.025em;
                }
                .intercom-subtitle {
                    font-size: 18px;
                    color: #4B5563;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }
                .intercom-author-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 3rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #F3F4F6;
                }
                .author-avatar-stack img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid #fff;
                }
                .author-info-text p { margin: 0; line-height: 1.4; }
                .author-attribution { font-size: 14px; color: #6B7280; }
                .author-attribution span { color: #111827; font-weight: 600; }
                .update-info { font-size: 13px; color: #9CA3AF; }

                /* BODY PROSE */
                .intercom-article-body {
                    font-size: 17px;
                    line-height: 1.6;
                    color: #374151;
                }
                :global(.intercom-p) { margin-bottom: 1.5rem; }
                :global(.intercom-h1) { font-size: 32px; font-weight: 800; margin: 2.5rem 0 1rem; }
                :global(.intercom-h2) { font-size: 26px; font-weight: 800; margin: 2.5rem 0 1rem; }
                :global(.intercom-h3) { font-size: 20px; font-weight: 700; margin: 2rem 0 1rem; }
                :global(.intercom-link) { color: #0057FF; text-decoration: none; border-bottom: 1px solid transparent; }
                :global(.intercom-link:hover) { border-bottom-color: #0057FF; }
                
                :global(.intercom-list-bullet) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
                :global(.intercom-list-ordered) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
                :global(.intercom-li) { margin-bottom: 0.5rem; }
                
                :global(.intercom-figure) { margin: 2.5rem 0; text-align: center; display: flex; flex-direction: column; align-items: center; }
                :global(.intercom-img) {
                    max-width: 320px;
                    width: 100%;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #E5E7EB;
                }
                :global(.intercom-caption) { margin-top: 0.75rem; font-size: 14px; color: #6B7280; font-style: italic; max-width: 320px; }

                /* FEEDBACK */
                .intercom-feedback {
                    margin-top: 5rem;
                    padding-top: 3rem;
                    border-top: 1px solid #F3F4F6;
                    text-align: center;
                }
                .feedback-inner h3 { font-size: 18px; font-weight: 600; margin-bottom: 1.5rem; }
                .feedback-icons { display: flex; justify-content: center; gap: 2rem; }
                .feedback-icons button {
                    background: none;
                    border: none;
                    color: #D1D5DB;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 8px;
                    border-radius: 50%;
                }
                .feedback-icons button:hover { color: #0057FF; background: #F3F4F6; transform: scale(1.1); }

                .intercom-skeleton {
                    width: 100%;
                    height: 400px;
                    background: #F9FAFB;
                    border-radius: 12px;
                    animation: intercomPulse 2s infinite;
                }
                @keyframes intercomPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @media (max-width: 640px) {
                    .intercom-title { font-size: 32px; }
                    .intercom-search-box { display: none; }
                    .intercom-nav-link span { display: none; }
                }
            `}</style>
        </div>
    );
}
