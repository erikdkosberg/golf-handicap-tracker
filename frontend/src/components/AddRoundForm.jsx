import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../api";

const inputClass =
  "border border-gray-300 rounded px-3 py-1.5 text-sm w-full";

function Field({ label, children }) {
  return (
    <div className="flex flex-col w-full min-w-0">
      <label className="text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function AddRoundForm({ token, onAdd }) {
  const [score, setScore] = useState("");
  const [course_rating, setCourseRating] = useState("");
  const [course_slope, setCourseSlope] = useState("");
  const [course, setCourse] = useState("");
  const [tees, setTees] = useState("");
  const [yardage, setYardage] = useState("");
  const [par, setPar] = useState("");
  const [date, setDate] = useState("");
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCourses(res.data));
  }, [token]);

  const courseCounts = courses.reduce((acc, c) => {
    if (c.course) {
      acc[c.course] = (acc[c.course] || 0) + (c.round_count || 1);
    }
    return acc;
  }, {});

  const courseNames = [...new Set(courses.map((c) => c.course).filter(Boolean))].sort(
    (a, b) => (courseCounts[b] || 0) - (courseCounts[a] || 0)
  );

  const teesForCourse =
    course.trim() !== ""
      ? courses
          .filter(
            (c) =>
              c.course &&
              c.course.toLowerCase() === course.trim().toLowerCase()
          )
          .sort((a, b) => (b.round_count || 0) - (a.round_count || 0))
          .map((c) => c.tees)
      : [];
  const uniqueTees = [...new Set(teesForCourse.filter(Boolean))];

  useEffect(() => {
    if (course && tees) {
      const match = courses.find(
        (c) =>
          c.course &&
          c.tees &&
          c.course.toLowerCase() === course.trim().toLowerCase() &&
          c.tees.toLowerCase() === tees.trim().toLowerCase()
      );
      if (match) {
        setCourseRating(match.course_rating);
        setCourseSlope(match.course_slope);
        setYardage(match.yardage);
        setPar(match.par);
      }
    }
  }, [course, tees, courses]);

  const submit = async (e) => {
    e.preventDefault();
    await axios.post(
      `${API_URL}/rounds`,
      {
        score,
        course_rating,
        course_slope,
        course,
        tees,
        yardage,
        par,
        date: date || undefined,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setScore("");
    setCourseRating("");
    setCourseSlope("");
    setCourse("");
    setTees("");
    setYardage("");
    setPar("");
    setDate("");
    if (onAdd) onAdd();
  };

  return (
    <div className="flex flex-col h-full">
      <span className="font-semibold text-indigo-700 mb-2 block text-sm shrink-0">
        Add Round
      </span>
      <form
        className="flex flex-col gap-2.5 w-full flex-1"
        onSubmit={submit}
        autoComplete="off"
      >
        <div className="flex flex-col md:flex-row gap-2.5 w-full">
          <Field label="Course">
            <input
              className={inputClass}
              type="text"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setTees("");
              }}
              list="course-list"
              autoComplete="off"
              required
            />
            <datalist id="course-list">
              {courseNames.map((c, i) => (
                <option key={i} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Tees">
            <input
              className={inputClass}
              type="text"
              value={tees}
              onChange={(e) => setTees(e.target.value)}
              list="tees-list"
              autoComplete="off"
              required
            />
            <datalist id="tees-list">
              {uniqueTees.map((t, i) => (
                <option key={i} value={t} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="flex flex-col md:flex-row gap-2.5 w-full">
          <Field label="Rating">
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={course_rating}
              onChange={(e) => setCourseRating(e.target.value)}
              required
            />
          </Field>
          <Field label="Slope">
            <input
              className={inputClass}
              type="number"
              value={course_slope}
              onChange={(e) => setCourseSlope(e.target.value)}
              required
            />
          </Field>
          <Field label="Yardage">
            <input
              className={inputClass}
              type="number"
              value={yardage}
              onChange={(e) => setYardage(e.target.value)}
            />
          </Field>
          <Field label="Par">
            <input
              className={inputClass}
              type="number"
              value={par}
              onChange={(e) => setPar(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col md:flex-row gap-2.5 w-full items-end">
          <Field label="Score">
            <input
              className={inputClass}
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </Field>
          <Field label="Date">
            <input
              className={inputClass}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-1.5 text-sm rounded-lg border border-indigo-700 shadow-sm hover:bg-indigo-700 transition font-semibold w-full md:w-auto md:min-w-[5.5rem] shrink-0"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
