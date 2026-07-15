// hooks/useUsers.js
import { useEffect, useState } from "react";
import { getUsers } from "@/lib/api";

export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getUsers();
        setUsers(data); // data dari backend
      } catch (err) {
        console.error("Gagal ambil data user:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { users, loading, error };
}
