"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchDeadDebitColleges,
  fetchDeadDebitCourses,
  fetchDeadDebits,
} from "@/store/slices/deadDebitsSlice";

export default function DeadDebitsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { colleges, courses, rows, totalRecords, loading, error } =
    useSelector((state: RootState) => state.deadDebits);

  const [collegeName, setCollegeName] = useState("");
  const [course, setCourse] = useState("");

  useEffect(() => {
    dispatch(fetchDeadDebitColleges());
  }, [dispatch]);

  const handleCollegeChange = async (value: string) => {
    setCollegeName(value);
    setCourse("");

    if (value) {
      dispatch(fetchDeadDebitCourses(value));
    }
    dispatch(fetchDeadDebits({ collegeName: value, course: "" }));
  };

  const handleCourseChange = (value: string) => {
    setCourse(value);
    dispatch(fetchDeadDebits({ collegeName, course: value }));
  };

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #eef3f9 35%, #b9d3ec 100%)",
      }}
    >
      {/* Search bar */}
      <div className="bg-white border border-gray-300 rounded shadow-sm p-3 mb-4 flex flex-wrap items-center gap-4">
        <label className="font-semibold text-[13px] text-gray-800">
          College Name
        </label>
        <select
          value={collegeName}
          onChange={(e) => handleCollegeChange(e.target.value)}
          className="border border-gray-300 h-9 px-2 w-64 rounded text-[13px] bg-white text-gray-900"
        >
          <option value="">-- Select --</option>
          {colleges.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="font-semibold text-[13px] text-gray-800">
          Course
        </label>
        <select
          value={course}
          onChange={(e) => handleCourseChange(e.target.value)}
          disabled={!collegeName}
          className="border border-gray-300 h-9 px-2 w-48 rounded text-[13px] bg-white text-gray-900 disabled:bg-gray-100"
        >
          <option value="">-- Select --</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button className="ml-auto bg-blue-600 text-white text-[13px] font-semibold px-6 h-9 rounded hover:bg-blue-700">
          Close
        </button>
      </div>

      {error && <div className="mb-3 text-red-600 font-medium text-[13px]">{error}</div>}

      <div className="mb-2 text-[13px] font-semibold text-gray-800">
        Total Records : {totalRecords}
      </div>

      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-auto max-h-[600px]">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 bg-gray-200">
            <tr>
              <th className="border px-2 py-2 text-left text-gray-900">Date Entry</th>
              <th className="border px-2 py-2 text-left text-gray-900">CollegeName</th>
              <th className="border px-2 py-2 text-left text-gray-900">IDNo</th>
              <th className="border px-2 py-2 text-left text-gray-900">StudentName</th>
              <th className="border px-2 py-2 text-left text-gray-900">Course</th>
              <th className="border px-2 py-2 text-left text-gray-900">FatherName</th>
              <th className="border px-2 py-2 text-left text-gray-900">Particulars</th>
              <th className="border px-2 py-2 text-right text-gray-900">Debit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">
                  No Records Found
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={`${row.TransactionID}-${index}`}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border px-2 py-1 text-blue-800">{row.DateEntry}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.CollegeName}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.IDNo}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.StudentName}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.Course}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.FatherName}</td>
                  <td className="border px-2 py-1 text-blue-800">{row.Particulars}</td>
                  <td className="border px-2 py-1 text-right text-blue-800">{row.Debit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}