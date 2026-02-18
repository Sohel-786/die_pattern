"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    X, Save, User as UserIcon, Lock,
    Mail, Phone, Shield, Camera,
    UserCheck
} from "lucide-react";
import api from "@/lib/api";
import { User, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface UserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export function UserDialog({ isOpen, onClose, user }: UserDialogProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: Role.USER,
        mobileNumber: "",
        isActive: true
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                password: "", // Keep password empty on edit
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                mobileNumber: user.mobileNumber || "",
                isActive: user.isActive
            });
        } else {
            setFormData({
                username: "",
                password: "",
                firstName: "",
                lastName: "",
                role: Role.USER,
                mobileNumber: "",
                isActive: true
            });
        }
    }, [user, isOpen]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            if (user) return api.put(`/users/${user.id}`, data);
            return api.post("/users", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success(user ? "Identity updated" : "operative provisioned");
            onClose();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Operation failed")
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title=""
            hideHeader
            size="lg"
            className="rounded-[3.5rem] bg-white border-none shadow-2xl overflow-hidden p-0"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full -m-6">
                <div className="bg-gray-900 p-12 relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">
                                {user ? "Modify Identity" : "New Operative"}
                            </h2>
                            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">System Authorization Protocol</p>
                        </div>
                    </div>
                    <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-primary-600/20 rounded-full blur-3xl" />
                </div>

                <div className="p-12 space-y-10 bg-white">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UserIcon className="w-3 h-3" /> First Name
                            </label>
                            <Input
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner"
                                placeholder="e.g. John"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UserIcon className="w-3 h-3" /> Last Name
                            </label>
                            <Input
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner"
                                placeholder="e.g. Wick"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Lock className="w-3 h-3" /> System Alias (Username)
                        </label>
                        <Input
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner"
                            placeholder="e.g. j.wick"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Tactical Role
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                                className="w-full h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner appearance-none outline-none cursor-pointer"
                            >
                                <option value={Role.USER}>Standard Operative</option>
                                <option value={Role.MANAGER}>District Manager</option>
                                <option value={Role.ADMIN}>System Overseer</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Lock className="w-3 h-3" /> {user ? "Secret Key (Leave blank to keep)" : "Provision Secret Key"}
                            </label>
                            <Input
                                type="password"
                                required={!user}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner"
                                placeholder="Minimum 8 characters"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Secure Contact (Mobile)
                        </label>
                        <Input
                            value={formData.mobileNumber}
                            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                            className="h-16 rounded-[1.5rem] bg-secondary-50 border-none px-6 font-bold text-lg focus:bg-white transition-all shadow-inner"
                            placeholder="e.g. 9876543210"
                        />
                    </div>

                    <div className="pt-8 flex justify-end gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="h-16 px-8 rounded-2xl font-black text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                            Cancel
                        </Button>
                        <Button
                            disabled={mutation.isPending}
                            className="h-16 px-12 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black shadow-xl shadow-primary/30 flex items-center gap-3 transition-all active:scale-95"
                        >
                            <Save className="w-5 h-5" />
                            {mutation.isPending ? "AUTHORIZING..." : (user ? "UPDATE IDENTITY" : "CONFIRM PROVISIONING")}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
}
