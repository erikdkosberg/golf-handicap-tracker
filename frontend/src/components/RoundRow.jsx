import React, { useState } from "react";
import axios from "axios";
import API_URL from "../api";
import MiniScorecard from "./MiniScorecard";

export default function RoundRow({
  round,
  highlight,
  token,
  onUpdate,
  onDelete,
  differential,
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...round });
  const [showScorecard, setShowScorecard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
    onDelete(round.id);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    await axios.put(`${API_URL}/rounds/${round.id}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEdit(false);
    if (onUpdate) onUpdate();
  };

  const highlightClass = highlight
    ? "bg-green-100 border-l-4 border-green-400"
    : "";

  if (edit) {
    return (
      <tr className={highlightClass}>
        <td>{form.date}</td>
        <td>
          <input
            className="w-16 border rounded px-1 py-0.5"
            name="score"
            value={form.score}
            onChange={handleChange}
            type="number"
          />
        </td>
        <td className="text-center text-gray-500">{round.hole_count ?? 18}</td>
        <td>
          <input
            className="w-16 border rounded px-1 py-0.5"
            name="course_rating"
            value={form.course_rating}
            onChange={handleChange}
            type="number"
            step="0.1"
          />
        </td>
        <td>
          <input
            className="w-16 border rounded px-1 py-0.5"
            name="course_slope"
            value={form.course_slope}
            onChange={handleChange}
            type="number"
          />
        </td>
        <td>
          <input
            className="w-32 border rounded px-1 py-0.5"
            name="course"
            value={form.course || ""}
            onChange={handleChange}
            type="text"
          />
        </td>
        <td>
          <input
            className="w-16 border rounded px-1 py-0.5"
            name="tees"
            value={form.tees || ""}
            onChange={handleChange}
            type="text"
          />
        </td>
        <td>
          <input
            className="w-16 border rounded px-1 py-0.5"
            name="yardage"
            value={form.yardage || ""}
            onChange={handleChange}
            type="number"
          />
        </td>
        <td>
          <input
            className="w-12 border rounded px-1 py-0.5"
            name="par"
            value={form.par || ""}
            onChange={handleChange}
            type="number"
          />
        </td>
        <td className="text-center italic text-gray-400 font-mono">
          {differential !== null && !isNaN(differential)
            ? `${differential > 0 ? "+" : ""}${Number(differential).toFixed(1)}`
            : ""}
        </td>
        <td className="text-center">
          {round.has_hole_by_hole ? (
            <span className="text-green-700 font-medium" title="Hole-by-hole data available">Yes</span>
          ) : (
            <span className="text-gray-400">No</span>
          )}
        </td>
        <td className="text-center">
          <div className="flex justify-center gap-1">
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-green-100 transition"
              title="Save"
              aria-label="Save"
              type="button"
            >
              {/* Check icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onClick={() => setEdit(false)}
              className="p-1 rounded hover:bg-gray-100 transition"
              title="Cancel"
              aria-label="Cancel"
              type="button"
            >
              {/* X/cancel icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Row and expandable scorecard
  return (
    <>
      <tr
        className={`${highlightClass} cursor-pointer`}
        onClick={() => setShowScorecard((prev) => !prev)}
        title="Click to show/hide hole-by-hole scorecard"
      >
        <td className="text-center">
          {round.date
            ? new Date(round.date).toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })
            : ""}
        </td>
        <td className="text-center">{round.score}</td>
        <td className="text-center">{round.hole_count ?? 18}</td>
        <td className="text-center">{round.course_rating}</td>
        <td className="text-center">{round.course_slope}</td>
        <td className="text-center">{round.course}</td>
        <td className="text-center">{round.tees}</td>
        <td className="text-center">{round.yardage}</td>
        <td className="text-center">{round.par}</td>
        <td className="text-center">
          {differential !== null && !isNaN(differential)
            ? `${differential > 0 ? "+" : ""}${Number(differential).toFixed(1)}`
            : ""}
        </td>
        <td className="text-center">
          {round.has_hole_by_hole ? (
            <span className="text-green-700 font-medium" title="Hole-by-hole data available">Yes</span>
          ) : (
            <span className="text-gray-400">No</span>
          )}
        </td>
        <td className="text-center" onClick={e => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <span className="text-xs text-gray-700">Delete this round?</span>
              <div className="flex gap-1">
                <button
                  onClick={handleConfirmDelete}
                  className="px-2 py-0.5 text-xs bg-rose-600 text-white rounded hover:bg-rose-700"
                  type="button"
                >
                  Yes
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="px-2 py-0.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
          <div className="flex justify-center gap-1">
            <button
              onClick={() => setEdit(true)}
              className="p-1 rounded hover:bg-indigo-100 transition"
              title="Edit round"
              aria-label="Edit round"
              type="button"
            >
              {/* Pencil/edit icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232a2.5 2.5 0 0 1 3.536 3.536l-9.193 9.193-4.243 1.06 1.06-4.243 9.193-9.193ZM16 7l1 1"
                />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded hover:bg-rose-100 transition"
              title="Delete round"
              aria-label="Delete round"
              type="button"
            >
              {/* Trash can icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-3 6v6m-4-6v6m6-6v6m1 0a2 2 0 0 0 2-2V7H5v9a2 2 0 0 0 2 2h10z"
                />
              </svg>
            </button>
          </div>
          )}
        </td>
      </tr>
      {showScorecard && round.hole_scores && (
  <tr>
    <td colSpan={12} className="p-0">
      <MiniScorecard holeScores={round.hole_scores} />

    </td>
  </tr>
)}

    </>
  );
}
