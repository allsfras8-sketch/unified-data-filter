import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, scope } from "@/lib/db";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { downloadTemplate, mapRows, parseCsv, type ImportColumn } from "@/lib/import";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";

/** Turns a text value into a foreign-key id by looking it up in another table. */
export type Lookup = {
  /** Column in the CSV that carries the human value. */
  key: string;
  /** Column in the app table that receives the resolved id. */
  target: string;
  table: string;
  /** Columns searched for a match, in order. */
  matchOn: string[];
};

type Props = {
  table: string;
  title: string;
  columns: ImportColumn[];
  lookups?: Lookup[] | undefined;
};

export function ImportDialog({ table, title, columns, lookups = [] }: Props) {
  const { t, dir } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [skipInvalid, setSkipInvalid] = useState(true);

  async function handleFile(file: File) {
    setBusy(true);
    setErrors([]);
    try {
      const text = await file.text();
      const parsed = mapRows(parseCsv(text), columns);
      const rowErrors = parsed.errors.map((e) => `${t("صف")} ${e.line}: ${e.message}`);

      if (parsed.errors.length && !skipInvalid) {
        setErrors(rowErrors);
        return;
      }
      if (parsed.rows.length === 0) {
        setErrors(rowErrors.length ? rowErrors : [t("الملف فارغ أو غير صالح")]);
        return;
      }

      // Resolve reference columns against data belonging to the active company.
      const resolved: Record<string, Record<string, string>> = {};
      for (const lk of lookups) {
        const { data } = await scope(db.from(lk.table).select(["id", ...lk.matchOn].join(",")), me?.tenantId);
        const map: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data ?? []).forEach((r: any) => {
          lk.matchOn.forEach((c) => {
            if (r[c]) map[String(r[c]).trim()] = r.id;
          });
        });
        resolved[lk.key] = map;
      }

      const payload: Record<string, unknown>[] = [];
      const unresolved: string[] = [];
      parsed.rows.forEach((row, i) => {
        const record: Record<string, unknown> = { ...row, tenant_id: me?.tenantId };
        let ok = true;
        for (const lk of lookups) {
          const raw = row[lk.key];
          delete record[lk.key];
          if (raw === null || raw === undefined || raw === "") continue;
          const id = resolved[lk.key]?.[String(raw).trim()];
          if (!id) {
            ok = false;
            unresolved.push(`${t("صف")} ${i + 2}: «${String(raw)}» غير موجود`);
            continue;
          }
          record[lk.target] = id;
        }
        if (ok || skipInvalid) payload.push(record);
      });

      if (unresolved.length && !skipInvalid) {
        setErrors([...rowErrors, ...unresolved]);
        return;
      }
      if (payload.length === 0) {
        setErrors([...rowErrors, ...unresolved]);
        return;
      }

      const { error } = await db.from(table).insert(payload);
      if (error) throw new Error(error.message);

      toast.success(`${t("تم استيراد")} ${payload.length} ${t("سجل")}`);
      qc.invalidateQueries({ queryKey: [table] });
      const remaining = [...rowErrors, ...unresolved];
      if (remaining.length) setErrors(remaining);
      else setOpen(false);
    } catch (err) {
      setErrors([(err as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        {t("استيراد من إكسل")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("استيراد بيانات")} — {title}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {t("اختر ملف CSV أو Excel (محفوظ بصيغة CSV) بنفس أعمدة القالب")}
          </p>

          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <div className="mb-1 font-semibold">{t("الأعمدة المطلوبة")}</div>
            <div className="flex flex-wrap gap-1">
              {columns.map((c) => (
                <span key={c.key} className="rounded bg-background px-2 py-0.5">
                  {c.label}
                  {c.required ? " *" : ""}
                </span>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={() => downloadTemplate(title, columns)}>
            <Download className="size-4" />
            {t("تحميل القالب")}
          </Button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={skipInvalid}
              onChange={(e) => setSkipInvalid(e.target.checked)}
            />
            {t("تجاهل الصفوف غير الصالحة والمتابعة")}
          </label>

          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-2 file:text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {errors.map((er, i) => (
                <div key={i}>{er}</div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("إلغاء")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
