// app/debit-entry/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { reduxApiClient } from "@/services/reduxservices";
import {
  fetchMetaOptions,
  fetchStudentByIdNo,
  fetchFeeHeads,
  saveDebitEntry,
  clearStudent,
  clearSaveStatus,
  SaveDebitPayload,
} from "@/store/slices/DebitEntrySlice";

const todayStr = () => {
  const d = new Date();
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${months[d.getMonth()]}-${yy}`;
};

export default function DebitEntryPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ---- Pull EVERYTHING from the debitEntry slice ----
  const {
    metaOptions,
    metaLoading,
    student,
    studentLoading,
    studentError,
    feeHeads,
    feeHeadsTotal,
    feeHeadsLoading,
    feeHeadsError,
    saving,
    saveError,
    saveSuccess,
  } = useSelector((state: RootState) => state.debitEntry);

  const [colleges, setColleges] = useState<string[]>([]);
  const [collegeName, setCollegeName] = useState("");

  // Debits From
  const [debitFrom, setDebitFrom] = useState<"Individual" | "Course">("Individual");
  const [fromMode, setFromMode] = useState<"registrationNo" | "idNo">("idNo");
  const [idNo, setIdNo] = useState("");
  const [entryDate, setEntryDate] = useState(todayStr());

  // Ledgers
  const [ledgerName, setLedgerName] = useState<"Fee" | "Hostel" | "Bus" | "Others">("Fee");
  const [othersLedgerName, setOthersLedgerName] = useState("");

  // Update Facility Detail
  const [chkHostel, setChkHostel] = useState(false);
  const [hostelName, setHostelName] = useState("");
  const [chkRoomType, setChkRoomType] = useState(false);
  const [roomType, setRoomType] = useState("");
  const [chkRoute, setChkRoute] = useState(false);
  const [route, setRoute] = useState("");
  const [chkStopage, setChkStopage] = useState(false);
  const [stopage, setStopage] = useState("");
  const [facilityAmount, setFacilityAmount] = useState("");

  // Debit panel
  const [session, setSession] = useState("2026-27");
  const [semester, setSemester] = useState("");
  const [allCategory, setAllCategory] = useState(false);
  const [category, setCategory] = useState("");
  const [allModeAdmission, setAllModeAdmission] = useState(false);
  const [modeOfAdmission, setModeOfAdmission] = useState("");
  const [refundEntry, setRefundEntry] = useState<"Yes" | "No">("No");
  const [concessionEntry, setConcessionEntry] = useState<"Yes" | "No">("No");
  const [particulars, setParticulars] = useState("Fee");
  const [debit, setDebit] = useState("");
  const [remarks, setRemarks] = useState("");

  // Heads/Credit grid selection
  const [selectedHeadIndex, setSelectedHeadIndex] = useState<number | null>(null);

  // Student's type + Student detail
  const [studentType, setStudentType] = useState<"New" | "Old">("Old");
  const [detail, setDetail] = useState({
    collegeName: "",
    course: "",
    batch: "",
    studentClass: "",
    classRollNo: "",
    uniRollNo: "",
    studentName: "",
    fatherName: "",
    motherName: "",
    scheme: "",
    dob: "",
    sex: "",
    permanentAddress: "",
    phoneNo: "",
    studentMobile: "",
    fatherMobile: "",
    motherMobile: "",
    lateralEntry: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
console.log("Student:", student);
  // ---- Effects (all state above is declared before any effect reads it) ----
// Remove the separate lowercase-checking effect entirely:
//   useEffect(() => {
//     if (student?.semester) { setSemester(student.semester); }
//   }, [student]);
//
// and fold semester + category + mobile-field fixes into the main
// student-detail effect:

useEffect(() => {
  if (student) {
    setDetail({
      collegeName: student.CollegeName || "",
      course: student.Course || "",
      batch: String(student.Batch ?? ""),
      studentClass: student.Class || "",
      classRollNo: student.ClassRollNo || "",
      uniRollNo: student.UniRollNo || "",
      studentName: student.StudentName || "",
      fatherName: student.FatherName || "",
      motherName: student.MotherName || "",
      scheme: student.Scheme || "",
      dob: student.DOB || "",
      sex: student.Sex || "",
      permanentAddress: student.PermanentAddress || "",
      phoneNo: student.PhoneNo || "",
      // Bug: these three were reading student.StudentMobile / FatherMobile /
      // MotherMobile, but the API returns *MobileNo — so these always came
      // back blank even though the data was present in the response.
      studentMobile: student.StudentMobileNo || "",
      fatherMobile: student.FatherMobileNo || "",
      motherMobile: student.MotherMobileNo || "",
      lateralEntry: student.LateralEntry === true || student.LateralEntry === "Yes",
    });
    if (student.CollegeName) setCollegeName(student.CollegeName);

    // Auto-fill semester from the student record, converted to the
    // dropdown's "Semester N" format.
    if (student.Semester) {
      setSemester(student.Semester);
    }

    // Auto-fill category too, once metaOptions.categories has loaded —
    // if it loads later, the categoriesReady-gated Search button will
    // still work with whatever the user picks/keeps.
    if (student.Category) {
      setCategory(student.Category);
    }
  }
}, [student]);
  useEffect(() => {
    reduxApiClient.get("master-course/colleges").then((res) => {
      if (res.success) setColleges(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (collegeName) {
      dispatch(fetchMetaOptions({ collegeName, route: route || undefined }));
    }
  }, [dispatch, collegeName, route]);

  useEffect(() => {
    if (student) {
      setDetail({
        collegeName: student.CollegeName || "",
        course: student.Course || "",
        batch: String(student.Batch ?? ""),
        studentClass: student.Class || "",
        classRollNo: student.ClassRollNo || "",
        uniRollNo: student.UniRollNo || "",
        studentName: student.StudentName || "",
        fatherName: student.FatherName || "",
        motherName: student.MotherName || "",
        scheme: student.Scheme || "",
        dob: student.DOB || "",
        sex: student.Sex || "",
        permanentAddress: student.PermanentAddress || "",
        phoneNo: student.PhoneNo || "",
        studentMobile: student.StudentMobile || "",
        fatherMobile: student.FatherMobile || "",
        motherMobile: student.MotherMobile || "",
        lateralEntry: !!student.LateralEntry,
      });
      if (student.CollegeName) setCollegeName(student.CollegeName);
    }
  }, [student]);

const handleIdNoBlur = () => {
  if (studentType === "Old" && idNo.trim()) {
    dispatch(fetchStudentByIdNo(idNo.trim()));
  }
};
const categoriesReady = metaOptions.categories.length > 0;

  // Search button: the fee-heads API requires idNo + semester + feeCategory
  // together, so this is a deliberate action rather than an auto-fetch on
  // every field change.
const handleSearch = () => {
  if (!idNo.trim()) {
    setSearchError("Please enter ID No.");
    return;
  }
  if (!semester) {
    setSearchError("Please select Semester.");
    return;
  }
  // if (!categoriesReady) {
  //   setSearchError("Still loading categories for this student — wait a moment and try again.");
  //   return;
  // }
  if (!category) {
    setSearchError("Please select Category.");
    return;
  }
  setSearchError(null);

  dispatch(
    fetchFeeHeads({
      idNo: idNo.trim(),
      semester,
      feeCategory: category,
    })
  );
  setSelectedHeadIndex(null);
};

  const handleStudentTypeChange = (type: "New" | "Old") => {
    setStudentType(type);
    dispatch(clearStudent());
    if (type === "New") {
      setDetail({
        collegeName: "",
        course: "",
        batch: "",
        studentClass: "",
        classRollNo: "",
        uniRollNo: "",
        studentName: "",
        fatherName: "",
        motherName: "",
        scheme: "",
        dob: "",
        sex: "",
        permanentAddress: "",
        phoneNo: "",
        studentMobile: "",
        fatherMobile: "",
        motherMobile: "",
        lateralEntry: false,
      });
    }
  };

  const detailReadOnly = studentType === "Old";

  const resetDebitFieldsOnly = () => {
    setSemester("");
    setAllCategory(false);
    setCategory("");
    setAllModeAdmission(false);
    setModeOfAdmission("");
    setRefundEntry("No");
    setConcessionEntry("No");
    setParticulars("Fee");
    setDebit("");
    setRemarks("");
    setSelectedHeadIndex(null);
  };

  const handleClear = () => {
    setIdNo("");
    setEntryDate(todayStr());
    setLedgerName("Fee");
    setOthersLedgerName("");
    setChkHostel(false);
    setHostelName("");
    setChkRoomType(false);
    setRoomType("");
    setChkRoute(false);
    setRoute("");
    setChkStopage(false);
    setStopage("");
    setFacilityAmount("");
    setSession("2026-27");
    resetDebitFieldsOnly();
    dispatch(clearStudent());
    dispatch(clearSaveStatus());
    setFormError(null);
    setSearchError(null);
  };

  const handleNewEntry = () => {
    resetDebitFieldsOnly();
    dispatch(clearSaveStatus());
  };

  const handleHeadRowClick = (index: number) => {
    const fh = feeHeads[index];
    if (!fh) return;
    setSelectedHeadIndex(index);
    setParticulars(fh.head);
    setDebit(String(fh.credit ?? ""));
  };

  const handleAdd = () => {
    if (!idNo.trim()) {
      setFormError("Please enter ID No.");
      return;
    }
    if (ledgerName === "Others" && !othersLedgerName) {
      setFormError("Please select an Others ledger");
      return;
    }
    if (!debit || Number(debit) <= 0) {
      setFormError("Please enter a valid Debit amount");
      return;
    }
    setFormError(null);

    const payload: SaveDebitPayload = {
      studentType,
      idNo: idNo.trim(),
      studentDetail:
        studentType === "New"
          ? {
              collegeName: detail.collegeName,
              course: detail.course,
              batch: detail.batch,
              studentClass: detail.studentClass,
              classRollNo: detail.classRollNo,
              uniRollNo: detail.uniRollNo,
              studentName: detail.studentName,
              fatherName: detail.fatherName,
              motherName: detail.motherName,
              scheme: detail.scheme,
              dob: detail.dob,
              sex: detail.sex,
              permanentAddress: detail.permanentAddress,
              phoneNo: detail.phoneNo,
              studentMobile: detail.studentMobile,
              fatherMobile: detail.fatherMobile,
              motherMobile: detail.motherMobile,
              lateralEntry: detail.lateralEntry,
            }
          : undefined,
      session,
      semester,
      category: allCategory ? category : undefined,
      modeOfAdmission: allModeAdmission ? modeOfAdmission : undefined,
      ledgerName,
      othersLedgerName: ledgerName === "Others" ? othersLedgerName : undefined,
      facility:
        chkHostel || chkRoomType || chkRoute || chkStopage
          ? {
              hostelName: chkHostel ? hostelName : undefined,
              roomType: chkRoomType ? roomType : undefined,
              route: chkRoute ? route : undefined,
              stopage: chkStopage ? stopage : undefined,
              amount: facilityAmount || undefined,
            }
          : undefined,
      refundEntry,
      concessionEntry,
      particulars,
      debit,
      remarks,
      dateEntry: entryDate,
    };

    dispatch(saveDebitEntry(payload));
  };

  const inputCls =
    "flex-1 border border-gray-300 h-8 px-2 rounded text-[13px] bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500";
  const labelCls = "w-36 font-semibold text-[13px] text-gray-800 shrink-0";
  const selectCls =
    "flex-1 border border-gray-300 h-8 px-2 rounded text-[13px] bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400";
  const radioCls = "flex items-center gap-1 text-[13px] font-semibold text-gray-800";
  const checkCls = "flex items-center gap-1 text-[13px] font-semibold text-gray-800";

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #eef3f9 35%, #b9d3ec 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-4">
        {/* ============ LEFT COLUMN ============ */}
        <div className="space-y-4">
          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900">
              Debits From
            </legend>
            <div className="flex items-center gap-6 mb-2">
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={debitFrom === "Individual"}
                  onChange={() => setDebitFrom("Individual")}
                />
                Individual
              </label>
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={debitFrom === "Course"}
                  onChange={() => setDebitFrom("Course")}
                />
                Course
              </label>
            </div>
            <div className="flex items-center gap-6 mb-2">
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={fromMode === "registrationNo"}
                  onChange={() => setFromMode("registrationNo")}
                />
                Registration No.
              </label>
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={fromMode === "idNo"}
                  onChange={() => setFromMode("idNo")}
                />
                ID No.
              </label>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="font-semibold text-[13px] text-gray-800 w-16">
                ID No.
              </label>
              <input
                value={idNo}
                onChange={(e) => setIdNo(e.target.value)}
                onBlur={handleIdNoBlur}
                className="w-36 border border-gray-300 h-8 px-2 rounded text-[13px] bg-white text-gray-900"
              />
              {studentLoading && (
                <span className="text-[12px] text-gray-500">Looking up…</span>
              )}
              <label className="font-semibold text-[13px] text-gray-800 ml-4 w-16">
                Date
              </label>
              <input
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-32 border border-gray-300 h-8 px-2 rounded text-[13px] bg-white text-gray-900"
              />
              <button
  type="button"
  onClick={handleSearch}
  disabled={feeHeadsLoading || (studentType === "Old" && studentLoading)}
  className="bg-blue-600 text-white font-semibold text-[13px] px-5 h-8 rounded hover:bg-blue-700 disabled:opacity-50 ml-2"
>
  {feeHeadsLoading ? "Searching..." : studentLoading ? "Loading student..." : "Search"}
</button>
            </div>
            {searchError && (
              <p className="text-red-600 text-[12px] mt-1">{searchError}</p>
            )}
            {studentError && (
              <p className="text-red-600 text-[12px] mt-1">{studentError}</p>
            )}
          </fieldset>

          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900">
              Ledgers
            </legend>
            <div className="flex items-center gap-5 flex-wrap">
              {(["Fee", "Hostel", "Bus", "Others"] as const).map((l) => (
                <label key={l} className={radioCls}>
                  <input
                    type="radio"
                    checked={ledgerName === l}
                    onChange={() => setLedgerName(l)}
                  />
                  {l}
                </label>
              ))}
              <select
                value={othersLedgerName}
                onChange={(e) => setOthersLedgerName(e.target.value)}
                disabled={ledgerName !== "Others"}
                className={selectCls + " max-w-[160px]"}
              >
                <option value="">-- select --</option>
                <option>Library Fine</option>
                <option>Exam Fee</option>
                <option>Miscellaneous</option>
              </select>
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900 flex items-center gap-2">
              Update Facility Detail
              {metaLoading && (
                <span className="text-[11px] font-normal text-gray-500">
                  (loading options…)
                </span>
              )}
            </legend>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <label className={checkCls + " w-28"}>
                  <input
                    type="checkbox"
                    checked={chkHostel}
                    onChange={(e) => setChkHostel(e.target.checked)}
                  />
                  Hostel Name
                </label>
                <select
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  disabled={!chkHostel}
                  className={selectCls}
                >
                  <option value="">-- select --</option>
                  {metaOptions.hostelNames.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className={checkCls + " w-28"}>
                  <input
                    type="checkbox"
                    checked={chkRoomType}
                    onChange={(e) => setChkRoomType(e.target.checked)}
                  />
                  Room Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  disabled={!chkRoomType}
                  className={selectCls}
                >
                  <option value="">-- select --</option>
                  {metaOptions.roomTypes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className={checkCls + " w-28"}>
                  <input
                    type="checkbox"
                    checked={chkRoute}
                    onChange={(e) => setChkRoute(e.target.checked)}
                  />
                  Route
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  disabled={!chkRoute}
                  className={selectCls}
                >
                  <option value="">-- select --</option>
                  {metaOptions.routes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className={checkCls + " w-28"}>
                  <input
                    type="checkbox"
                    checked={chkStopage}
                    onChange={(e) => setChkStopage(e.target.checked)}
                  />
                  Stopage
                </label>
                <select
                  value={stopage}
                  onChange={(e) => setStopage(e.target.value)}
                  disabled={!chkStopage}
                  className={selectCls}
                >
                  <option value="">-- select --</option>
                  {metaOptions.stopages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              <label className="font-semibold text-[13px] text-gray-800">
                Amount
              </label>
              <input
                value={facilityAmount}
                onChange={(e) => setFacilityAmount(e.target.value)}
                className="w-32 border border-gray-300 h-8 px-2 rounded text-[13px] bg-white text-gray-900"
              />
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900">
              Debit
            </legend>
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Session</label>
                  <input
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">-- select --</option>
                    {["Semester 1","Semester 2","Semester 3","Semester 4","Semester 5","Semester 6"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={checkCls + " w-36 shrink-0"}>
                    <input
                      type="checkbox"
                      checked={allCategory}
                      onChange={(e) => setAllCategory(e.target.checked)}
                    />
                    All Category
                  </label>
                  {/* Category is always selectable: Search requires a
                      feeCategory value regardless of whether "All Category"
                      is checked (that flag only affects what gets sent
                      on Save). */}
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">-- select --</option>
                    {metaOptions.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={checkCls + " w-36 shrink-0"}>
                    <input
                      type="checkbox"
                      checked={allModeAdmission}
                      onChange={(e) => setAllModeAdmission(e.target.checked)}
                    />
                    All Mode of Admission
                  </label>
                  <select
                    value={modeOfAdmission}
                    onChange={(e) => setModeOfAdmission(e.target.value)}
                    disabled={!allModeAdmission}
                    className={selectCls}
                  >
                    <option value="">-- select --</option>
                    {metaOptions.modesOfAdmission.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Refund Entry</label>
                  <select
                    value={refundEntry}
                    onChange={(e) => setRefundEntry(e.target.value as "Yes" | "No")}
                    className={selectCls}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Concession Entry</label>
                  <select
                    value={concessionEntry}
                    onChange={(e) => setConcessionEntry(e.target.value as "Yes" | "No")}
                    className={selectCls}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Particulars</label>
                  <input
                    value={particulars}
                    onChange={(e) => setParticulars(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Debit</label>
                  <input
                    value={debit}
                    onChange={(e) => setDebit(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Remarks</label>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Heads / Credit grid — surfaces feeHeads, feeHeadsTotal,
                  feeHeadsLoading and feeHeadsError from the slice */}
              <div className="w-48 h-56 border border-gray-500 bg-white shrink-0 flex flex-col overflow-hidden">
                <div className="grid grid-cols-2 bg-gray-300 text-[12px] font-bold text-gray-900 border-b border-gray-400">
                  <div className="px-2 py-1 border-r border-gray-400">Heads</div>
                  <div className="px-2 py-1 text-right">Credit</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {feeHeadsLoading ? (
                    <div className="p-2 text-[12px] text-gray-500">Loading…</div>
                  ) : feeHeadsError ? (
                    <div className="p-2 text-[12px] text-red-600">{feeHeadsError}</div>
                  ) : feeHeads.length === 0 ? (
                    <div className="p-2 text-[12px] text-gray-400">
                      No fee heads
                    </div>
                  ) : (
                    feeHeads.map((fh, i) => (
                      <div
                        key={`${fh.head}-${i}`}
                        onClick={() => handleHeadRowClick(i)}
                        className={`grid grid-cols-2 text-[12px] cursor-pointer border-b border-gray-200 ${
                          selectedHeadIndex === i
                            ? "bg-blue-600 text-white"
                            : "hover:bg-blue-50 text-gray-800"
                        }`}
                      >
                        <div className="px-2 py-1 truncate">{fh.head}</div>
                        <div className="px-2 py-1 text-right">
                          {fh.credit ? fh.credit.toLocaleString() : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 bg-gray-200 text-[12px] font-bold border-t border-gray-400">
                  <div className="px-2 py-1">Total</div>
                  <div className="px-2 py-1 text-right">
                    {feeHeadsTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-3">
              <button
                onClick={handleClear}
                className="bg-blue-600 text-white font-semibold text-[13px] px-8 h-8 rounded hover:bg-blue-700"
              >
                Clear
              </button>
            </div>
          </fieldset>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="space-y-4">
          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900">
              Student's type
            </legend>
            <div className="flex justify-center gap-10">
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={studentType === "New"}
                  onChange={() => handleStudentTypeChange("New")}
                />
                New
              </label>
              <label className={radioCls}>
                <input
                  type="radio"
                  checked={studentType === "Old"}
                  onChange={() => handleStudentTypeChange("Old")}
                />
                Old
              </label>
            </div>
          </fieldset>

          <fieldset className="border border-gray-400 rounded bg-white/70 p-3">
            <legend className="px-1 font-bold text-[13px] text-gray-900">
              Student detail
            </legend>
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className={labelCls}>CollegeName</label>
                  <select
                    value={detail.collegeName}
                    onChange={(e) => {
                      setDetail({ ...detail, collegeName: e.target.value });
                      setCollegeName(e.target.value);
                    }}
                    disabled={detailReadOnly}
                    className={selectCls}
                  >
                    <option value="">-- select --</option>
                    {colleges.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>ID No.</label>
                  <input value={idNo} readOnly className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Course</label>
                  <input
                    value={detail.course}
                    onChange={(e) => setDetail({ ...detail, course: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Batch</label>
                  <input
                    value={detail.batch}
                    onChange={(e) => setDetail({ ...detail, batch: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Class</label>
                  <input
                    value={detail.studentClass}
                    onChange={(e) => setDetail({ ...detail, studentClass: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Class Roll No</label>
                  <input
                    value={detail.classRollNo}
                    onChange={(e) => setDetail({ ...detail, classRollNo: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Uni Roll No</label>
                  <input
                    value={detail.uniRollNo}
                    onChange={(e) => setDetail({ ...detail, uniRollNo: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Name</label>
                  <input
                    value={detail.studentName}
                    onChange={(e) => setDetail({ ...detail, studentName: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                  <label className={checkCls + " ml-3 shrink-0"}>
                    <input
                      type="checkbox"
                      checked={detail.lateralEntry}
                      onChange={(e) => setDetail({ ...detail, lateralEntry: e.target.checked })}
                      disabled={detailReadOnly}
                    />
                    Lateral Entry
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Father Name</label>
                  <input
                    value={detail.fatherName}
                    onChange={(e) => setDetail({ ...detail, fatherName: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Mother Name</label>
                  <input
                    value={detail.motherName}
                    onChange={(e) => setDetail({ ...detail, motherName: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Scheme</label>
                  <input
                    value={detail.scheme}
                    onChange={(e) => setDetail({ ...detail, scheme: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>DOB</label>
                  <input
                    value={detail.dob}
                    onChange={(e) => setDetail({ ...detail, dob: e.target.value })}
                    readOnly={detailReadOnly}
                    placeholder="dd-Mon-yy"
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Sex</label>
                  <label className={radioCls}>
                    <input
                      type="radio"
                      checked={detail.sex === "Male"}
                      onChange={() => !detailReadOnly && setDetail({ ...detail, sex: "Male" })}
                      disabled={detailReadOnly}
                    />
                    Male
                  </label>
                  <label className={radioCls}>
                    <input
                      type="radio"
                      checked={detail.sex === "Female"}
                      onChange={() => !detailReadOnly && setDetail({ ...detail, sex: "Female" })}
                      disabled={detailReadOnly}
                    />
                    Female
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <label className={labelCls + " pt-1"}>Address</label>
                  <textarea
                    value={detail.permanentAddress}
                    onChange={(e) => setDetail({ ...detail, permanentAddress: e.target.value })}
                    readOnly={detailReadOnly}
                    className="flex-1 border border-gray-300 px-2 py-1 rounded text-[13px] bg-white text-gray-900 disabled:bg-gray-100 h-14 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Phone No</label>
                  <input
                    value={detail.phoneNo}
                    onChange={(e) => setDetail({ ...detail, phoneNo: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Student Mobile No</label>
                  <input
                    value={detail.studentMobile}
                    onChange={(e) => setDetail({ ...detail, studentMobile: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Father Mobile No</label>
                  <input
                    value={detail.fatherMobile}
                    onChange={(e) => setDetail({ ...detail, fatherMobile: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelCls}>Mother Mobile No</label>
                  <input
                    value={detail.motherMobile}
                    onChange={(e) => setDetail({ ...detail, motherMobile: e.target.value })}
                    readOnly={detailReadOnly}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="w-24 h-24 bg-blue-100 border border-blue-300 shrink-0" />
            </div>
          </fieldset>

          {formError && (
            <p className="text-red-600 text-[13px] font-medium text-center">
              {formError}
            </p>
          )}
          {saveError && (
            <p className="text-red-600 text-[13px] font-medium text-center">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-green-700 text-[13px] font-medium text-center">
              {saveSuccess}
            </p>
          )}

          <div className="flex justify-center gap-5">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="bg-blue-600 text-white font-semibold text-[13px] px-8 h-9 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "ADD"}
            </button>
            <button
              onClick={handleNewEntry}
              className="bg-blue-600 text-white font-semibold text-[13px] px-8 h-9 rounded hover:bg-blue-700"
            >
              New Entry
            </button>
            <button className="bg-blue-600 text-white font-semibold text-[13px] px-8 h-9 rounded hover:bg-blue-700">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}