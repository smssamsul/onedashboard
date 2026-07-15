export default function FollowUpActivity({ followUpHistory }) {
    return (
        <section className="dashboard-panels">
            <article className="panel">
                <div className="panel__header">
                    <div>
                        <h3 className="panel__title">Aktivitas Follow-Up</h3>
                        <p className="panel__subtitle">Riwayat interaksi terakhir Anda</p>
                    </div>
                </div>
                <div className="activity-feed">
                    {followUpHistory.length > 0 ? (
                        followUpHistory.map((log, idx) => (
                            <div className="activity-item" key={log.id || idx}>
                                <div className={`activity-status-dot ${log.status === "1" ? 'success' : 'failed'}`}></div>
                                <div className="activity-content">
                                    <div className="activity-meta">
                                        <span className="a-customer">{log.customer}</span>
                                        <span className="a-time">{log.tanggal}</span>
                                    </div>
                                    <p className="a-type">{log.follup}</p>
                                    <p className="a-desc">{log.keterangan?.substring(0, 60)}...</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-activity">Belum ada riwayat follow up.</div>
                    )}
                </div>
            </article>

            <style jsx>{`
                .activity-feed {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    padding: 1rem 0;
                }
                .activity-item {
                    display: flex;
                    gap: 16px;
                    position: relative;
                }
                .activity-item:not(:last-child):after {
                    content: '';
                    position: absolute;
                    left: 5px;
                    top: 20px;
                    bottom: -20px;
                    width: 1px;
                    background: #f1f5f9;
                }
                .activity-status-dot {
                    width: 12px; height: 12px; border-radius: 50%; border: 3px solid #fff;
                    z-index: 10; flex-shrink: 0; margin-top: 5px;
                    box-shadow: 0 0 0 1px #e2e8f0;
                }
                .activity-status-dot.success { background: #10b981; }
                .activity-status-dot.failed { background: #ef4444; }
                
                .activity-content { flex: 1; }
                .activity-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
                .a-customer { font-weight: 700; color: #334155; font-size: 0.9rem; }
                .a-time { font-size: 0.725rem; color: #94a3b8; }
                .a-type { font-size: 0.775rem; font-weight: 600; color: #ff7a00; margin-bottom: 4px; }
                .a-desc { font-size: 0.8rem; color: #64748b; line-height: 1.5; }
                .panel__subtitle { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
            `}</style>
        </section>
    );
}
