import React from "react";
import Modal from "../../components/ui/Modal";

export default function ImportExcelModal({
  importModal, // {open,busy,result}
  setImportModal,
  importFileRef,
  importExcelFile,
}) {
  const result = importModal.result;

  return (
    <Modal
      open={importModal.open}
      title="Nhập Excel"
      onClose={() =>
        setImportModal((m) => ({
          ...m,
          open: false,
          busy: false,
          result: null,
        }))
      }
    >
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Hướng dẫn</div>
          <div className="mt-1 text-xs text-slate-600">
            File Excel (sheet đầu tiên) nên có các cột: Họ tên, Ngày sinh, Số
            điện thoại, Quê quán, Người tuyển, Phòng, Ngày vào, Ngày rời.
            <br />
            Nếu không có Phòng/Ngày vào thì chỉ tạo NLĐ.
          </div>
        </div>

        <input
          ref={importFileRef}
          type="file"
          accept=".xlsx,.xls"
          className="block w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importExcelFile(f);
            e.target.value = "";
          }}
          disabled={importModal.busy}
        />

        {importModal.busy ? (
          <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-100">
            Đang nhập dữ liệu…
          </div>
        ) : null}

        {result ? (
          <div className="space-y-2">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-semibold">Kết quả</div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
                <div>
                  Tổng dòng: <b>{result.total}</b>
                </div>
                <div>
                  Bỏ qua: <b>{result.skipped}</b>
                </div>
                <div>
                  NLĐ tạo mới: <b>{result.workersInserted}</b>
                </div>
                <div>
                  NLĐ cập nhật: <b>{result.workersUpdated}</b>
                </div>
                <div>
                  Lượt ở tạo mới: <b>{result.staysInserted}</b>
                </div>
                <div>
                  Lỗi: <b>{(result.errors || []).length}</b>
                </div>
              </div>
            </div>

            {(result.errors || []).length ? (
              <div className="rounded-3xl bg-rose-50 p-4 ring-1 ring-rose-100">
                <div className="text-sm font-semibold text-rose-900">
                  Danh sách lỗi
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-900">
                  {result.errors.slice(0, 20).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                {(result.errors || []).length > 20 ? (
                  <div className="mt-2 text-xs text-rose-900">
                    (Hiển thị 20 lỗi đầu tiên)
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
