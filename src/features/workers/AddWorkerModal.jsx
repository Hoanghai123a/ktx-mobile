import React, { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { UserPlus, UserRound } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";

export default function AddWorkerModal({
  open,
  onClose,
  requireAdmin,
  addWorker,
  lookupWorkerByCode,
  existingWorkers = [],
}) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [workerGender, setWorkerGender] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [hometown, setHometown] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [electricityFee, setElectricityFee] = useState(0);
  const [waterFee, setWaterFee] = useState(0);
  const [freeRoomDays, setFreeRoomDays] = useState(0);
  const [note, setNote] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [oldCode, setOldCode] = useState("");
  const [loadingOld, setLoadingOld] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeCode("");
      setFullName("");
      setWorkerGender("");
      setIdentityNumber("");
      setDob("");
      setPhone("");
      setHometown("");
      setRecruiter("");
      setElectricityFee(0);
      setWaterFee(0);
      setFreeRoomDays(0);
      setNote("");
      setShowOld(false);
      setOldCode("");
      setLoadingOld(false);
    }
  }, [open]);

  const normalizedEmployeeCode = useMemo(
    () => (employeeCode || "").trim().toUpperCase(),
    [employeeCode],
  );

  const duplicateInState = useMemo(() => {
    const code = normalizedEmployeeCode;
    if (!code) return false;
    return existingWorkers.some(
      (w) =>
        String(w.employeeCode || "")
          .trim()
          .toUpperCase() === code,
    );
  }, [existingWorkers, normalizedEmployeeCode]);

  return (
    <Modal open={open} title="Thêm NLĐ" onClose={onClose}>
      <div className="space-y-3">
        <TextField
          label="Mã nhân viên"
          value={employeeCode}
          onChange={setEmployeeCode}
          placeholder="VD: NV001"
        />

        {duplicateInState ? (
          <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-rose-100">
            Mã nhân viên đã tồn tại trong danh sách hiện tại.
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setShowOld((v) => !v)}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <UserRound className="h-4 w-4" />
              Người cũ
            </span>
          </button>
        </div>

        {showOld ? (
          <div className="rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-700">
              Nhập mã NV để tải thông tin cũ
            </div>
            <div className="mt-2 space-y-2">
              <TextField
                label="Mã nhân viên"
                value={oldCode}
                onChange={setOldCode}
                placeholder="VD: NV001"
              />
              <button
                className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={loadingOld}
                onClick={() =>
                  requireAdmin(async () => {
                    const code = (oldCode || "").trim().toUpperCase();
                    if (!code) {
                      alert("Vui lòng nhập mã nhân viên.");
                      return;
                    }
                    setLoadingOld(true);
                    try {
                      const found =
                        existingWorkers.find(
                          (w) =>
                            String(w.employeeCode || "")
                              .trim()
                              .toUpperCase() === code,
                        ) || (await lookupWorkerByCode?.(code));

                      if (!found) {
                        alert("Không tìm thấy NLĐ theo mã này.");
                        return;
                      }

                      setEmployeeCode(found.employeeCode || code);
                      setFullName(found.fullName || "");
                      setWorkerGender(found.gender || "");
                      setIdentityNumber(found.identityNumber || found.identity_number || "");
                      setDob(found.dob || "");
                      setPhone(found.phone || "");
                      setHometown(found.hometown || "");
                      setRecruiter(found.recruiter || "");
                      setElectricityFee(Number(found.electricityFee || found.electricity_fee || 0));
                      setWaterFee(Number(found.waterFee || found.water_fee || 0));
                      setFreeRoomDays(Math.max(0, Math.floor(Number(found.freeRoomDays || found.free_room_days || 0))));
                      setNote(found.note || "");
                      setShowOld(false);
                      setOldCode("");
                    } catch (e) {
                      alert(e?.message || String(e));
                    } finally {
                      setLoadingOld(false);
                    }
                  })
                }
              >
                Tải thông tin
              </button>
            </div>
          </div>
        ) : null}

        <TextField
          label="Họ tên"
          value={fullName}
          onChange={setFullName}
          placeholder="Nguyễn Văn A"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <div className="text-xs font-medium text-slate-600">Giới tính</div>
            <select
              value={workerGender}
              onChange={(e) => setWorkerGender(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Chưa chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </label>
          <TextField
            label="Số CCCD"
            value={identityNumber}
            onChange={(v) => setIdentityNumber(String(v || "").replace(/\D/g, ""))}
            placeholder="12 số"
          />
        </div>        <TextField
          label="Ngày sinh"
          value={dob}
          onChange={setDob}
          type="date"
        />
        <TextField
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          placeholder="09xxxxxxxx"
        />
        <TextField
          label="Quê quán"
          value={hometown}
          onChange={setHometown}
          placeholder="Hà Nội"
        />
        <TextField
          label="Người tuyển"
          value={recruiter}
          onChange={setRecruiter}
          placeholder="Anh/Chị ..."
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Tiền điện"
            value={electricityFee}
            onChange={(v) => setElectricityFee(v)}
            type="number"
            placeholder="0"
          />
          <TextField
            label="Tiền nước"
            value={waterFee}
            onChange={(v) => setWaterFee(v)}
            type="number"
            placeholder="0"
          />
        </div>
        <TextField
          label="Số ngày ở Free"
          value={freeRoomDays}
          onChange={(v) => setFreeRoomDays(Math.max(0, Math.floor(Number(v || 0))))}
          type="number"
          placeholder="0"
        />
        <TextField
          label="Ghi chú"
          value={note}
          onChange={setNote}
          placeholder=""
        />
        <button
          className="w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            requireAdmin(async () => {
              const code = (employeeCode || "").trim().toUpperCase();
              if (code && !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) {
                message.warning(
                  "Mã nhân viên không hợp lệ. Chỉ cho phép A-Z, 0-9, _ và -, dài 2-32 ký tự.",
                );
                return;
              }
              if (duplicateInState) {
                message.warning("Mã nhân viên đã tồn tại.");
                return;
              }
              if (!fullName.trim()) {
                message.warning("Vui lòng nhập Họ tên.");
                return;
              }
              addWorker({
                employeeCode: code,
                fullName: fullName.trim(),
                gender: workerGender || "",
                identityNumber: identityNumber.trim(),
                electricityFee: Number(electricityFee || 0),
                waterFee: Number(waterFee || 0),
                freeRoomDays: Math.max(0, Math.floor(Number(freeRoomDays || 0))),
                dob: dob || "",
                phone: phone.trim(),
                hometown: hometown.trim(),
                recruiter: recruiter.trim(),
                note: note.trim(),
              });
              onClose?.();
            })
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm NLĐ
          </span>
        </button>
      </div>
    </Modal>
  );
}

