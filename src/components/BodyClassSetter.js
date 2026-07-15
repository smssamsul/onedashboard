'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function BodyClassSetter() {
  const pathname = usePathname();

  useEffect(() => {
    // kosongkan kelas lama (lebih aman)
    document.body.classList.remove('body-login', 'body-default', 'body-other');

    // atur sesuai route; karena login ada di '/', cek pathname === '/'
    if (pathname === '/' || pathname === '/admin/login') {
      document.body.classList.add('body-login');
    } else {
      document.body.classList.add('body-default');
    }

    // optional: cleanup saat unmount (nggak wajib)
    return () => {
      document.body.classList.remove('body-login', 'body-default', 'body-other');
    };
  }, [pathname]);

  return null; // ga render apa-apa
}
