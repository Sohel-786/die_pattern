import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

export function useMasters(endpoint: string, queryKey: string) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            const response = await api.get(endpoint);
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post(endpoint, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success("Created successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Creation failed");
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const response = await api.put(`${endpoint}/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success("Updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Update failed");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await api.delete(`${endpoint}/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            toast.success("Deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Delete failed");
        },
    });

    return {
        query,
        createMutation,
        updateMutation,
        deleteMutation,
    };
}
