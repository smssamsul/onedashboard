"use client";

export default function StatsSection({ stats, isLoading, onStatClick }) {
  const getIcon = (id) => {
    switch (id) {
      case "total":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8C20.9996 7.64927 20.9049 7.30538 20.7251 7.00195C20.5454 6.69851 20.2869 6.44613 19.975 6.27L13.975 2.27C13.6737 2.06937 13.319 1.96191 12.9563 1.95805C12.5936 1.95418 12.2355 2.05404 11.918 2.248L5.918 6.248C5.61907 6.44684 5.37257 6.71694 5.2029 7.0315C5.03322 7.34607 4.94635 7.69411 4.95 8.041V16.039C4.95034 16.3905 5.0449 16.7352 5.22468 17.0394C5.40445 17.3435 5.66336 17.597 5.976 17.776L11.976 21.776C12.285 21.9839 12.6517 22.0941 13.0238 22.091C13.3959 22.0879 13.7544 21.9716 14.048 21.759L20.048 17.759C20.354 17.5702 20.6053 17.3075 20.7788 16.9953C20.9523 16.6831 21.0423 16.3312 21.04 15.973V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.27 6.96L12 12.01L20.73 6.96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "active":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className="stats-section">
      <div className="stats-section__header">
        <h2>Ringkasan</h2>
        <p>Overview aktivitas pembelajaran Anda</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="stat-card"
            onClick={() => onStatClick && onStatClick(stat.id)}
            style={{ cursor: onStatClick ? 'pointer' : 'default' }}
          >
            <div className={`stat-card__icon-wrapper icon-${stat.id}`}>
              <div className="stat-icon">{getIcon(stat.id)}</div>
            </div>
            <div className="stat-card__content">
              <p className="stat-label">{stat.label}</p>
              <strong className="stat-value">
                {isLoading ? (
                  <span className="stat-loading">...</span>
                ) : (
                  stat.value
                )}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


