import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { can, useMe, type Me } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { exportCsv, printPage } from "@/lib/export";
import type { ImportColumn } from "@/lib/import";
import { ImportDialog, type Lookup } from "@/components/ImportDialog";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import {
  DataFilters,
  applyFilters,
  useDataFilters,
  type FacetConfig,
} from "@/components/DataFilters";

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "ref" | "textarea" | "checkbox";
  options?: { value: string; label: string }[];
  refTable?: string;
  refLabel?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  hideInTable?: boolean;
  hideInForm?: boolean;
  digits?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (row: any) => string;
};

type Props = {
  table: string;
  module: string;
  title: string;
  subtitle?: string;
  fields: CrudField[];
  orderBy?: string;
  ascending?: boolean;
  /** When provided, a bulk "Import from Excel/CSV" button appears. */
  importColumns?: ImportColumn[];
  importLookups?: Lookup[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraRowAction?: (row: any) => React.ReactNode;
  /** Field key holding the row date; enables the date-range engine. */
  dateKey?: string;
  /** Field keys exposed as multi-select faceted filters. */
  facetKeys?: string[];
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cellValue(field: CrudField, row: any, refMaps: Record<string, Record<string, string>>) {
  if (field.render) return field.render(row);
  const v = row[field.key];
  if (v === null || v === undefined || v === "") return "—";
  if (field.type === "ref") return refMaps[field.key]?.[v] ?? "—";
  if (field.type === "select") return field.options?.find((o) => o.value === String(v))?.label ?? String(v);
  if (field.type === "number") return fmtNum(v, field.digits ?? 2);
  if (field.type === "date") return fmtDate(v);
  if (field.type === "checkbox") return v ? "نعم" : "لا";
  return String(v);
}

export function CrudPage(props: Props) {
  const { table, module, title, subtitle, fields, orderBy = "created_at", ascending = false } = props;
  const { data: me } = useMe();
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>({});
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [filters, setFilters] = useDataFilters();

  // Every read is explicitly scoped to the active company on top of RLS.
  const tenantId = me?.tenantId ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoped = (q: any) => (tenantId ? q.eq("tenant_id", tenantId) : q);

  const rowsQuery = useQuery({
    queryKey: [table, tenantId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scoped(db.from(table).select("*")).order(orderBy, { ascending });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refFields = fields.filter((f) => f.type === "ref" && f.refTable);
  const refQueries = useQuery({
    queryKey: ["refs", table, refFields.map((f) => f.refTable).join(","), tenantId],
    enabled: !!me && refFields.length > 0,
    queryFn: async () => {
      const out: Record<string, { value: string; label: string }[]> = {};
      for (const f of refFields) {
        const { data } = await scoped(db.from(f.refTable!).select(`id, ${f.refLabel ?? "name"}`)).order(
          f.refLabel ?? "name",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        out[f.key] = (data ?? []).map((r: any) => ({ value: r.id, label: r[f.refLabel ?? "name"] }));
      }
      return out;
    },
  });


  const refMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    Object.entries(refQueries.data ?? {}).forEach(([k, list]) => {
      maps[k] = Object.fromEntries(list.map((o) => [o.value, o.label]));
    });
    return maps;
  }, [refQueries.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {};
      for (const f of fields) {
        if (f.hideInForm) continue;
        let v = form[f.key];
        if (v === "" || v === undefined) v = null;
        if (f.type === "number" && v !== null) v = Number(v);
        payload[f.key] = v;
      }
      if (editing) {
        const { error } = await scoped(db.from(table).update(payload).eq("id", editing.id));
        if (error) throw error;
      } else {
        const { error } = await db.from(table).insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? t("تم حفظ التعديلات") : t("تمت الإضافة بنجاح"));
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await scoped(db.from(table).delete().eq("id", id));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم الحذف"));
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) => {
      setToDelete(null);
      toast.error(e.message, { duration: 8000 });
    },
  });


  function openNew() {
    setEditing(null);
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) init[f.key] = f.defaultValue;
    });
    setForm(init);
    setOpen(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(row: any) {
    setEditing(row);
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      init[f.key] = row[f.key] ?? "";
    });
    setForm(init);
    setOpen(true);
  }

  const tableFields = fields.filter((f) => !f.hideInTable);

  // Contextual facets are derived from the field definitions of this view.
  const facetConfigs: FacetConfig[] = (props.facetKeys ?? [])
    .map((key) => {
      const f = fields.find((x) => x.key === key);
      if (!f) return null;
      const options =
        f.type === "ref"
          ? (refQueries.data?.[key] ?? []).map((o) => ({ value: o.value, label: o.label }))
          : (f.options ?? []).map((o) => ({ value: o.value, label: t(o.label) }));
      return { key, label: t(f.label), options };
    })
    .filter((x): x is FacetConfig => x !== null);

  const rows = applyFilters(rowsQuery.data ?? [], filters, {
    dateKey: props.dateKey,
    searchText: (r) => tableFields.map((f) => String(cellValue(f, r, refMaps))).join(" "),
  });

  const allowCreate = can(me as Me, module, "create");
  const allowEdit = can(me as Me, module, "edit");
  const allowDelete = can(me as Me, module, "delete");

  return (
    <div>
      <PageHeader
        title={t(title)}
        subtitle={subtitle}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                exportCsv(
                  title,
                  tableFields.map((f) => ({ key: f.key, label: f.label })),
                  rows.map((r: Record<string, unknown>) =>
                    Object.fromEntries(tableFields.map((f) => [f.key, cellValue(f, r, refMaps)])),
                  ),
                )
              }
            >
              <Download className="size-4" />
              {t("تصدير إلى إكسل")}
            </Button>
            {props.importColumns && allowCreate && (
              <ImportDialog
                table={table}
                title={title}
                columns={props.importColumns}
                lookups={props.importLookups}
              />
            )}
            <Button variant="outline" onClick={printPage}>
              <Printer className="size-4" />
              {t("طباعة")}
            </Button>
            {allowCreate && (
              <Button onClick={openNew}>
                <Plus className="size-4" />
                {t("إضافة")}
              </Button>
            )}
          </>
        }
      />

      <DataFilters
        filters={filters}
        onChange={setFilters}
        facets={facetConfigs}
        showDate={!!props.dateKey}
        searchPlaceholder={t("بحث...")}
      />



      <div className="print-area overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              {tableFields.map((f) => (
                <th key={f.key} className="whitespace-nowrap px-3 py-2 text-start font-semibold">
                  {t(f.label)}
                </th>
              ))}
              <th className="no-print px-3 py-2 text-start font-semibold">{t("إجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {rowsQuery.isLoading && (
              <tr>
                <td colSpan={tableFields.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                  {t("جارٍ التحميل...")}
                </td>
              </tr>
            )}
            {!rowsQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={tableFields.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                  {t("لا توجد بيانات")}
                </td>
              </tr>
            )}

            {rows.map((row: Record<string, unknown>) => (
              <tr key={String(row["id"])} className="border-t hover:bg-muted/40">
                {tableFields.map((f) => (
                  <td key={f.key} className="whitespace-nowrap px-3 py-2">
                    {cellValue(f, row, refMaps)}
                  </td>
                ))}
                <td className="no-print whitespace-nowrap px-3 py-2">
                  <div className="flex gap-1">
                    {props.extraRowAction?.(row)}
                    {allowEdit && (
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)} title={t("تعديل")}>
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {allowDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setToDelete(String(row["id"]))}
                        title={t("حذف")}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `${t("تعديل")} - ${t(title)}` : `${t("إضافة")} - ${t(title)}`}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            {fields
              .filter((f) => !f.hideInForm)
              .map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{t(f.label)}</Label>
                  {f.type === "select" || f.type === "ref" ? (
                    <select
                      id={f.key}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={String(form[f.key] ?? "")}
                      required={f.required}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    >
                      <option value="">{t("— اختر —")}</option>
                      {(f.type === "ref" ? (refQueries.data?.[f.key] ?? []) : (f.options ?? [])).map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(o.label)}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={f.key}
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  ) : f.type === "checkbox" ? (
                    <input
                      id={f.key}
                      type="checkbox"
                      className="size-5 align-middle"
                      checked={!!form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    />
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      step="any"
                      required={f.required}
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("إلغاء")}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("تأكيد الحذف")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("إلغاء")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deleteMutation.mutate(toDelete)}>
              {t("حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
