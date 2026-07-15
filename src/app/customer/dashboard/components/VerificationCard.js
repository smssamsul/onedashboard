"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { getCustomerSession } from "@/lib/customerAuth";
import CryptoJS from "crypto-js";

export default function VerificationCard({ isVerified }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const isSubmitting = useRef(false);

    const handleVerify = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (loading || isSubmitting.current) return;

        isSubmitting.current = true;
        setLoading(true);

        try {
            const session = getCustomerSession();
            if (!session || !session.user) {
                toast.error("Sesi tidak valid. Silakan login kembali.");
                router.push("/customer");
                return;
            }

            const customer = session.user;
            const secret = process.env.NEXT_PUBLIC_OTP_SECRET_KEY;
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const hash = CryptoJS.HmacSHA256(timestamp, secret).toString(CryptoJS.enc.Hex);

            const payload = {
                customer_id: customer.id,
                wa: customer.wa
            };

            const res = await fetch("/api/otp/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Timestamp": timestamp,
                    "X-API-Hash": hash
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                toast.success("OTP berhasil dikirim ke WhatsApp!");
                // Simpan ID OTP jika perlu, atau langsung navigasi
                router.push('/customer/otp');
            } else {
                toast.error(data.message || "Gagal mengirim OTP.");
            }

        } catch (error) {
            console.error("OTP Error:", error);
            toast.error("Terjadi kesalahan saat mengirim OTP.");
        } finally {
            isSubmitting.current = false;
            setLoading(false);
        }
    };

    if (isVerified === null || isVerified === undefined) return null;

    return (
        <>
            <div className={`status-card ${isVerified ? 'status-verified' : 'status-unverified'}`}>
                <div className={`status-icon ${isVerified ? 'icon-verified' : 'icon-unverified'}`}>
                    {isVerified ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div className="status-content">
                    <p className="status-label">STATUS AKUN</p>
                    <h3 className="status-value">{isVerified ? "TERVERIFIKASI" : "BELUM VERIFIKASI"}</h3>
                    {!isVerified && (
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={loading}
                            className="verify-now-btn"
                        >
                            {loading ? "Mengirim OTP..." : <>Verifikasi Sekarang &rarr;</>}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
        .status-card {
           display: inline-flex;
           align-items: flex-start;
           gap: 1rem;
           padding: 1.25rem;
           border-radius: 16px;
           width: 100%;
           max-width: 400px;
           box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
           border: 1px solid;
           background: white;
           transition: transform 0.2s;
           margin-top: 1rem;
        }

        .status-verified {
           background: #f0fdf4; /* Green-50 */
           border-color: #bbf7d0;
        }

        .status-unverified {
           background: #fef2f2; /* Red-50 */
           border-color: #fca5a5;
        }

        .status-icon {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 48px; 
           height: 48px;
           border-radius: 12px;
           flex-shrink: 0;
        }
        
        .icon-verified { background: #dcfce7; color: #16a34a; }
        .icon-unverified { background: #fee2e2; color: #dc2626; }

        .status-content {
           display: flex;
           flex-direction: column;
           flex: 1;
        }

        .status-label {
           font-size: 0.75rem;
           font-weight: 700;
           letter-spacing: 0.05em;
           color: #64748b;
           margin-bottom: 0.25rem;
           text-transform: uppercase;
        }

        .status-value {
           font-size: 1.25rem;
           font-weight: 800;
           margin: 0;
           line-height: 1.2;
        }
        
        .status-verified .status-value { color: #15803d; }
        .status-unverified .status-value { color: #b91c1c; }
        
        .verify-now-btn {
           margin-top: 0.75rem;
           background: #dc2626;
           color: white;
           border: none;
           padding: 0.5rem 1rem;
           border-radius: 8px;
           font-size: 0.875rem;
           font-weight: 600;
           cursor: pointer;
           width: fit-content;
           display: inline-flex;
           align-items: center;
           gap: 0.5rem;
           transition: background 0.2s;
           box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }
        .verify-now-btn:hover { background: #b91c1c; }
      `}</style>
        </>
    );
}
