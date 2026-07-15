import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { loginCustomer } from "@/lib/customerAuth";

export function useCustomerLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const result = await loginCustomer(payload);
        if (result.success) {
          // Navigate to dashboard (Home)
          router.replace("/customer/dashboard");
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        const message = err?.message || "Login gagal.";
        setError(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  return { login, loading, error };
}

