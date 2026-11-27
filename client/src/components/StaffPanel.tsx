import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import type {
  AuditEventDto,
  CreateStaffRequest,
  ShopRole,
  StaffMemberDto,
} from "@mizan/shared";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { STAFF_TEXT } from "../i18n/staffText";
import { apiRequest } from "../lib/api";
import { formatShortDate } from "../lib/format";

const ASSIGNABLE_ROLES: Exclude<ShopRole, "OWNER">[] = [
  "MANAGER",
  "CASHIER",
  "INVENTORY",
  "ACCOUNTANT",
];

export function StaffPanel() {
  const { language } = useLanguage();
  const { can } = useAuth();
  const text = STAFF_TEXT[language];
  const queryClient = useQueryClient();
  const canManage = can("manage_staff");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<ShopRole, "OWNER">>("CASHIER");

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiRequest<StaffMemberDto[]>("/staff"),
  });
  const auditQuery = useQuery({
    queryKey: ["staff-audit"],
    queryFn: () => apiRequest<AuditEventDto[]>("/staff/audit"),
    enabled: can("view_audit") || canManage,
  });

  const resetForm = () => {
    setShowForm(false);
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setRole("CASHIER");
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateStaffRequest) =>
      apiRequest<StaffMemberDto>("/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-audit"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { role?: Exclude<ShopRole, "OWNER">; status?: "ACTIVE" | "DISABLED" };
    }) =>
      apiRequest<StaffMemberDto>(`/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-audit"] });
    },
  });

  const members = staffQuery.data ?? [];
  const events = auditQuery.data ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{text.title}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{text.hint}</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              {text.add}
            </button>
          )}
        </div>

        {canManage && showForm && (
          <form
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                password,
                role,
              });
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={text.name}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={text.phone}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={text.email}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={text.password}
                required
                minLength={6}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<ShopRole, "OWNER">)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {ASSIGNABLE_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {text.roles[item]}
                  </option>
                ))}
              </select>
            </div>
            {createMutation.error instanceof Error && (
              <p className="text-xs text-rose-600">{createMutation.error.message}</p>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {text.save}
            </button>
          </form>
        )}

        {staffQuery.isLoading ? (
          <p className="text-xs text-slate-400">…</p>
        ) : members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            {text.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {member.phone || member.email || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {member.role === "OWNER" || !canManage ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {member.role === "OWNER" ? text.ownerRole : text.roles[member.role]}
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: member.id,
                          body: { role: e.target.value as Exclude<ShopRole, "OWNER"> },
                        })
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold"
                    >
                      {ASSIGNABLE_ROLES.map((item) => (
                        <option key={item} value={item}>
                          {text.roles[item]}
                        </option>
                      ))}
                    </select>
                  )}
                  <span
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      member.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {text.status[member.status]}
                  </span>
                  {canManage && member.role !== "OWNER" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: member.id,
                          body: { status: member.status === "ACTIVE" ? "DISABLED" : "ACTIVE" },
                        })
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {member.status === "ACTIVE" ? text.disable : text.enable}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {updateMutation.error instanceof Error && (
          <p className="text-xs text-rose-600">{updateMutation.error.message}</p>
        )}
      </div>

      <div className="lg:col-span-2">
        <h3 className="text-sm font-bold text-slate-800">{text.auditTitle}</h3>
        {events.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
            {text.emptyAudit}
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-slate-800">{event.summary}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {event.actorName} · {formatShortDate(event.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
