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

  const teesForCourse =
    course.trim() !== ""
      ? courses
          .filter(
            (c) =>
              c.course &&
              c.course.toLowerCase() === course.trim().toLowerCase()
          )
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
    <>
      <span className="font-semibold text-indigo-700 mb-2 block text-lg">
        Add Round
      </span>
      <form
        className="flex flex-col gap-2 w-full"
        onSubmit={submit}
        autoComplete="off"
      >
        {/* Row 1: Course + Tees */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/2"
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
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/2"
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
        </div>

        {/* Row 2: Rating, Slope, Yardage, Par */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/4"
            type="number"
            step="0.1"
            placeholder="Rating"
            value={course_rating}
            onChange={(e) => setCourseRating(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/4"
            type="number"
            placeholder="Slope"
            value={course_slope}
            onChange={(e) => setCourseSlope(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/4"
            type="number"
            placeholder="Yardage"
            value={yardage}
            onChange={(e) => setYardage(e.target.value)}
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/4"
            type="number"
            placeholder="Par"
            value={par}
            onChange={(e) => setPar(e.target.value)}
          />
        </div>

        {/* Row 3: Score + Date + Add Button */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/3"
            type="number"
            placeholder="Score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-full md:w-1/3"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="Date"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-1 rounded-lg border border-indigo-700 shadow-sm hover:bg-indigo-700 transition font-semibold w-full md:w-1/3"
            style={{ minWidth: "70px" }}
          >
            Add
          </button>
        </div>
      </form>
    </>
  );
}
