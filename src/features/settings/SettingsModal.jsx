import React, { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  DoorOpen,
  Download,
  FileUp,
  Mars,
  Save,
  Settings2,
  Sparkles,
  Users,
  Venus,
} from "lucide-react";
import { downloadExcelSample } from "../../services/excelSampleService";

import clsx from "../../components/ui/clsx";
import Modal from "../../components/ui/Modal";
import TextField from "../../components/ui/TextField";
import Pill from "../../components/ui/Pill";
import PwaInstallSettingsCard from "../../components/layout/PwaInstallSettingsCard";
import { APP_VERSION } from "../../constants/appVersion";
import {
  loadIncludeEmptyRooms,
  loadRoomSuggestionCapacity,
  loadRoomSuggestionCapacityMap,
  roomCapacityFor,
  saveIncludeEmptyRooms,
  suggestRooms,
} from "../../services/roomSuggestion";

export default function SettingsModal({
  open,
  onClose,

  state,
  setState,

  auth,
  importFileRef,

  DEFAULT_SETTINGS,
  saveSettingsToDb,
  requireAdmin,
  onImportExcel,
  installApp,
}) {
  const settings = state.settings;
  const workers = state.workers;
  const floors = state.floors;

  const [draft, setDraft] = useState(settings);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [incomingCount, setIncomingCount] = useState("1");
  const [incomingGender, setIncomingGender] = useState("male");
  const [roomCapacity, setRoomCapacity] = useState(() =>
    String(settings?.defaultRoomCapacity || loadRoomSuggestionCapacity(8)),
  );
  const [roomCapacityById, setRoomCapacityById] = useState(() =>
    settings?.roomCapacityById || loadRoomSuggestionCapacityMap(),
  );
  const [capacityDraft, setCapacityDraft] = useState(() =>
    settings?.roomCapacityById || loadRoomSuggestionCapacityMap(),
  );
  const [includeEmptyRooms, setIncludeEmptyRooms] = useState(() =>
    loadIncludeEmptyRooms(true),
  );

  useEffect(() => {
    if (open) {
      setDraft(settings);
      const nextDefaultCapacity =
        settings?.defaultRoomCapacity || loadRoomSuggestionCapacity(8);
      const nextCapacityById =
        settings?.roomCapacityById || loadRoomSuggestionCapacityMap();
      setRoomCapacity(String(nextDefaultCapacity));
      setRoomCapacityById(nextCapacityById);
      setCapacityDraft(nextCapacityById);
      setIncludeEmptyRooms(loadIncludeEmptyRooms(true));
    }
  }, [open, settings]);

  const mergedDraft = useMemo(() => {
    const base = DEFAULT_SETTINGS ?? {};
    const baseAbout = base.about ?? {};
    const baseAdminContact = base.adminContact ?? {};
    const d = draft ?? {};
    const dAbout = d.about ?? {};
    const dAdminContact = d.adminContact ?? {};

    return {
      ...base,
      ...d,
      about: {
        ...baseAbout,
        ...dAbout,
      },
      adminContact: {
        ...baseAdminContact,
        ...dAdminContact,
      },
    };
  }, [DEFAULT_SETTINGS, draft]);

  const workerById = useMemo(() => {
    return new Map((workers || []).map((worker) => [worker.id, worker]));
  }, [workers]);

  const normalizedIncomingCount = Math.max(1, Math.floor(Number(incomingCount || 1)));
  const normalizedCapacity = Math.max(1, Math.floor(Number(roomCapacity || 1)));

  const flatRooms = useMemo(
    () =>
      (floors || []).flatMap((floor) =>
        (floor?.rooms || []).map((room) => ({
          floorId: floor?.id || "",
          floorName: floor?.name || "",
          room,
          currentCount: (room?.stays || []).filter((stay) => !stay?.dateOut).length,
        })),
      ),
    [floors],
  );

  const roomSuggestions = useMemo(
    () =>
      suggestRooms({
        floors,
        workerById,
        incomingCount: normalizedIncomingCount,
        incomingGender,
        roomCapacity: normalizedCapacity,
        roomCapacityById,
        includeEmptyRooms,
      }),
    [
      floors,
      incomingGender,
      includeEmptyRooms,
      normalizedCapacity,
      normalizedIncomingCount,
      roomCapacityById,
      workerById,
    ],
  );

  const parseMoney = (value) =>
    Math.max(0, Number(String(value || "").replace(/,/g, "")) || 0);

  const formatMoney = (value) => Number(value || 0).toLocaleString("en-US");

  const updateRoomCapacity = (value) => {
    setRoomCapacity(value);
  };

  const updateSingleRoomCapacity = (roomId, value) => {
    const capacity = Math.max(1, Math.floor(Number(value || 1)));
    setCapacityDraft({
      ...capacityDraft,
      [roomId]: capacity,
    });
  };

  const applyCapacityToAllRooms = () => {
    const capacity = Math.max(1, Math.floor(Number(roomCapacity || 1)));
    const nextMap = {};
    for (const item of flatRooms) {
      if (item.room?.id) nextMap[item.room.id] = capacity;
    }
    setRoomCapacity(String(capacity));
    setCapacityDraft(nextMap);
  };

  const handleOpenSuggestion = () => {
    setSuggestionOpen(true);
  };

  
  const saveRoomCapacities = () =>
    requireAdmin(async () => {
      const nextDefaultCapacity = Math.max(1, Math.floor(Number(roomCapacity || 1)));
      const nextCapacityById = { ...capacityDraft };
      const nextSettings = {
        ...mergedDraft,
        defaultRoomCapacity: nextDefaultCapacity,
        roomCapacityById: nextCapacityById,
      };

      setRoomCapacity(String(nextDefaultCapacity));
      setRoomCapacityById(nextCapacityById);
      setDraft(nextSettings);
      setState((prev) => ({ ...prev, settings: nextSettings }));
      await saveSettingsToDb?.(nextSettings);
      setCapacityOpen(false);
    });

  return (
    <Modal open={open} title="Cài đặt" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Gợi ý phòng</div>
              <div className="mt-1 text-xs text-slate-600">
                Mở popup để nhập tiêu chí và xem 5 phòng phù hợp nhất.
              </div>
            </div>
            <Pill icon={Sparkles} text="Top 5" tone="sky" />
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-2xl bg-[rgb(44_120_159)] px-4 py-3 text-sm font-semibold text-white"
            onClick={handleOpenSuggestion}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <BedDouble className="h-4 w-4" />
              Mở gợi ý phòng
            </span>
          </button>
          <button
            type="button"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            onClick={() => setCapacityOpen(true)}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Settings2 className="h-4 w-4" />
              Cài danh sách sức chứa
            </span>
          </button>
        </div>

        <PwaInstallSettingsCard installApp={installApp} settings={mergedDraft} />

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Thiết lập hiển thị</div>

          <div className="mt-3 space-y-3">
            <TextField
              label="Số cột hiển thị phòng (2-4)"
              type="number"
              value={String(mergedDraft.roomGridCols ?? 3)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  roomGridCols: Number(value),
                }))
              }
            />
            <TextField
              label="Tiền điện / số"
              type="text"
              inputMode="numeric"
              value={formatMoney(mergedDraft.electricityPrice)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  electricityPrice: parseMoney(value),
                }))
              }
            />
            <TextField
              label="Tiền nước / số"
              type="text"
              inputMode="numeric"
              value={formatMoney(mergedDraft.waterPrice)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  waterPrice: parseMoney(value),
                }))
              }
            />
            <TextField
              label="Tiền phòng / tháng"
              type="text"
              inputMode="numeric"
              value={formatMoney(mergedDraft.roomMonthlyPrice)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  roomMonthlyPrice: parseMoney(value),
                }))
              }
            />

            <SegmentedSetting
              label="Cách thu tiền phòng"
              options={[
                { value: "postpaid", label: "Thu sau" },
                { value: "prepaid", label: "Thu trước" },
              ]}
              value={mergedDraft.roomBillingMode || "postpaid"}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, roomBillingMode: value }))
              }
            />

            <SegmentedSetting
              label="Cách tính tiền nước"
              options={[
                { value: "shared", label: "Chia theo người" },
                { value: "no_split", label: "Không chia" },
              ]}
              value={mergedDraft.waterBillingMode || "shared"}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, waterBillingMode: value }))
              }
            />

            <TextField
              label="Ngày chốt thanh toán"
              type="number"
              value={String(mergedDraft.billingCloseDay || 10)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  billingCloseDay: Math.min(31, Math.max(1, Number(value || 1))),
                }))
              }
            />
            <TextField
              label="Tháng đang thu"
              type="month"
              value={mergedDraft.billingMonth || ""}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  billingMonth: value,
                }))
              }
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold">Bảo vệ xóa</div>
          <div className="mt-3 space-y-2">
            <ToggleRow
              label="Cho phép xóa cấu trúc (tầng/phòng)"
              value={!!mergedDraft.canDeleteStructure}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  canDeleteStructure: value,
                }))
              }
            />
            <ToggleRow
              label="Yêu cầu mật khẩu khi xóa"
              value={!!mergedDraft.requirePasswordOnDelete}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  requirePasswordOnDelete: value,
                }))
              }
            />
            <div className="rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
              Khi xóa tầng/phòng, hệ thống sẽ yêu cầu nhập lại mật khẩu đăng
              nhập hiện tại.
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Dữ liệu</div>
              <div className="mt-1 text-xs text-slate-600">
                Nhập dữ liệu NLĐ từ Excel cho tòa nhà đang chọn.
              </div>
            </div>
            <Pill icon={FileUp} text="Excel" tone="sky" />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className={clsx(
                "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm",
                auth.isAdmin
                  ? "bg-[rgb(44_120_159)] text-white"
                  : "bg-slate-100 text-slate-500",
              )}
              onClick={() =>
                requireAdmin(() => {
                  importFileRef?.current?.click();
                })
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                <FileUp className="h-4 w-4" />
                Nhập Excel
              </span>
            </button>

            <button
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={downloadExcelSample}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                Tải file mẫu
              </span>
            </button>
          </div>
          <input
            type="file"
            ref={importFileRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) await onImportExcel(file);
              event.target.value = null;
            }}
          />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Phiên bản ứng dụng</div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {APP_VERSION}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Định dạng tháng.ngày.số lần build trong ngày.
          </div>
        </div>

        <button
          className={clsx(
            "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
            auth.isAdmin
              ? "bg-[rgb(44_120_159)] text-white"
              : "bg-slate-100 text-slate-500",
          )}
          onClick={() =>
            requireAdmin(async () => {
              const nextSettings = mergedDraft;
              setState((prev) => ({ ...prev, settings: nextSettings }));
              await saveSettingsToDb?.(nextSettings);
              onClose?.();
            })
          }
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Save className="h-4 w-4" />
            Lưu cài đặt
          </span>
        </button>
      </div>

      <Modal
        open={suggestionOpen}
        title="Gợi ý phòng"
        onClose={() => setSuggestionOpen(false)}
        zIndex="z-[70]"
      >
        <div className="space-y-3">
          <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <div className="text-sm font-semibold text-slate-900">
              Nhập tiêu chí gợi ý phòng
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Cùng giới tính, lấp đầy số phòng, rồi đến phòng có người vào ở gần đây nhất.
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    label="Số người mới"
                    type="number"
                    min="1"
                    value={incomingCount}
                    onChange={setIncomingCount}
                  />
                </div>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-3 text-left"
                  onClick={() => setIncludeEmptyRooms((prev) => {
                    const next = !prev;
                    saveIncludeEmptyRooms(next);
                    return next;
                  })}
                >
                  <div
                    className={clsx(
                      "h-6 w-11 rounded-full p-1 transition",
                      includeEmptyRooms ? "bg-emerald-500" : "bg-slate-200",
                    )}
                  >
                    <div
                      className={clsx(
                        "h-4 w-4 rounded-full bg-white transition",
                        includeEmptyRooms ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </div>
                  <div className="text-xs font-semibold leading-tight text-slate-700">
                    <div>Phòng trống</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {includeEmptyRooms ? "Bật" : "Tắt"}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-2">
                  <GenderCheckbox
                    checked={incomingGender === "male"}
                    onChange={() => setIncomingGender("male")}
                    label="Nam"
                    tone="sky"
                  />
                  <GenderCheckbox
                    checked={incomingGender === "female"}
                    onChange={() => setIncomingGender("female")}
                    label="Nữ"
                    tone="pink"
                  />
                </div>
            </div>
          </div>

          {roomSuggestions.length ? (
            <div className="space-y-2">
                                                        {roomSuggestions.map((room, index) => {
                const rawGender = String(room.roomGenderRaw ?? room.roomGender ?? "").trim().toLowerCase();
                let GenderIcon = Users;
                let genderTone = "slate";
                if (rawGender === "female" || rawGender === "nu" || rawGender === "nữ") {
                  GenderIcon = Venus;
                  genderTone = "pink";
                } else if (rawGender === "male" || rawGender === "nam") {
                  GenderIcon = Mars;
                  genderTone = "sky";
                }
                const isFull = room.projectedOccupancy === room.capacity;
                return (
                  <div
                    key={room.roomId}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-100"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                      {room.floorName
                        ? `${room.floorName} - Phòng ${room.roomCode}`
                        : `Phòng ${room.roomCode}`}
                    </div>
                    <div
                      className={clsx(
                        "flex shrink-0 items-center gap-1 text-xs font-semibold",
                        isFull ? "text-emerald-600" : "text-sky-700",
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{`${room.projectedOccupancy}/${room.capacity}`}</span>
                    </div>
                    <GenderIcon
                      className={clsx(
                        "h-4 w-4 shrink-0",
                        genderTone === "pink"
                          ? "text-pink-600"
                          : genderTone === "sky"
                          ? "text-sky-700"
                          : "text-slate-500",
                      )}
                    />
                  </div>
                );
              })}            </div>
          ) : (
            <div className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-100">
              Không tìm thấy phòng phù hợp với số người, giới tính và sức chứa đã chọn.
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={capacityOpen}
        title="Sức chứa phòng"
        onClose={() => setCapacityOpen(false)}
        zIndex="z-[80]"
      >
        <div className="space-y-3">
          <div className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <div className="text-sm font-semibold text-slate-900">
              Cài số người tối đa cho từng phòng
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Có thể áp dụng nhanh một số cho tất cả phòng, sau đó chỉnh riêng từng phòng nếu cần.
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  label="Sức chứa áp dụng nhanh"
                  type="number"
                  min="1"
                  value={roomCapacity}
                  onChange={updateRoomCapacity}
                />
              </div>
              <button
                type="button"
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                onClick={applyCapacityToAllRooms}
              >
                Áp dụng tất cả
              </button>
              <button
                type="button"
                className={clsx(
                  "shrink-0 rounded-2xl px-3 py-3 text-sm font-semibold shadow-sm",
                  auth.isAdmin
                    ? "bg-[rgb(44_120_159)] text-white"
                    : "bg-slate-100 text-slate-500",
                )}
                onClick={saveRoomCapacities}
              >
                Lưu sức chứa
              </button>
            </div>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
            {flatRooms.length ? (
              flatRooms.map(({ floorName, room, currentCount }) => {
                const capacity = roomCapacityFor(
                  room?.id,
                  capacityDraft,
                  normalizedCapacity,
                );
                return (
                  <div
                    key={room?.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {floorName ? `${floorName} - Phòng ${room?.code}` : `Phòng ${room?.code}`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Đang ở: {currentCount} người
                        </div>
                      </div>
                      <div className="w-28 shrink-0">
                        <TextField
                          label="Tối đa"
                          type="number"
                          min="1"
                          value={String(capacity)}
                          onChange={(value) => updateSingleRoomCapacity(room?.id, value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                Chưa có phòng để cài sức chứa.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function SegmentedSetting({ label, options, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={clsx(
              "rounded-2xl px-3 py-2 text-sm font-semibold ring-1",
              value === option.value
                ? "bg-[rgb(44_120_159)] text-white ring-[rgb(44_120_159)]"
                : "bg-white text-slate-700 ring-slate-200",
            )}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GenderCheckbox({ checked, onChange, label, tone }) {
  const activeClass =
    tone === "pink"
      ? "bg-pink-50 text-pink-700"
      : "bg-sky-50 text-sky-700";

  return (
    <label
      className={clsx(
        "flex flex-1 cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
        checked
          ? activeClass
          : "bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-[rgb(44_120_159)]"
        checked={!!checked}
        onChange={() => onChange?.()}
      />
      <span>{label}</span>
    </label>
  );
}

function RoomStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      {label}: <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left"
      onClick={() => onChange?.(!value)}
    >
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-600">{value ? "Bật" : "Tắt"}</div>
      </div>
      <div
        className={clsx(
          "h-6 w-11 rounded-full p-1 transition",
          value ? "bg-emerald-500" : "bg-slate-200",
        )}
      >
        <div
          className={clsx(
            "h-4 w-4 rounded-full bg-white transition",
            value ? "translate-x-5" : "translate-x-0",
          )}
        />
      </div>
    </button>
  );
}
