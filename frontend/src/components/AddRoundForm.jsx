import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../api";

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

  const courseNames = [
    ...new Set(courses.map((c) => c.course).filter(Boolean)),
  ];
  const teesForCourse = course
    ? courses.filter((c) => c.course === course).map((c) => c.tees)
    : [];
  const uniqueTees = [...new Set(teesForCourse)];

  useEffect(() => {
    if (course && tees) {
      const match = courses.find((c) => c.course === course && c.tees === tees);
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
      },
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
    <>
      <span className="font-semibold text-indigo-700 mb-2 block text-lg">
        Add Round
      </span>
      <form className="flex flex-wrap gap-2 w-full items-end" onSubmit={submit}>
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-20 flex-shrink"
          type="number"
          placeholder="Score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-40 sm:w-56 flex-shrink"
          type="text"
          placeholder="Course"
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
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-26 flex-shrink"
          type="text"
          placeholder="Tees"
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
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-21 flex-shrink"
          type="number"
          step="0.1"
          placeholder="Rating"
          value={course_rating}
          onChange={(e) => setCourseRating(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-21 flex-shrink"
          type="number"
          placeholder="Slope"
          value={course_slope}
          onChange={(e) => setCourseSlope(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-21 flex-shrink"
          type="number"
          placeholder="Yardage"
          value={yardage}
          onChange={(e) => setYardage(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-16 flex-shrink"
          type="number"
          placeholder="Par"
          value={par}
          onChange={(e) => setPar(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-36 flex-shrink"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="Date"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-1 rounded-lg border border-indigo-700 shadow-sm hover:bg-indigo-700 transition font-semibold"
          style={{ minWidth: "70px" }}
        >
          Add
        </button>
      </form>
    </>
  );
}
