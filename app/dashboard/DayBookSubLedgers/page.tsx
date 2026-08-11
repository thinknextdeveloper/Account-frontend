"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store"; // adjust to your actual store path
import {
  fetchColleges,
  fetchCourses,
  fetchBatches,
  fetchSemesters,
  fetchSessions,
  fetchLedgerNames,
  fetchFeeReport,
  clearReport,
  resetCascade,
} from "@/store/slices/Feereportslice"; // adjust to your actual slice path

const COLORS = {
  pageBg: "#eef3f8",
  panelBg: "#ffffff",
  panelBorder: "#7fa3c9",
  labelText: "#1a2b3c",
  fieldBg: "#ffffff",
  fieldBorder: "#5b7fa6",
  fieldText: "#0f1c29",
  headerBg: "#2f5d8a",
  headerText: "#ffffff",
  rowText: "#1a2b3c",
  totalRowBg: "#dfeaf5",
  buttonBg: "#2f5d8a",
  buttonText: "#ffffff",
  buttonDisabledBg: "#b8c7d6",
  errorText: "#c62828",
  noRecordsText: "#5b7fa6",
};

export default function FeeReportPage() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    colleges,
    courses,
    batches,
    semesters,
    sessions,
    ledgerNames,
    rows,
    ledgerColumns,
    totalRecords,
    loading,
    error,
  } = useSelector((state: RootState) => state.feeReport);

  const [collegeName, setCollegeName] = useState("");
  const [course, setCourse] = useState("");
  const [batch, setBatch] = useState("");
  const [semester, setSemester] = useState("");
  const [session, setSession] = useState("");
  const [ledgerName, setLedgerName] = useState("");
  const [allSubLedgers, setAllSubLedgers] = useState(false);
  const [betweenTwoDates, setBetweenTwoDates] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    dispatch(fetchColleges());
    dispatch(fetchSessions());
  }, [dispatch]);

  useEffect(() => {
    dispatch(resetCascade("college"));
    setCourse("");
    setBatch("");
    setSemester("");
    setLedgerName("");
    if (!collegeName) return;
    dispatch(fetchCourses(collegeName));
    dispatch(fetchLedgerNames(collegeName));
  }, [collegeName, dispatch]);

  useEffect(() => {
    dispatch(resetCascade("course"));
    setBatch("");
    setSemester("");
    if (!collegeName) return;
    dispatch(fetchBatches({ collegeName, course: course || undefined }));
  }, [collegeName, course, dispatch]);

  useEffect(() => {
    dispatch(resetCascade("batch"));
    setSemester("");
    if (!collegeName || !batch) return;
    dispatch(fetchSemesters({ collegeName, batch, course: course || undefined }));
  }, [collegeName, batch, course, dispatch]);

  const canDisplay = useMemo(() => {
    if (!collegeName) return false;
    if (!allSubLedgers && !ledgerName) return false;
    if (betweenTwoDates && (!dateFrom || !dateTo)) return false;
    return true;
  }, [collegeName, allSubLedgers, ledgerName, betweenTwoDates, dateFrom, dateTo]);

  // Only ever pass fields that have a real value — the thunk itself also
  // guards against this, but keeping it clean here too avoids relying on
  // a single layer of defense against accidentally serializing `undefined`
  // as the literal string "undefined" in the querystring.
  const handleDisplay = () => {
    setHasSearched(true);
    dispatch(
      fetchFeeReport({
        collegeName,
        course: course || undefined,
        batch: batch || undefined,
        semester: semester || undefined,
        session: session || undefined,
        ledgerName: !allSubLedgers && ledgerName ? ledgerName : undefined,
        allSubLedgers,
        dateFrom: betweenTwoDates && dateFrom ? dateFrom : undefined,
        dateTo: betweenTwoDates && dateTo ? dateTo : undefined,
      })
    );
  };

  const handleExportToExcel = async () => {
    if (rows.length === 0) return;
    const XLSX = await import("xlsx");
    const exportRows = rows.map((row: any) => {
      const base: Record<string, string | number | null> = {
        DateEntry: row.DateEntry,
        DayBookDateEntry: row.DayBookDateEntry,
        ReceiptNo: row.ReceiptNo,
        IDNo: row.IDNo,
        ClassRollNo: row.ClassRollNo,
        UniRollNo: row.UniRollNo,
        StudentName: row.StudentName,
        FatherName: row.FatherName,
      };
      ledgerColumns.forEach((col: string) => {
        base[col] = row[col] ?? row.Amount ?? 0;
      });
      base.Total = row.Total ?? row.Amount ?? 0;
      return base;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Report");
    XLSX.writeFile(workbook, `fee-report-${Date.now()}.xlsx`);
  };

  const handleClose = () => {
    setHasSearched(false);
    dispatch(clearReport());
  };

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    ledgerColumns.forEach((col: string) => {
      t[col] = rows.reduce((sum: number, r: any) => sum + (Number(r[col] ?? r.Amount) || 0), 0);
    });
    t.Total = rows.reduce((sum: number, r: any) => sum + (Number(r.Total ?? r.Amount) || 0), 0);
    return t;
  }, [rows, ledgerColumns]);

  const totalColumnCount = 9 + ledgerColumns.length; // 8 fixed cols + Total + dynamic ledger cols

  return (
    <div style={{ padding: 16, fontFamily: "Segoe UI, Tahoma, sans-serif", background: COLORS.pageBg, minHeight: "100vh", colorScheme: "light" }}>
      <fieldset
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: COLORS.panelBorder,
          borderRadius: 6,
          padding: 16,
          background: COLORS.panelBg,
        }}
      >
        <legend style={{ fontWeight: 700, padding: "0 8px", color: COLORS.labelText, fontSize: 15 }}>
          Search
        </legend>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr auto 1fr", gap: "12px 14px", alignItems: "center" }}>
          <label style={labelStyle}>College Name</label>
          <select style={fieldStyle} value={collegeName} onChange={(e) => setCollegeName(e.target.value)}>
            <option value="">-- Select --</option>
            {colleges.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={labelStyle}>Course</label>
          <select style={fieldStyle} value={course} onChange={(e) => setCourse(e.target.value)} disabled={!collegeName}>
            <option value="">-- Select --</option>
            {courses.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={allSubLedgers}
              onChange={(e) => setAllSubLedgers(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.buttonBg }}
            />
            All Sub Ledgers
          </label>
          <select style={fieldStyle} value={ledgerName} onChange={(e) => setLedgerName(e.target.value)} disabled={!collegeName || allSubLedgers}>
            <option value="">-- Select --</option>
            {ledgerNames.map((l: string) => <option key={l} value={l}>{l}</option>)}
          </select>

          <label style={labelStyle}>Batch</label>
          <select style={fieldStyle} value={batch} onChange={(e) => setBatch(e.target.value)} disabled={!collegeName}>
            <option value="">-- Select --</option>
            {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>

          <label style={labelStyle}>Semester</label>
          <select style={fieldStyle} value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!batch}>
            <option value="">-- Select --</option>
            {semesters.map((s: any) => <option key={s.semesterId} value={s.semester}>{s.semester}</option>)}
          </select>

          <label style={labelStyle}>Session</label>
          <select style={fieldStyle} value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="">-- Select --</option>
            {sessions.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={betweenTwoDates}
              onChange={(e) => setBetweenTwoDates(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.buttonBg }}
            />
            Between Two Dates :
          </label>
          {betweenTwoDates && (
            <>
              <input type="date" style={fieldStyle} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span style={{ color: COLORS.labelText }}>to</span>
              <input type="date" style={fieldStyle} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={handleDisplay} disabled={!canDisplay || loading} style={canDisplay && !loading ? buttonStyle : buttonDisabledStyle}>
              {loading ? "Loading..." : "Display"}
            </button>
            <button onClick={handleExportToExcel} disabled={rows.length === 0} style={rows.length ? buttonStyle : buttonDisabledStyle}>
              Export To Excel
            </button>
            <button onClick={handleClose} style={buttonStyle}>
              Close
            </button>
          </div>
        </div>
      </fieldset>

      {error && (
        <div style={{ marginTop: 12, color: COLORS.errorText, fontWeight: 700 }}>{error}</div>
      )}

      <div style={{ marginTop: 16, fontWeight: 700, color: COLORS.labelText, fontSize: 15 }}>
        Total Records : {totalRecords}
      </div>

      <div style={{ marginTop: 8, overflowX: "auto", borderWidth: 2, borderStyle: "solid", borderColor: COLORS.panelBorder, borderRadius: 4 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: COLORS.panelBg }}>
          <thead>
            <tr style={{ background: COLORS.headerBg }}>
              <th style={thStyle}>DateEntry</th>
              <th style={thStyle}>DayBookDateEntry</th>
              <th style={thStyle}>ReceiptNo</th>
              <th style={thStyle}>IDNo</th>
              <th style={thStyle}>ClassRollNo</th>
              <th style={thStyle}>UniRollNo</th>
              <th style={thStyle}>StudentName</th>
              <th style={thStyle}>FatherName</th>
              {ledgerColumns.map((col: string) => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {hasSearched && !loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={totalColumnCount}
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: COLORS.noRecordsText,
                    fontWeight: 700,
                    fontSize: 14,
                    background: "#f4f8fc",
                  }}
                >
                  No Records Found
                </td>
              </tr>
            )}

            {rows.map((row: any, i: number) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f4f8fc" }}>
                <td style={tdStyle}>{row.DateEntry}</td>
                <td style={tdStyle}>{row.DayBookDateEntry}</td>
                <td style={tdStyle}>{row.ReceiptNo}</td>
                <td style={tdStyle}>{row.IDNo}</td>
                <td style={tdStyle}>{row.ClassRollNo}</td>
                <td style={tdStyle}>{row.UniRollNo}</td>
                <td style={tdStyle}>{row.StudentName}</td>
                <td style={tdStyle}>{row.FatherName}</td>
                {ledgerColumns.map((col: string) => (
                  <td key={col} style={tdStyle}>{row[col] ?? row.Amount ?? 0}</td>
                ))}
                <td style={tdStyle}>{row.Total ?? row.Amount ?? 0}</td>
              </tr>
            ))}

            {rows.length > 0 && (
              <tr style={{ background: COLORS.totalRowBg, fontWeight: 700 }}>
                <td style={tdStyle} colSpan={7}></td>
                <td style={tdStyle}>Total</td>
                {ledgerColumns.map((col: string) => (
                  <td key={col} style={tdStyle}>{totals[col]}</td>
                ))}
                <td style={tdStyle}>{totals.Total}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: COLORS.labelText,
  fontSize: 14,
};

const fieldStyle: React.CSSProperties = {
  background: COLORS.fieldBg,
  color: COLORS.fieldText,
  borderWidth: 1.5,
  borderStyle: "solid",
  borderColor: COLORS.fieldBorder,
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: 14,
  width: "100%",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderWidth: 1.5,
  borderStyle: "solid",
  borderColor: COLORS.buttonBg,
  borderRadius: 4,
  background: COLORS.buttonBg,
  color: COLORS.buttonText,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  background: COLORS.buttonDisabledBg,
  borderColor: COLORS.buttonDisabledBg,
  color: "#ffffff",
  cursor: "not-allowed",
};

const thStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: COLORS.panelBorder,
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 13,
  color: COLORS.headerText,
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#c7d7e6",
  padding: "7px 10px",
  fontSize: 13,
  color: COLORS.rowText,
};