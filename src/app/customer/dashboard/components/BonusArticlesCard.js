"use client";

import { FileText, ChevronRight, Gift } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BonusArticlesCard({ articles, isLoading }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="bonus-articles-container skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-item"></div>
      </div>
    );
  }

  if (!articles || articles.length === 0) return null;

  return (
    <section className="bonus-articles-section">
      <div className="section-header">
        <div className="header-title-group">
          <h2 className="section-title">Akses Materi Eksklusif</h2>
          <p className="section-subtitle">Bonus konten spesial dari produk yang Anda beli</p>
        </div>
      </div>

      <div className="product-bonus-groups">
        {articles.map((group, groupIdx) => (
          <div key={groupIdx} className="product-bonus-card">
            <div className="product-bonus-card__header">
              <div className="icon-badge">
                <Gift size={16} />
              </div>
              <h3 className="product-name-label">
                Bonus Eksklusif: <span className="highlight">{group.productName}</span>
              </h3>
            </div>

            <div className="articles-list">
              {group.posts.map((article) => (
                <div
                  key={article.id}
                  className="article-item"
                  onClick={() => router.push(`/article/${article.slug}`)}
                >
                  <div className="article-icon-box">
                    <FileText size={18} />
                  </div>
                  <div className="article-content">
                    <h4 className="article-title">{article.title}</h4>
                    <span className="article-link-text">Baca Materi Sekarang <ChevronRight size={12} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .bonus-articles-section {
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        
        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        .product-bonus-groups {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .product-bonus-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .product-bonus-card__header {
          background: #f8fafc;
          padding: 12px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-badge {
          background: #f59e0b;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .product-name-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #475569;
          margin: 0;
        }

        .highlight {
          color: #1e293b;
          font-weight: 800;
        }

        .articles-list {
          padding: 8px 0;
        }

        .article-item {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }

        .article-item:last-child {
          border-bottom: none;
        }

        .article-item:hover {
          background: #fffbeb;
        }

        .article-icon-box {
          color: #d97706;
          background: #fff7ed;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .article-content {
          flex: 1;
        }

        .article-title {
          font-size: 1rem;
          font-weight: 700;
          color: #334155;
          margin: 0;
          line-height: 1.4;
        }

        .article-link-text {
          font-size: 0.75rem;
          color: #d97706;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          text-transform: uppercase;
        }

        /* Skeleton */
        .skeleton-header {
          height: 30px;
          width: 200px;
          background: #e2e8f0;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .skeleton-item {
          height: 120px;
          width: 100%;
          background: #edf2f7;
          border-radius: 16px;
        }
      `}</style>
    </section>
  );
}
