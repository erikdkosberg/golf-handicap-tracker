import React, { useState } from "react";
import axios from "axios";

export default function RoundRow({
  round,
  token,
  onUpdate,
  onDelete,
  differential,
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ ...round });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    await axios.put(`http://localhost:5050/rounds/${round.id}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEdit(false);
    if (onUpdate) onUpdate();
  };

  if (edit) {
    return (
      <tr className="bg-yellow-50">
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
            ? `${differential > 0 ? "+" : ""}${differential.toFixed(1)}`
            : ""}
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

  return (
    <tr>
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
      <td className="text-center">{round.course_rating}</td>
      <td className="text-center">{round.course_slope}</td>
      <td className="text-center">{round.course}</td>
      <td className="text-center">{round.tees}</td>
      <td className="text-center">{round.yardage}</td>
      <td className="text-center">{round.par}</td>
      <td className="text-center">
        {differential !== null && !isNaN(differential)
          ? `${differential > 0 ? "+" : ""}${differential.toFixed(1)}`
          : ""}
      </td>
      <td className="text-center">
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
            onClick={() => onDelete(round.id)}
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
      </td>
    </tr>
  );
}
