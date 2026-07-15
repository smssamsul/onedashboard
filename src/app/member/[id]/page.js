"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Copy } from "lucide-react";

export default function MemberPage() {
    const params = useParams();
    const { id } = params;
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin);
        }
    }, []);

    useEffect(() => {
        // Simulasi fetch data atau fetch real data jika ada endpoint public
        // Karena ini halaman public (untuk scan QR), kita asumsikan ada endpoint public atau kita fetch data customer
        // dan tampilkan jika user yang login sama, atau ini halaman verified member public.

        // Untuk saat ini kita simulasi display dulu
        async function fetchMember() {
            try {
                // TODO: Ganti dengan endpoint real fetch member by ID
                // const res = await fetch(`/api/member/${id}`);
                // const data = await res.json();

                // Mock data sementara
                setMember({
                    id: id,
                    nama: "Member Verified",
                    status: "BASIC",
                    joinDate: new Date().toLocaleDateString()
                });
            } catch (err) {
                setError("Member tidak ditemukan");
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchMember();
        }
    }, [id]);

    const handleCopyId = () => {
        if (member?.id) {
            navigator.clipboard.writeText(String(member.id));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

    // Logic similar to HeroSection for display, assuming 'id' param is the best we have for memberID in this mock
    const memberId = member?.id ? String(member.id).padStart(6, '0') : "000000";
    const qrData = `${origin}/member/${id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=000000&margin=0`;

    return (
        <div className="member-page-container">
            <div className="max-w-md w-full">
                <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">Kartu Member Ternak Properti</h1>

                <div className="hero-card-wrapper">
                    <div className="ternak-card">

                        {/* Background Illustration (Housing Rows) */}
                        <div className="ternak-card__bg">
                            {/* Simple CSS shape skyline mimicking property rows */}
                            <svg className="skyline-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                                <path d="M0,200 L0,150 L30,120 L60,150 L60,140 L90,110 L120,140 L120,100 L160,140 L200,100 L240,140 L240,120 L270,90 L300,120 L330,90 L360,120 L400,80 L400,200 Z" fill="#2d2d2d" opacity="0.3" />
                                <path d="M20,200 L20,170 L50,140 L80,170 L110,140 L140,170 L170,140 L200,170 L230,140 L260,170 L290,140 L320,170 L350,140 L380,170 L400,150 L400,200 Z" fill="#383838" opacity="0.4" />
                            </svg>
                        </div>

                        {/* TOP ROW */}
                        <div className="ternak-card__top">
                            <div className="ternak-card__brand">
                                <h2 className="brand-title">TERNAK PROPERTI</h2>
                                <span className="brand-subtitle">MEMBERSHIP</span>
                            </div>

                            <div className="ternak-card__qr">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrUrl} alt="Member QR" className="qr-image" />
                            </div>
                        </div>

                        {/* BOTTOM ROW */}
                        <div className="ternak-card__bottom">
                            <div className="ternak-card__info-left">
                                <div className="info-group">
                                    <label>MEMBER ID</label>
                                    <div className="value-row">
                                        <span className="id-text">{memberId}</span>
                                        <button onClick={handleCopyId} className="copy-icon-btn">
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="info-group mt-2">
                                    <label>CARDHOLDER</label>
                                    <div className="holder-name">{member?.nama}</div>
                                </div>
                            </div>

                            <div className="ternak-card__info-right">
                                <label className="align-right">MEMBER</label>
                                <div className="membership-badge">
                                    {member?.status}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>© 2026 Ternak Properti. All rights reserved.</p>
                </div>
            </div>

            <style jsx>{`
                .member-page-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background-color: #f3f4f6;
                    padding: 1rem;
                }

                /* --- TERNAK CARD DESIGN REUSED --- */
                .hero-card-wrapper {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                }
        
                .ternak-card {
                  width: 100%;
                  /* aspect-ratio: 1.586;  Removed specific aspect ratio to ensure fit on mobile/page context if needed, but keeping generally credit card shape */
                  aspect-ratio: 1.586;
                  background: #111;
                  border-radius: 20px;
                  position: relative;
                  overflow: hidden;
                  padding: 1.5rem;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
                  color: #fff;
                  border: 1px solid #333;
                }
        
                /* Background Illustration */
                .ternak-card__bg {
                  position: absolute;
                  inset: 0;
                  z-index: 0;
                  overflow: hidden;
                  background: linear-gradient(135deg, #1a1a1a 0%, #000 100%);
                }
        
                .skyline-svg {
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  z-index: 1;
                }
        
                /* Top Section */
                .ternak-card__top {
                  position: relative;
                  z-index: 2;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                }
        
                .brand-title {
                  font-family: sans-serif; 
                  font-weight: 800;
                  font-size: 1.5rem;
                  line-height: 1;
                  margin: 0;
                  background: linear-gradient(45deg, #fff, #fbbf24);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  letter-spacing: -0.02em;
                  text-transform: uppercase;
                }
        
                .brand-subtitle {
                  font-size: 0.75rem;
                  letter-spacing: 0.3em;
                  color: #fbbf24; /* Amber-400 */
                  text-transform: uppercase;
                  font-weight: 600;
                  display: block;
                  margin-top: 4px;
                }
        
                .ternak-card__qr {
                  background: #fff;
                  padding: 4px;
                  border-radius: 8px;
                  width: 60px;
                  height: 60px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
        
                .qr-image {
                  width: 100%;
                  height: 100%;
                  display: block;
                }
        
                /* Bottom Section */
                .ternak-card__bottom {
                  position: relative;
                  z-index: 2;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  margin-top: auto;
                }
        
                .info-group label {
                  font-size: 0.6rem;
                  color: #666;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  font-weight: 700;
                  display: block;
                  margin-bottom: 2px;
                }
        
                .value-row {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                }
        
                .id-text {
                  font-family: 'Courier New', monospace;
                  font-size: 1rem;
                  color: #fbbf24;
                  font-weight: 700;
                  letter-spacing: 0.1em;
                }
        
                .copy-icon-btn {
                  background: none;
                  border: none;
                  color: #666;
                  cursor: pointer;
                  padding: 0;
                }
                .copy-icon-btn:hover { color: #fbbf24; }
        
                .holder-name {
                  font-size: 1rem;
                  font-weight: 700;
                  text-transform: uppercase;
                  line-height: 1.2;
                  max-width: 180px;
                  color: #fff;
                  word-wrap: break-word;
                }
                
                .mt-2 { margin-top: 0.75rem; }
        
                .ternak-card__info-right {
                  text-align: right;
                }
        
                .align-right {
                  text-align: right;
                }
        
                .membership-badge {
                  font-size: 1.25rem;
                  font-weight: 900;
                  color: #fbbf24;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                  font-style: italic;
                }
            `}</style>
        </div>
    );
}
