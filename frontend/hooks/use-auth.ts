import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

export function useLogin() {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post("/auth/login", data);
            return response.data;
        },
        onSuccess: (data) => {
            localStorage.setItem("user", JSON.stringify(data.user));
            queryClient.setQueryData(["user"], data.user);
            toast.success(`Welcome back, ${data.user.firstName}!`);
            router.push("/dashboard");
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || "Login failed";
            toast.error(message);
        },
    });
}

export function useLogout() {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await api.post("/auth/logout");
        },
        onSuccess: () => {
            localStorage.removeItem("user");
            queryClient.clear();
            router.push("/login");
            toast.success("Logged out successfully");
        },
    });
}
