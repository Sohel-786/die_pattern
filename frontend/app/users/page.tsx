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
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-600" />
                        Access Management
                    </h1>
                    <p className="text-secondary-600">Govern digital identities and granular system reach</p>
                </motion.div>

                <Button
                    onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}
                    size="sm"
                    className="h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white shadow-md flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Provision New Identity
                </Button>
            </div>

            <Card className="shadow-sm border-secondary-100">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 w-4 h-4" />
                            <Input
                                placeholder="Search operatives by name or alias..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10 border-secondary-200 focus-visible:ring-primary-500 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-secondary-100 overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-secondary-100 bg-primary-50">
                                        <th className="px-6 py-4 font-bold text-primary-900 w-20">
                                            SR. NO.
                                        </th>
                                        <th className="px-6 py-4 font-bold text-primary-900 uppercase tracking-wider">
                                            Operative
                                        </th>
                                        <th className="px-6 py-4 font-bold text-primary-900 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 font-bold text-primary-900 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-4 font-bold text-primary-900 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 font-bold text-primary-900 text-right uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-50">
                                    {filteredUsers.map((user, idx) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="hover:bg-secondary-50/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4 text-secondary-500 font-medium">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-secondary-100 flex items-center justify-center overflow-hidden border border-secondary-200">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-bold text-secondary-500">{user.firstName[0]}{user.lastName[0]}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-secondary-900">{user.firstName} {user.lastName}</div>
                                                        <div className="text-xs text-secondary-500 font-medium">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.role === Role.ADMIN ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    user.role === Role.MANAGER ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-secondary-600 font-medium">
                                                {user.mobileNumber || "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${user.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-secondary-100 text-secondary-600 border border-secondary-200'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(user)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                        title="Edit Operative"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePermissions(user)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Security Clearance"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </Button>
                                                    {user.username.toLowerCase() !== 'qc_admin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => deleteMutation.mutate(user.id)}
                                                            className="h-8 w-8 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Revoke Identity"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-20 px-4">
                            <div className="h-16 w-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary-300">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-secondary-900 mb-1">No Operatives Found</h3>
                            <p className="text-secondary-500 max-w-md mx-auto">
                                Check your search filters or provision a new digital identity for the system.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

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
