import { useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Pin, PinOff, Search } from "lucide-react";
import { buildingService } from "../../services/api-services";
import { formatDate } from "../../services/dateFormat";
import {
  lastBuildingKey,
  normalizePinnedIds,
  pinnedBuildingKey,
  readPinnedBuildingIds,
} from "../../lib/buildingPins";

function Empty({ title, hint, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
        <DoorOpen className="h-6 w-6 text-slate-500" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{hint}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function BuildingStatusLegend() {
  return (
    <div className="fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-md px-4">
      <div className="rounded-2xl bg-white/95 px-3 py-3 text-xs text-slate-600 shadow-lg ring-1 ring-slate-100 backdrop-blur">
        <div className="mb-2 font-semibold text-slate-700">
          Chú thích trạng thái
        </div>
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
            <span>Tòa nhà còn hạn sử dụng.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400" />
            <span>Tòa nhà đã hết hạn.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuildingsHome({
  buildings,
  selectedBuildingId,
  setSelectedBuildingId,
  setTab,
  user,
  token,
}) {
  const storageKey = pinnedBuildingKey(user);
  const lastKey = lastBuildingKey(user);
  const [query, setQuery] = useState("");
  const remoteLoadedRef = useRef("");
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return normalizePinnedIds(rows);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setPinnedIds(normalizePinnedIds(rows));
    } catch {
      setPinnedIds([]);
    }
    remoteLoadedRef.current = "";
  }, [storageKey]);

  const buildingIdsKey = useMemo(
    () =>
      buildings
        .map((b) => b.id)
        .filter(Boolean)
        .sort()
        .join("|"),
    [buildings],
  );
  const accessibleIds = useMemo(
    () => new Set(buildings.map((b) => b.id).filter(Boolean)),
    [buildings],
  );

  useEffect(() => {
    if (!token || !buildingIdsKey) return;
    const syncKey = `${storageKey}:${buildingIdsKey}`;
    if (remoteLoadedRef.current === syncKey) return;
    remoteLoadedRef.current = syncKey;
    let alive = true;
    (async () => {
      try {
        const remote = await buildingService.getPinnedBuildings(token);
        if (!alive || !remote?.synced) return;
        const localIds = readPinnedBuildingIds(user).filter((id) =>
          accessibleIds.has(id),
        );
        const remoteIds = normalizePinnedIds(remote.pinnedBuildingIds).filter(
          (id) => accessibleIds.has(id),
        );
        const next = remote.exists ? remoteIds : localIds;
        const remoteLast = String(remote.lastBuildingId || "").trim();
        const localLast = localStorage.getItem(lastKey) || "";
        const nextLast = accessibleIds.has(
          remote.exists ? remoteLast : localLast,
        )
          ? remote.exists
            ? remoteLast
            : localLast
          : "";

        setPinnedIds(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
        if (nextLast) localStorage.setItem(lastKey, nextLast);
        else localStorage.removeItem(lastKey);

        const remoteHadStaleIds =
          remote.exists &&
          remoteIds.length !==
            normalizePinnedIds(remote.pinnedBuildingIds).length;
        const remoteHadStaleLast = remote.exists && !!remoteLast && !nextLast;
        if (!remote.exists || remoteHadStaleIds || remoteHadStaleLast) {
          await buildingService.savePinnedBuildings(
            { pinnedBuildingIds: next, lastBuildingId: nextLast },
            token,
          );
        }
      } catch (e) {
        console.warn("Sync pinned buildings failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [accessibleIds, buildingIdsKey, lastKey, storageKey, token, user]);

  useEffect(() => {
    const next = pinnedIds.filter((id) => accessibleIds.has(id));
    if (next.length === pinnedIds.length) return;
    setPinnedIds(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }, [accessibleIds, pinnedIds, storageKey]);

  function savePins(
    next,
    nextLastId = localStorage.getItem(lastKey) || selectedBuildingId || "",
  ) {
    const clean = [
      ...new Set((next || []).filter((id) => accessibleIds.has(id))),
    ];
    const cleanLastId = accessibleIds.has(nextLastId) ? nextLastId : "";
    setPinnedIds(clean);
    localStorage.setItem(storageKey, JSON.stringify(clean));
    if (cleanLastId) localStorage.setItem(lastKey, cleanLastId);
    else localStorage.removeItem(lastKey);
    if (token) {
      buildingService
        .savePinnedBuildings(
          { pinnedBuildingIds: clean, lastBuildingId: cleanLastId },
          token,
        )
        .catch((e) => console.warn("Save pinned buildings failed:", e));
    }
  }

  function pinBuilding(id) {
    if (!id || !accessibleIds.has(id) || pinnedIds.includes(id)) return;
    savePins([...pinnedIds, id]);
  }

  function unpinBuilding(id) {
    const next = pinnedIds.filter((x) => x !== id);
    if (selectedBuildingId === id) {
      const nextSelected = next[0] || "";
      savePins(next, nextSelected);
      setSelectedBuildingId(nextSelected);
      if (!next.length) setTab("buildings");
      return;
    }
    savePins(next);
  }

  function openBuilding(id) {
    setSelectedBuildingId(id);
    savePins(pinnedIds, id);
    setTab("ktx");
  }

  const pinnedBuildings = useMemo(
    () => buildings.filter((b) => pinnedIds.includes(b.id)),
    [buildings, pinnedIds],
  );
  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return buildings.filter((b) =>
      `${b.code || ""} ${b.name || ""}`.toLowerCase().includes(text),
    );
  }, [buildings, query]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-44 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tòa nhà để ghim"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {query ? (
            <button
              className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={() => setQuery("")}
            >
              Xóa
            </button>
          ) : null}
        </div>
      </div>

      {query.trim() ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Kết quả tìm kiếm
          </div>
          {searchResults.length ? (
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((b) => {
                const pinned = pinnedIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-sky-100"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {b.code || "-"}
                      </div>
                      <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
                        {b.name}
                      </div>
                    </div>
                    <button
                      disabled={pinned}
                      className={`mt-2 w-full rounded-xl px-2 py-1.5 text-xs font-semibold ${pinned ? "bg-slate-100 text-slate-400" : "bg-[rgb(44_120_159)] text-white"}`}
                      onClick={() => pinBuilding(b.id)}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Pin className="h-3.5 w-3.5" />
                        {pinned ? "Đã ghim" : "Ghim"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
              Không tìm thấy tòa nhà phù hợp.
            </div>
          )}
        </div>
      ) : null}

      {pinnedBuildings.length ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Tòa nhà đã ghim
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pinnedBuildings.map((b) => {
              const active = b.id === selectedBuildingId;
              const canManage =
                b.accessRole === "manager" || b.accessRole === "owner";
              return (
                <div
                  key={b.id}
                  className={`rounded-2xl bg-white p-2.5 text-left shadow-sm ring-1 ${active ? "ring-sky-300" : "ring-slate-100"}`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => openBuilding(b.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {b.code || "-"}
                        </div>
                        <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
                          {b.name}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${b.expired ? "bg-rose-400" : "bg-emerald-400"}`}
                      />
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-500">
                      Hạn: {formatDate(b.end_date)}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500">
                      {canManage ? "Quản lý" : "Chỉ xem"}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium text-slate-400">
                      {b.public_view ? "Công khai" : "Được gán"}
                    </span>
                    <button
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-500"
                      onClick={() => unpinBuilding(b.id)}
                      title="Bỏ ghim"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Empty
          title="Chưa ghim tòa nhà"
          hint="Tìm tòa nhà ở ô phía trên, sau đó bấm Ghim để lưu vào danh sách chính."
        />
      )}

      <BuildingStatusLegend />
    </div>
  );
}
