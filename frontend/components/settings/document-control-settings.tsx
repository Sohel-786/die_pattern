"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Check, Trash2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { DocumentControlDto, DocumentType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { format, parseISO, isValid } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.PurchaseIndent]: "Purchase Indent",
  [DocumentType.PurchaseOrder]: "Purchase Order",
  [DocumentType.JobWork]: "Job Work",
  [DocumentType.TransferEntry]: "Transfer Entry",
};

export function DocumentControlSettings() {
  const queryClient = useQueryClient();
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentType>(DocumentType.PurchaseIndent);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentControlDto | null>(null);
  const [formDocumentNo, setFormDocumentNo] = useState("");
  const [formRevisionNo, setFormRevisionNo] = useState("");
  const [formRevisionDate, setFormRevisionDate] = useState("");

  const { data: list = [], isLoading } = useQuery<DocumentControlDto[]>({
    queryKey: ["document-controls", documentTypeFilter],
    queryFn: async () => {
      const res = await api.get("/document-controls", { params: { documentType: documentTypeFilter } });
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: { documentType: DocumentType; documentNo: string; revisionNo: string; revisionDate: string }) =>
      api.post("/document-controls", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-controls"] });
      toast.success("Revision created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { documentNo: string; revisionNo: string; revisionDate: string } }) =>
      api.put(`/document-controls/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-controls"] });
      toast.success("Revision updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to update"),
  });

  const applyMutation = useMutation({
    mutationFn: (id: number) => api.post(`/document-controls/${id}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-controls"] });
      toast.success("This revision is now applied. New documents will use it.");
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to apply"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/document-controls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-controls"] });
      toast.success("Revision removed");
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? "Failed to delete"),
  });

  function resetForm() {
    setFormDocumentNo("");
    setFormRevisionNo("");
    setFormRevisionDate("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setFormRevisionDate(format(new Date(), "yyyy-MM-dd"));
    setDialogOpen(true);
  }

  function openEdit(row: DocumentControlDto) {
    setEditing(row);
    setFormDocumentNo(row.documentNo);
    setFormRevisionNo(row.revisionNo);
    setFormRevisionDate(row.revisionDate ? format(new Date(row.revisionDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formDocumentNo.trim() || !formRevisionNo.trim() || !formRevisionDate) {
      toast.error("Document No, Revision No and Revision Date are required.");
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: { documentNo: formDocumentNo.trim(), revisionNo: formRevisionNo.trim(), revisionDate: formRevisionDate },
      });
    } else {
      createMutation.mutate({
        documentType: documentTypeFilter,
        documentNo: formDocumentNo.trim(),
        revisionNo: formRevisionNo.trim(),
        revisionDate: formRevisionDate,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold text-gray-700">Document type</Label>
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(Number(e.target.value) as DocumentType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {(Object.keys(DOCUMENT_TYPE_LABELS) as unknown as DocumentType[]).map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} className="bg-primary-600 hover:bg-primary-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Add revision
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No revisions for this document type. Add one to use in print formats.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Document No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Revision No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Revision Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 w-24">Applied</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 font-medium text-gray-900">{row.documentNo}</td>
                  <td className="py-2.5 px-4 text-gray-700">{row.revisionNo}</td>
                  <td className="py-2.5 px-4 text-gray-700">
                    {row.revisionDate ? format(new Date(row.revisionDate), "dd-MMM-yyyy") : "-"}
                  </td>
                  <td className="py-2.5 px-4">
                    {row.isApplied ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                        <Check className="w-4 h-4" /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!row.isApplied && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyMutation.mutate(row.id)}
                        disabled={applyMutation.isPending}
                        className="text-primary-600 hover:bg-primary-50 gap-1 mr-1"
                      >
                        {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Apply
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(row)}
                      className="text-gray-600 hover:bg-gray-100 gap-1 mr-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Remove this revision? It cannot be undone.")) deleteMutation.mutate(row.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Only one revision can be applied at a time per document type. New purchase indents (after approval) will use the applied revision. Existing indents keep their revision.
      </p>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); resetForm(); }}
        title={editing ? "Edit revision" : "Add revision"}
        size="md"
      >
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-semibold text-gray-700">Document No</Label>
            <Input
              value={formDocumentNo}
              onChange={(e) => setFormDocumentNo(e.target.value)}
              placeholder="e.g. PI-FORM-01"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Revision No</Label>
            <Input
              value={formRevisionNo}
              onChange={(e) => setFormRevisionNo(e.target.value)}
              placeholder="e.g. 1"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Revision Date</Label>
            <div className="mt-1">
              <DatePicker
                value={formRevisionDate ? (isValid(parseISO(formRevisionDate)) ? parseISO(formRevisionDate) : undefined) : undefined}
                onChange={(date) => setFormRevisionDate(date ? format(date, "yyyy-MM-dd") : "")}
                placeholder="Pick revision date"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formDocumentNo.trim() || !formRevisionNo.trim() || !formRevisionDate}
              className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
