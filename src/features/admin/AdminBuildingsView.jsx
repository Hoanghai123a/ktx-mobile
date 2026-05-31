import React, { useEffect, useMemo, useState } from "react";
import { Building2, Eye, KeyRound, Pencil, Plus, Save, Settings, ShieldCheck, Trash2, Users, X } from "lucide-react";
import Pill from "../../components/ui/Pill";
import TextField from "../../components/ui/TextField";
import SelectField from "../../components/ui/SelectField";
import { formatDate } from "../../services/dateFormat";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const emptyDraft = () => ({
  code: "",
  name: "",
  owner_id: "",
  start_date: today(),
  end_date: nextYear(),
  public_view: false,
});

const emptyUserDraft = () => ({
  username: "",
  name: "",
  role: "user",
  password: "",
});

function userLabel(user) {
  return user?.username || user?.name || user?.email || user?.id || "-";
}

export default function AdminBuildingsView({
  buildings = [],
  users = [],
  authSettings = { require_approval: true },
  settings = {},
  selectedBuildingId,
  setSelectedBuildingId,
  members = [],
  actions,
}) {
  const [page, setPage] = useState("buildings");
  const [draft, setDraft] = useState(emptyDraft);
  const [editId, setEditId] = useState("");
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [userDraft, setUserDraft] = useState(emptyUserDraft);
  const [memberDraft, setMemberDraft] = useState({ user_id: "", role: "manager" });
  const [contactDraft, setContactDraft] = useState(settings.adminContact || {});

  useEffect(() => {
    setContactDraft(settings.adminContact || {});
  }, [settings.adminContact]);

  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const current = buildings.find((b) => b.id === selectedBuildingId) || buildings[0] || null;
  const editingUser = editingUserId ? byId.get(editingUserId) : null;
  const editingSystemAdmin = editingUser?.role === "admin";
  const userOptions = useMemo(
    () => [
      { value: "", label: "Chọn người dùng" },
      ...users.map((u) => ({ value: u.id, label: userLabel(u) })),
    ],
    [users],
  );

  function resetDraft() {
    setEditId("");
    setDraft(emptyDraft());
    setShowBuildingForm(false);
  }

  function startCreateBuilding() {
    setEditId("");
    setDraft(emptyDraft());
    setShowBuildingForm(true);
  }

  function editBuilding(building) {
    setSelectedBuildingId(building.id);
    setEditId(building.id);
    setShowBuildingForm(true);
    setDraft({
      code: building.code || "",
      name: building.name || "",
      owner_id: building.owner_id || "",
      start_date: building.start_date || today(),
      end_date: building.end_date || nextYear(),
      public_view: !!building.public_view,
    });
  }

  function openPermissions(building) {
    setSelectedBuildingId(building.id);
    setMemberDraft({ user_id: "", role: "manager" });
    setShowPermissions(true);
  }

  async function saveBuilding() {
    if (!draft.code.trim() || !draft.name.trim()) return alert("Nhập mã và tên tòa nhà.");
    if (editId) await actions.updateBuilding(editId, draft);
    else await actions.createBuilding(draft);
    resetDraft();
  }

  async function addMember() {
    const building_id = selectedBuildingId || current?.id;
    if (!building_id || !memberDraft.user_id) return alert("Chọn tòa nhà và người dùng.");
    await actions.addMember({ building_id, user_id: memberDraft.user_id, role: memberDraft.role, active: true });
    setMemberDraft({ user_id: "", role: "manager" });
  }

  function resetUserDraft() {
    setEditingUserId("");
    setUserDraft(emptyUserDraft());
    setShowUserForm(false);
  }

  function startCreateUser() {
    setEditingUserId("");
    setUserDraft(emptyUserDraft());
    setShowUserForm(true);
  }

  function editUser(user) {
    setEditingUserId(user.id);
    setUserDraft({ username: user.username || "", name: user.name || "", role: user.role || "user", password: "" });
    setShowUserForm(true);
  }

  async function saveAdminContact() {
    const nextSettings = {
      ...settings,
      adminContact: {
        name: contactDraft.name || "",
        phone: contactDraft.phone || "",
        email: contactDraft.email || "",
        zalo: contactDraft.zalo || "",
        note: contactDraft.note || "",
      },
    };
    await actions.updateSettings?.(nextSettings);
    alert("Đã lưu thông tin liên hệ admin.");
  }

  async function saveUser() {
    const payload = { ...userDraft, username: userDraft.username.trim(), name: userDraft.name.trim() };
    if (!payload.username) return alert("Nhập username.");
    if (!editingUserId && !payload.password) return alert("Nhập mật khẩu.");
    if (editingSystemAdmin) payload.role = "admin";
    if (editingUserId && !payload.password) delete payload.password;
    if (!editingUserId) payload.approved = true;
    if (editingUserId) await actions.updateUser?.(editingUserId, payload);
    else await actions.createUser?.(payload);
    resetUserDraft();
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-8">
      <div className="grid grid-cols-3 gap-2 rounded-3xl bg-sky-100 p-1 shadow-sm ring-1 ring-sky-200">
        <button
          className={`rounded-2xl px-2 py-3 text-xs font-semibold transition ${page === "buildings" ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-sky-800"}`}
          onClick={() => setPage("buildings")}
        >
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Building2 className="h-4 w-4" />Tòa nhà</span>
        </button>
        <button
          className={`rounded-2xl px-2 py-3 text-xs font-semibold transition ${page === "users" ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-sky-800"}`}
          onClick={() => setPage("users")}
        >
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Users className="h-4 w-4" />Tài khoản</span>
        </button>
        <button
          className={`rounded-2xl px-2 py-3 text-xs font-semibold transition ${page === "settings" ? "bg-[rgb(44_120_159)] text-white shadow-sm" : "text-sky-800"}`}
          onClick={() => setPage("settings")}
        >
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Settings className="h-4 w-4" />Cài đặt</span>
        </button>
      </div>



      {page === "settings" ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Liên hệ admin</div>
              <div className="mt-1 text-xs text-slate-600">Thông tin này hiển thị tại Tài khoản - Liên hệ admin.</div>
            </div>
            <Pill icon={Settings} text="Admin" tone="sky" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <TextField label="Tên admin phụ trách" value={contactDraft.name || ""} onChange={(v) => setContactDraft((d) => ({ ...d, name: v }))} />
            <TextField label="Số điện thoại" value={contactDraft.phone || ""} onChange={(v) => setContactDraft((d) => ({ ...d, phone: v }))} />
            <TextField label="Email" value={contactDraft.email || ""} onChange={(v) => setContactDraft((d) => ({ ...d, email: v }))} />
            <TextField label="Zalo" value={contactDraft.zalo || ""} onChange={(v) => setContactDraft((d) => ({ ...d, zalo: v }))} placeholder="Số Zalo hoặc link Zalo" />
            <TextField label="Ghi chú hỗ trợ" value={contactDraft.note || ""} onChange={(v) => setContactDraft((d) => ({ ...d, note: v }))} />
            <button className="rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={saveAdminContact}>
              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Save className="h-4 w-4" />Lưu liên hệ admin</span>
            </button>
          </div>
        </section>
      ) : null}

      {page === "users" ? (
      <>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Danh sách tài khoản</div>
            <div className="mt-1 text-xs text-slate-600">Tạo tài khoản, sửa quyền, đổi mật khẩu và xóa tài khoản.</div>
          </div>
          <Pill icon={Users} text={`${users.length} tài khoản`} tone="sky" />
        </div>
        <label className="mt-3 flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm">
          <span className="font-medium text-slate-700">Yêu cầu admin phê duyệt đăng ký</span>
          <input type="checkbox" checked={authSettings.require_approval !== false} onChange={(e) => actions.updateAuthSettings?.(e.target.checked)} />
        </label>
        <button className="mt-3 w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={startCreateUser}>
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Plus className="h-4 w-4" />Tạo mới tài khoản</span>
        </button>
      </section>

      <section className="space-y-2">
        <div className="mt-3 space-y-2">
          {users.length ? users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{userLabel(u)}</div>
                <div className="truncate text-xs text-slate-500">{u.name || u.email || u.id}</div>
                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  {u.role === "admin" ? "Quản trị hệ thống" : u.approved === false ? "Chờ phê duyệt" : "Tài khoản user"}
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-1">
                <button className="rounded-lg bg-sky-50 p-1.5 text-sky-700" onClick={() => editUser(u)} title="Sửa tài khoản"><Pencil className="h-3.5 w-3.5" /></button>
                {u.role !== "admin" && u.approved === false ? (
                  <button className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700" onClick={() => actions.updateUser?.(u.id, { approved: true })} title="Phê duyệt tài khoản"><ShieldCheck className="h-3.5 w-3.5" /></button>
                ) : (
                  <span className="h-6 w-6" />
                )}
                {u.role === "admin" ? (
                  <span className="h-6 w-6" />
                ) : (
                  <button className="rounded-lg bg-violet-50 p-1.5 text-violet-700" onClick={() => actions.updateUser?.(u.id, { role: "admin" })} title="Chuyển thành admin"><ShieldCheck className="h-3.5 w-3.5" /></button>
                )}
                <button className="rounded-lg bg-rose-50 p-1.5 text-rose-600" onClick={() => actions.deleteUser?.(u.id)} title="Xóa tài khoản"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
              Chưa đọc được danh sách user từ PocketBase.
            </div>
          )}
        </div>
      </section>
      </>
      ) : null}

      {page === "buildings" ? (
      <>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Danh sách tòa nhà</div>
            <div className="mt-1 text-xs text-slate-600">Chọn tòa nhà để phân quyền hoặc sửa thông tin.</div>
          </div>
          <Pill icon={Building2} text={`${buildings.length} nhà`} tone="sky" />
        </div>
        <button className="mt-3 w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={startCreateBuilding}>
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Plus className="h-4 w-4" />Tạo mới tòa nhà</span>
        </button>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {buildings.map((b) => {
          const owner = byId.get(b.owner_id);
          const active = b.id === selectedBuildingId;
          return (
            <div key={b.id} className={`rounded-2xl bg-white p-2.5 shadow-sm ring-1 ${active ? "ring-sky-300" : "ring-sky-100"}`}>
              <button className="w-full text-left" onClick={() => openPermissions(b)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{b.code}</div>
                    <div className="mt-0.5 truncate text-xs font-medium text-slate-700">{b.name}</div>
                  </div>
                  <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${b.expired ? "bg-rose-400" : "bg-emerald-400"}`} />
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">Hạn: {formatDate(b.end_date)}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{userLabel(owner) || b.owner_id || "Chưa gán"}</div>
              </button>
              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-medium text-slate-400">{b.public_view ? "Cho xem" : "Riêng tư"}</span>
                <div className="flex shrink-0 gap-1">
                  <button className="rounded-lg bg-sky-50 p-1.5 text-sky-700" onClick={() => editBuilding(b)}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-700" onClick={() => actions.updateBuilding(b.id, { public_view: !b.public_view })}>{b.public_view ? "Ẩn" : "Mở"}</button>
                  <button className="rounded-lg bg-rose-50 p-1.5 text-rose-600" onClick={() => actions.deleteBuilding(b.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!buildings.length ? (
          <div className="col-span-2 rounded-2xl border border-dashed border-sky-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
            Chưa có tòa nhà. Bấm "Tạo mới tòa nhà" để thêm dữ liệu.
          </div>
        ) : null}
      </section>

      </>
      ) : null}

      {showPermissions && current ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowPermissions(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-sky-50 shadow-2xl ring-1 ring-sky-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-900">Phân quyền: {current.code} - {current.name}</div>
                <div className="mt-0.5 text-xs text-slate-600">Gán user xử lý hoặc chỉ xem tòa nhà này.</div>
              </div>
              <button className="rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-sky-100" onClick={() => setShowPermissions(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto px-4 pb-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <div className="grid grid-cols-1 gap-2">
                  <SelectField label="User" value={memberDraft.user_id} onChange={(v) => setMemberDraft((s) => ({ ...s, user_id: v }))} options={userOptions} />
                  <SelectField label="Quyền" value={memberDraft.role} onChange={(v) => setMemberDraft((s) => ({ ...s, role: v }))} options={[{ value: "manager", label: "Được xử lý" }, { value: "viewer", label: "Chỉ xem" }]} />
                  <button className="rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={addMember}>
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><Save className="h-4 w-4" />Gán quyền</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {members.length ? members.map((m) => {
                  const u = byId.get(m.user_id);
                  return (
                    <div key={m.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-sky-100">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{userLabel(u) || m.user_id}</div>
                          <div className="text-xs text-slate-500">{m.active === false ? "Đã tắt quyền" : "Đang có quyền"}</div>
                        </div>
                        <button className="rounded-xl bg-rose-50 p-2 text-rose-600" onClick={() => actions.deleteMember(m.id)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <SelectField label="Quyền" value={m.role || "viewer"} onChange={(v) => actions.updateMember?.(m.id, { role: v })} options={[{ value: "manager", label: "Được xử lý" }, { value: "viewer", label: "Chỉ xem" }]} />
                        <button className="mt-5 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => actions.updateMember?.(m.id, { active: m.active === false })}>
                          {m.active === false ? "Bật quyền" : "Tắt quyền"}
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                    Chưa gán user nào cho tòa nhà này.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showBuildingForm ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={resetDraft} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-sky-50 shadow-2xl ring-1 ring-sky-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{editId ? "Sửa tòa nhà" : "Tạo mới tòa nhà"}</div>
                <div className="mt-0.5 text-xs text-slate-600">Mã, tên, user quản lý, ngày bắt đầu và hết hạn.</div>
              </div>
              <button className="rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-sky-100" onClick={resetDraft}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto px-4 pb-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Mã" value={draft.code} onChange={(v) => setDraft((s) => ({ ...s, code: String(v || "").toUpperCase() }))} placeholder="A01" />
                  <TextField label="Tên" value={draft.name} onChange={(v) => setDraft((s) => ({ ...s, name: v }))} placeholder="Nhà A" />
                  <TextField label="Bắt đầu" type="date" value={draft.start_date} onChange={(v) => setDraft((s) => ({ ...s, start_date: v }))} />
                  <TextField label="Hết hạn" type="date" value={draft.end_date} onChange={(v) => setDraft((s) => ({ ...s, end_date: v }))} />
                  <div className="col-span-2">
                    <SelectField label="User quản lý" value={draft.owner_id} onChange={(v) => setDraft((s) => ({ ...s, owner_id: v }))} options={userOptions} />
                  </div>
                  <label className="col-span-2 flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">User khác được xem</span>
                    <input type="checkbox" checked={draft.public_view} onChange={(e) => setDraft((s) => ({ ...s, public_view: e.target.checked }))} />
                  </label>
                  <button className="rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={saveBuilding}>
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">{editId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editId ? "Lưu thay đổi" : "Tạo tòa nhà"}</span>
                  </button>
                  <button className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" onClick={resetDraft}>
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><X className="h-4 w-4" />Đóng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showUserForm ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={resetUserDraft} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-sky-50 shadow-2xl ring-1 ring-sky-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{editingUserId ? "Sửa tài khoản" : "Tạo mới tài khoản"}</div>
                <div className="mt-0.5 text-xs text-slate-600">Username, tên hiển thị, quyền và mật khẩu.</div>
              </div>
              <button className="rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-sky-100" onClick={resetUserDraft}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto px-4 pb-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <div className="grid grid-cols-1 gap-2">
                  <TextField label="Username" value={userDraft.username} onChange={(v) => setUserDraft((s) => ({ ...s, username: v }))} placeholder="vd: user01" />
                  <TextField label="Tên hiển thị" value={userDraft.name} onChange={(v) => setUserDraft((s) => ({ ...s, name: v }))} placeholder="Nguyễn Văn A" />
                  {editingSystemAdmin ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3">
                      <div className="text-xs font-medium text-slate-600">Quyền hệ thống</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">Admin</div>
                    </div>
                  ) : (
                    <SelectField label="Quyền hệ thống" value={userDraft.role} onChange={(v) => setUserDraft((s) => ({ ...s, role: v }))} options={[{ value: "user", label: "User" }, { value: "admin", label: "Admin" }]} />
                  )}
                  <TextField label={editingUserId ? "Mật khẩu mới" : "Mật khẩu"} value={userDraft.password} onChange={(v) => setUserDraft((s) => ({ ...s, password: v }))} placeholder={editingUserId ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"} type="password" />
                  <button className="rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={saveUser}>
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">{editingUserId ? <KeyRound className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingUserId ? "Lưu tài khoản" : "Tạo tài khoản"}</span>
                  </button>
                  <button className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" onClick={resetUserDraft}>
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><X className="h-4 w-4" />Đóng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
