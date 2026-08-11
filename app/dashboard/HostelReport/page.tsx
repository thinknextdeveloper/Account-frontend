"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { reduxApiClient } from "@/services/reduxservices";
import {
  fetchHostelNames,
  fetchHostelReport,
  clearReport,
} from "@/store/slices/HostelReportSlice";

export default function HostelReportPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { hostelNames, rows, loading, error } = useSelector(
    (state: RootState) => state.hostelReport
  );

  const [colleges, setColleges] = useState<string[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [idType, setIdType] = useState<"registrationNo" | "idNo">("idNo");
  const [showReport, setShowReport] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    reduxApiClient.get("master-course/colleges").then((res) => {
      if (res.success) setColleges(res.data.data);
    });
    dispatch(fetchHostelNames());
  }, [dispatch]);

  const handleCollegeChange = (value: string) => {
    setCollegeName(value);
    setHostelName("");
  };

  const handleViewReport = () => {
    if (!hostelName) {
      setFormError("Please Select Hostel Name");
      return;
    }
    setFormError(null);
    setShowReport(true);
    dispatch(fetchHostelReport({ collegeName: collegeName || undefined, hostelName }));
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #eef3f9 35%, #b9d3ec 100%)",
      }}
    >
      {!showReport ? (
        <div className="max-w-md mx-auto mt-24">
          <fieldset className="border border-gray-300 rounded bg-white/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-28 font-semibold text-[13px] text-gray-800">
                  College Name
                </label>
                <select
                  value={collegeName}
                  onChange={(e) => handleCollegeChange(e.target.value)}
                  className="flex-1 border border-gray-300 h-9 px-2 rounded text-[13px] bg-white text-gray-900"
                >
                  <option value="">-- Select --</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="w-28 font-semibold text-[13px] text-gray-800">
                  Hostel Name
                </label>
                <select
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  className="flex-1 border border-gray-300 h-9 px-2 rounded text-[13px] bg-white text-gray-900"
                >
                  <option value="">-- Select --</option>
                  {hostelNames.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-1 text-[13px] font-semibold text-gray-800">
                  <input
                    type="radio"
                    checked={idType === "registrationNo"}
                    onChange={() => setIdType("registrationNo")}
                  />
                  Registration No.
                </label>
                <label className="flex items-center gap-1 text-[13px] font-semibold text-gray-800">
                  <input
                    type="radio"
                    checked={idType === "idNo"}
                    onChange={() => setIdType("idNo")}
                  />
                  ID No.
                </label>
              </div>
            </div>
          </fieldset>

          {formError && (
            <p className="text-red-600 text-[13px] font-medium mt-2 text-center">
              {formError}
            </p>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={handleViewReport}
              className="bg-blue-600 text-white font-semibold text-[13px] px-6 h-9 rounded hover:bg-blue-700"
            >
              View Report
            </button>
            <button className="bg-blue-600 text-white font-semibold text-[13px] px-6 h-9 rounded hover:bg-blue-700">
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded shadow-sm p-6 max-w-4xl mx-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading...</p>
          ) : error ? (
            <p className="text-center text-red-600 py-10">{error}</p>
          ) : (
            <>
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {collegeName || "All Privileged Colleges"}
                </h1>
              </div>

              <div className="flex justify-between text-[13px] font-semibold mb-2 text-gray-900">
                <span>Hostel Name : {hostelName}</span>
                <span>Total Students : {rows.length}</span>
              </div>

              <table className="w-full border-collapse text-[12px] mt-2">
                <thead>
                  <tr className="border-b-2 border-gray-800">
                    <th className="text-left py-2 text-gray-900">ID No</th>
                    <th className="text-left py-2 text-gray-900">Registration No</th>
                    <th className="text-left py-2 text-gray-900">Uni. Roll No.</th>
                    <th className="text-left py-2 text-gray-900">Class</th>
                    <th className="text-left py-2 text-gray-900">Student Name</th>
                    <th className="text-left py-2 text-gray-900">Room Type</th>
                    <th className="text-left py-2 text-gray-900">Room No</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.IDNo}-${i}`} className="border-b border-gray-200">
                      <td className="py-2 text-gray-900">{row.IDNo}</td>
                      <td className="py-2 text-gray-900">{row.RegistrationNo ?? ""}</td>
                      <td className="py-2 text-gray-900">{row.UniRollNo ?? ""}</td>
                      <td className="py-2 text-blue-700">{row.Class}</td>
                      <td className="py-2 text-blue-700">{row.StudentName}</td>
                      <td className="py-2 text-gray-900">{row.RoomType ?? ""}</td>
                      <td className="py-2 text-gray-900">{row.RoomNo ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setShowReport(false);
                    dispatch(clearReport());
                  }}
                  className="bg-blue-600 text-white font-semibold text-[13px] px-6 h-9 rounded hover:bg-blue-700"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}