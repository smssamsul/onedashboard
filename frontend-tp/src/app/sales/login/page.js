'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ✅ FIX: Pisahkan komponen yang menggunakan useSearchParams untuk Suspense boundary
function AdminLoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Ambil semua query params dan forward ke /login
    // Ini memastikan query seperti ?unauthorized=true tetap di-forward
    const params = searchParams.toString();
    const redirectUrl = params ? `/login?${params}` : '/login';
    
    // Use replace untuk menghindari history stack
    router.replace(redirectUrl);
  }, [router, searchParams]);

  // Return loading state instead of null for better UX
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      fontSize: '14px',
      color: '#666'
    }}>
      Redirecting to login...
    </div>
  );
}

// ✅ FIX: Wrap dengan Suspense untuk useSearchParams (Next.js requirement)
export default function AdminLoginRedirect() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    }>
      <AdminLoginRedirectContent />
    </Suspense>
  );
}

