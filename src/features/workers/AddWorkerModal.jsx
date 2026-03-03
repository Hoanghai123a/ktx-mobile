import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";

export default function AddWorkerModal({
  open,
  onClose,
  requireAdmin,
  addWorker,
}) {
  const [fullName, setFullName] = useState("");
  const [hometown, setHometown] = useState("");
  const [recruiter, setRecruiter] = useState("");

  useEffect(() => {
    if (open) {
      setFullName("");
      setHometown("");
      setRecruiter("");
    }
  }, [open]);

  return (
    <Modal open={open} title="Thêm NLĐ" onClose={onClose}>
      <div className="space-y-3">
        <TextField
          label="Họ tên"
          value={fullName}
          onChange={setFullName}
          placeholder=""
        />
        <TextField
          label="Quê quán"
          value={hometown}
          onChange={setHometown}
          placeholder=""
        />
        <TextField
          label="Người tuyển"
          value={recruiter}
          onChange={setRecruiter}
          placeholder=""
        />
        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            requireAdmin(async () => {
              if (!fullName.trim()) {
                alert("Vui lòng nhập Họ tên.");
                return;
              }
              addWorker({
                fullName: fullName.trim(),
                hometown: hometown.trim(),
                recruiter: recruiter.trim(),
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
