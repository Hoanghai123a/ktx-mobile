import React, { useState, useEffect } from "react";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { noteService } from "../../services/api-services";
import { useAuth } from "../../contexts/AuthContext";

export default function NoteList({ targetId, targetType }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetId && token) {
      loadNotes();
    }
  }, [targetId, token]);

  const loadNotes = async () => {
    try {
      const data = await noteService.getByTarget(targetId, targetType, token);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load notes failed", err);
    }
  };

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const res = await noteService.create(
        { target_id: targetId, target_type: targetType, content: newNote },
        token
      );
      setNotes([res, ...notes]);
      setNewNote("");
    } catch (err) {
      alert("Không thể thêm ghi chú.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa ghi chú này?")) return;
    try {
      await noteService.delete(id, token);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      alert("Không thể xóa ghi chú.");
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <StickyNote className="h-4 w-4 text-blue-500" />
        Ghi chú
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Thêm ghi chú mới..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newNote.trim()}
          className="rounded-xl bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {notes.length === 0 ? (
          <div className="py-2 text-center text-xs text-slate-400">
            Chưa có ghi chú nào.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
            >
              <div className="text-sm text-slate-700">{note.content}</div>
              <button
                onClick={() => handleDelete(note.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
