"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Users, UserPlus, Shield,
    Search, MoreVertical, ShieldCheck, ShieldAlert,
    Trash2, Edit3, Key, Mail, Phone, Lock
} from "lucide-react";
import api from "@/lib/api";
import { User, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { UserDialog } from "@/components/users/user-dialog";
import { PermissionDialog } from "@/components/users/permission-dialog";

export default function UsersPage() {
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await api.get("/users");
            return res.data.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Identity revoked successfully");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Purge failed")
    });

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsUserDialogOpen(true);
    };

    const handlePermissions = (user: User) => {
        setSelectedUser(user);
        setIsPermissionDialogOpen(true);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.firstName.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <Users className="w-10 h-10 text-primary-600" />
                        Access Management
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold text-lg">Govern digital identities and granular system reach</p>
                </motion.div>

                <Button
                    onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}
                    className="h-16 px-8 rounded-[2rem] bg-gray-900 hover:bg-black text-white shadow-2xl shadow-gray-900/20 flex items-center gap-4 transition-all active:scale-95 group"
                >
                    <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="font-black text-lg">Provision New Identity</span>
                </Button>
            </div>

            <div className="relative max-w-2xl bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                    placeholder="Search operatives by name or alias..."
                    className="pl-16 h-16 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold placeholder:text-gray-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence>
                    {filteredUsers.map((user, idx) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group"
                        >
                            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-primary-600/10 transition-all relative overflow-hidden flex flex-col h-full">
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-secondary-50 to-gray-100 border-2 border-white shadow-inner flex items-center justify-center relative overflow-hidden">
                                        {user.avatar ? (
                                            <img src={user.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-black text-gray-300">{user.firstName[0]}{user.lastName[0]}</span>
                                        )}
                                        <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${user.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(user)}
                                            className="h-12 w-12 rounded-2xl bg-secondary-50 hover:bg-primary-50 hover:text-primary-600 transition-all"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handlePermissions(user)}
                                            className="h-12 w-12 rounded-2xl bg-secondary-50 hover:bg-amber-50 hover:text-amber-600 transition-all"
                                        >
                                            <Shield className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-6 flex-1 relative z-10">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{user.firstName} {user.lastName}</h3>
                                        <p className="text-sm font-black text-primary-600/70 uppercase tracking-widest mt-1">@{user.username}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${user.role === Role.ADMIN ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                            user.role === Role.MANAGER ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                                                'bg-emerald-50 text-emerald-500 border-emerald-100'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                            <Phone className="w-4 h-4" />
                                            <span>{user.mobileNumber || "No contact linked"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                            <Lock className="w-4 h-4" />
                                            <span>Role-Based Encryption Active</span>
                                        </div>
                                    </div>
                                </div>

                                {user.username.toLowerCase() !== 'qc_admin' && (
                                    <div className="mt-10 pt-8 border-t border-gray-50 flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                                        <Button
                                            variant="ghost"
                                            onClick={() => deleteMutation.mutate(user.id)}
                                            className="text-rose-500 hover:bg-rose-50 font-black gap-2 h-12 rounded-2xl"
                                        >
                                            <Trash2 className="w-4 h-4" /> Revoke Access
                                        </Button>
                                    </div>
                                )}

                                <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-secondary-50/50 rounded-full blur-3xl group-hover:bg-primary-50/50 transition-all" />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <UserDialog
                isOpen={isUserDialogOpen}
                onClose={() => { setIsUserDialogOpen(false); setSelectedUser(null); }}
                user={selectedUser}
            />

            {selectedUser && (
                <PermissionDialog
                    isOpen={isPermissionDialogOpen}
                    onClose={() => { setIsPermissionDialogOpen(false); setSelectedUser(null); }}
                    userId={selectedUser.id}
                    userName={selectedUser.username}
                />
            )}
        </div>
    );
}
