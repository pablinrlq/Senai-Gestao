"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (
            data.user?.tipo_usuario === "administrador" ||
            data.user?.tipo_usuario === "funcionario"
          ) {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/auth/login");
        });
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}
