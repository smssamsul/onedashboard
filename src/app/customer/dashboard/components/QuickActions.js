"use client";

import { useRouter } from "next/navigation";

export default function QuickActions({ unpaidCount = 0, onUpdateProfile }) {
  const router = useRouter();

  const actions = [
    {
      id: 'payment',
      label: 'Pembayaran',
      description: unpaidCount > 0
        ? `${unpaidCount} order menunggu pembayaran`
        : 'Lengkapi pembayaran order',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      href: '/customer/dashboard/payment',
      highlight: unpaidCount > 0,
      badge: unpaidCount > 0 ? unpaidCount : null,
    },
    {
      id: 'profile',
      label: 'Profil',
      description: 'Kelola data pribadi Anda',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      href: '/customer/profile',
      onClick: null,
    },
    {
      id: 'help',
      label: 'Bantuan',
      description: 'Butuh bantuan? Hubungi kami',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15C21 16.1046 20.1046 17 19 17H7L3 21V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      href: '#',
      onClick: () => {
        // Open help/contact
        console.log('Open help');
      },
    },
  ];

  return (
    <section className="quick-actions-section">
      <h2>Aksi Cepat</h2>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`quick-action-card ${action.highlight ? 'highlight' : ''}`}
            onClick={() => {
              if (action.onClick) {
                action.onClick();
              } else if (action.href && action.href !== '#') {
                router.push(action.href);
              }
            }}
          >
            <div className="quick-action-card__icon">{action.icon}</div>
            <div className="quick-action-card__content">
              <div className="quick-action-card__header">
                <strong>{action.label}</strong>
                {action.badge && (
                  <span className="quick-action-badge">{action.badge}</span>
                )}
              </div>
              <p>{action.description}</p>
            </div>
            <svg
              className="quick-action-card__arrow"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}


