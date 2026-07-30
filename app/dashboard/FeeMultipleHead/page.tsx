"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/store/store";
import {
  getStudentDetails,
  saveFeeEntry,
  clearStudent,
  clearSaveStatus,
  getAdmissionMetaOptions,
  updateAdmissionMeta,
} from "@/store/slices/admissionFeeSlice";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LedgerEntry {
  DateEntry: string;
  Particulars: string;
  LedgerName: string;
  Debit: number | null;
  Credit: number | null;
  ModeOfPayment?: string | null;
}

interface FeeHeadEntry {
  Head: string;
  Debit: number | null;
  Credit: number | null;
  BalanceHeadWise: number | null;
  Concession: number | null;
}

interface SnapBuffer {
  type: "Buffer";
  data: number[];
}

interface Student {
  IDNo: string;
  StudentType: string;
  CollegeName: string;
  StudentName: string;
  FatherName: string;
  Course: string;
  Batch: number;
  Class: string;
  Session: string;
  ClassRollNo: string;
  UniRollNo: string | null;
  PermanentAddress: string;
  Sex: "Male" | "Female" | string;
  LateralEntry: "Yes" | "No" | string;
  Facility: string;
  BusRoute: string | null;
  BusFee: number | null;
  Stopage: string | null;
  HostelName: string | null;
  RoomType: string | null;
  HostelCharges: number | null;
  Scheme: string;
  Category: string;
  Quota: string;
  Snap?: SnapBuffer | string | null;
}

interface FeeRow {
  head: string;
  credit: number;
  debit: number;
  balanceHeadWise: number;
  concession: number;
}

interface ReceiptData {
  collegeName: string;
  collegeAddress: string;
  receiptNo: string | number;
  dateEntry: string;
  studentName: string;
  fatherName: string;
  sex: string;
  idNo: string;
  course: string;
  batch: number | string;
  classRollNo: string;
  uniRollNo: string | null;
  semester: string;
  onAccountOf: string;
  rows: { head: string; credit: number }[];
  totalCredit: number;
  paymentMode: string;
  lateralEntry: boolean;
  bankName?: string;
  chequeDraftLabel?: string;
  chequeDraftNo?: string;
  chequeDraftDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Static config                                                      */
/* ------------------------------------------------------------------ */

const PAYMENT_MODES = ["Cash", "Cheque", "Draft", "Other"] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number];

const SEMESTERS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];

// Placeholder bank list — in the VB app this came from MasterBank table.
// Wire this up to a real `banks` slice / endpoint when available.
const BANKS = [
  "HDFC 683",
  "ICICI 2077",
  "PNB 0000019",
  "PNB 767",
  "PNBLimit307",
  "SBI 645",
];

// Placeholder college-address lookup — in the VB app this came from a
// college/master table. Wire this up to a real backend field once
// available; until then this keeps the receipt matching the legacy printout.
const COLLEGE_ADDRESSES: Record<string, string> = {
  "Asra College of Engineering and Technology":
    "Patiala-Sangrur National Highway, Bhawanigarh, Sangrur (Pb.)",
};

function getCollegeAddress(collegeName: string | undefined | null): string {
  if (!collegeName) return "";
  return COLLEGE_ADDRESSES[collegeName] ?? "";
}

function toBackendModeOfPayment(mode: PaymentMode): string {
  if (mode === "Other") return "Bank Transfer";
  return mode;
}

function chequeDraftLabelFor(mode: PaymentMode): string {
  if (mode === "Cheque") return "Cheque No";
  if (mode === "Draft") return "Draft No";
  if (mode === "Other") return "Transaction No.";
  return "";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function snapToDataUrl(snap: Student["Snap"]): string | null {
  if (!snap) return null;
  if (typeof snap === "string") return `data:image/jpeg;base64,${snap}`;
  if (snap.type === "Buffer" && Array.isArray(snap.data)) {
    let binary = "";
    const bytes = snap.data;
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 =
      typeof window !== "undefined"
        ? window.btoa(binary)
        : Buffer.from(bytes).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  }
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
}

function todayDDMonYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function buildFeeRows(feeHeads: FeeHeadEntry[] | undefined | null): FeeRow[] {
  return (feeHeads ?? []).map((fh) => ({
    head: fh.Head,
    credit: fh.Credit || 0,
    debit: fh.Debit || 0,
    balanceHeadWise: fh.BalanceHeadWise || 0,
    concession: fh.Concession || 0,
  }));
}

function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }

  function threeDigits(n: number): string {
    if (n >= 100) {
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
    }
    return twoDigits(n);
  }

  if (num === 0) return "Zero";

  let n = num;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  let words = "";
  if (crore) words += threeDigits(crore) + " Crore ";
  if (lakh) words += threeDigits(lakh) + " Lakh ";
  if (thousand) words += threeDigits(thousand) + " Thousand ";
  if (hundred) words += threeDigits(hundred);

  return words.trim();
}

function escapeHtml(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/*  Print via a self-contained popup window                            */
/* ------------------------------------------------------------------ */

function renderReceiptCopyHtml(data: ReceiptData, copyLabel: string): string {
  const relation = data.sex === "Female" ? "D/o" : "S/o";

  const rowsHtml = data.rows
    .map(
      (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td style="text-align:left">${escapeHtml(r.head)}</td>
          <td style="text-align:right">${r.credit.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const lateralEntryRow = data.lateralEntry
    ? `<div class="receipt-row"><span>Lateral Entry : Yes</span></div>`
    : "";

  const bankRow =
    data.paymentMode !== "Cash"
      ? `<div class="receipt-row">
           <span>Bank : ${escapeHtml(data.bankName)}</span>
           <span>${escapeHtml(data.chequeDraftLabel)} : ${escapeHtml(data.chequeDraftNo)}</span>
           <span>Date : ${escapeHtml(data.chequeDraftDate)}</span>
         </div>`
      : "";

  return `
    <div class="receipt-copy">
      <div class="receipt-header">
        <div class="receipt-college">${escapeHtml(data.collegeName)}</div>
        ${data.collegeAddress ? `<div class="receipt-address">${escapeHtml(data.collegeAddress)}</div>` : ""}
        <div class="receipt-copy-label">${escapeHtml(copyLabel)}</div>
      </div>

      <div class="receipt-row">
        <span>Receipt No. ${escapeHtml(data.receiptNo)}</span>
        <span>Date : ${escapeHtml(data.dateEntry)}</span>
      </div>

      <div class="receipt-row">
        <span>Received From ${escapeHtml(data.studentName)} ${relation} ${escapeHtml(data.fatherName)}</span>
      </div>

      <div class="receipt-row">
        <span>ID/Reg. No. ${escapeHtml(data.idNo)}</span>
        <span>Class Roll No. ${escapeHtml(data.classRollNo)}</span>
      </div>

      <div class="receipt-row">
        <span>Course : ${escapeHtml(data.course)} Batch : ${escapeHtml(data.batch)}</span>
        <span>Uni Roll No. ${escapeHtml(data.uniRollNo || "")}</span>
      </div>

      <div class="receipt-row">
        <span>On account of : ${escapeHtml(data.semester)} Semester ( ${escapeHtml(data.onAccountOf)} )</span>
      </div>

      ${lateralEntryRow}

      <table class="receipt-table">
        <thead>
          <tr>
            <th>S. No.</th>
            <th style="text-align:left">Particulars</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="receipt-row">
        <span>Received Rs. ${escapeHtml(numberToWords(Math.round(data.totalCredit)))} Only</span>
        <span>Total : ${data.totalCredit.toFixed(2)}</span>
      </div>

      ${bankRow}

      <div class="receipt-row">
        <span>Mode of Payment ${escapeHtml(data.paymentMode.toUpperCase())}</span>
        <span class="receipt-signature">Cashier</span>
      </div>
    </div>
  `;
}

function printReceiptInNewWindow(data: ReceiptData): void {
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) {
    window.alert(
      "Your browser blocked the print popup. Please allow popups for this site and try again."
    );
    return;
  }

  const bodyHtml = renderReceiptCopyHtml(data, "Receipt");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(data.receiptNo)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #000;
        margin: 0;
        padding: 16px;
      }
      .receipt-copy {
        padding: 8px 0 16px 0;
      }
      .receipt-header {
        text-align: center;
        font-weight: bold;
        font-size: 15px;
        margin-bottom: 8px;
        position: relative;
      }
      .receipt-address {
        font-size: 10px;
        font-weight: normal;
        margin-top: 2px;
      }
      .receipt-copy-label {
        position: absolute;
        right: 0;
        top: 0;
        font-size: 10px;
        font-weight: normal;
      }
      .receipt-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 4px 0;
      }
      .receipt-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
      }
      .receipt-table th, .receipt-table td {
        border: 1px solid #000;
        padding: 3px 6px;
        font-size: 11px;
      }
      .receipt-signature {
        margin-top: 24px;
      }
      @media print {
        body { padding: 0; }
        .receipt-copy { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                      */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: any;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="text-[11px] font-semibold text-gray-700">{label}</label>
      <input
        value={value ?? ""}
        readOnly
        className="w-full border border-gray-400 h-7 rounded-sm px-2 bg-gray-100 text-[12px]"
      />
    </div>
  );
}

function TitleBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-b from-blue-500 to-blue-700 text-white text-[12px] font-bold px-2 py-1 rounded-t-sm border border-blue-800">
      {children}
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-gradient-to-b from-blue-500 to-blue-800 text-white text-[12px] font-semibold px-3 h-8 rounded-sm border border-blue-900 shadow disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-400 hover:to-blue-700"
    >
      {children}
    </button>
  );
}

function PlaceholderBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-400/70 border border-gray-400 ${className}`} />;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function AdmissionFeePage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { student, ledger, feeHeads, loading, error, saving, saveError, saveMessage } =
    useSelector(
      (state: RootState) =>
        state.admissionFee as {
          student: Student | null;
          ledger: LedgerEntry[];
          feeHeads: FeeHeadEntry[];
          loading: boolean;
          error: string | null;
          saving: boolean;
          saveError: string | null;
          saveMessage: string | null;
        }
    );

  const {
    schemes = [],
    categories = [],
    modesOfAdmission = [],
    currentSession = "",
    updating,
  } = useSelector((state: RootState) => state.admissionFee as any);

  const [schemeVal, setSchemeVal] = useState("");
  const [categoryVal, setCategoryVal] = useState("");
  const [quotaVal, setQuotaVal] = useState("");

  const [idNo, setIdNo] = useState("");
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("");

  const [studentTypeTab, setStudentTypeTab] = useState<"New" | "Old">("New");
  const [lateralEntry, setLateralEntry] = useState(false);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [bankName, setBankName] = useState("");
  const [chequeDraftNo, setChequeDraftNo] = useState("");
  const [chequeDraftDate, setChequeDraftDate] = useState(todayDDMonYY());

  const showBankFields = paymentMode !== "Cash";
  const chequeDraftLabel = chequeDraftLabelFor(paymentMode);
  const chequeDraftDateLabel =
    paymentMode === "Cheque"
      ? "Cheque Date"
      : paymentMode === "Draft"
        ? "Draft Date"
        : paymentMode === "Other"
          ? "Transaction Date"
          : "";

  const [feeDate, setFeeDate] = useState(todayDDMonYY());
  const [receiptNo, setReceiptNo] = useState("");
  const [onAccountOf, setOnAccountOf] = useState("");

  const [feeRows, setFeeRows] = useState<FeeRow[]>(buildFeeRows(null));

  const [formError, setFormError] = useState<string | null>(null);

  const hasStudent = !!student;

  useEffect(() => {
    if (currentSession) {
      setSession((prev) => prev || currentSession);
    }
  }, [currentSession]);

  useEffect(() => {
    if (student) {
      setSchemeVal(student.Scheme ?? "");
      setCategoryVal(student.Category ?? "");
      setQuotaVal(student.Quota ?? "");
      if (student.CollegeName) {
        dispatch(getAdmissionMetaOptions(student.CollegeName));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.IDNo]);

  const handleUpdate = () => {
    if (!idNo) return;
    dispatch(
      updateAdmissionMeta({
        idNo,
        scheme: schemeVal,
        category: categoryVal,
        quota: quotaVal,
        semester: semester || undefined,
        session: session || undefined,
      })
    );
  };

  useEffect(() => {
    if (paymentMode === "Cash") {
      setBankName("");
      setChequeDraftNo("");
      setChequeDraftDate(todayDDMonYY());
    } else {
      setChequeDraftDate(todayDDMonYY());
    }
  }, [paymentMode]);

  useEffect(() => {
    if (student) {
      setStudentTypeTab(student.StudentType === "Old" ? "Old" : "New");
      setLateralEntry(student.LateralEntry === "Yes");
      setSession((prev) => prev || student.Session || currentSession || "");
      setOnAccountOf((prev) => prev || "Fee");
      setFeeRows(buildFeeRows(feeHeads));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, feeHeads]);

  useEffect(() => {
    if (!hasStudent) {
      setReceiptNo("");
    }
  }, [hasStudent]);

  // Mirrors VB Display(): fetches the student, and if the person hasn't
  // already picked a semester, adopts whatever MasterCurrentSemester
  // resolved on the backend (ShowCurSemester equivalent) so the Semester
  // dropdown auto-fills and the Fee grid populates without a manual pick.
  const handleShow = async () => {
    if (!idNo) return;
    setFormError(null);
    dispatch(clearSaveStatus());

    try {
      const result = await dispatch(
        getStudentDetails({
          idNo,
          semester: semester || undefined,
          session: session || undefined,
        })
      ).unwrap();

      if (!semester && result.semester) {
        setSemester(result.semester);
      }
      if (result.session || result.currentSession) {
        setSession(result.session || result.currentSession);
      }
      if (result.receiptNo !== undefined && result.receiptNo !== null) {
        setReceiptNo(String(result.receiptNo));
      }
    } catch {
      // error already surfaces via the `error` banner
    }
  };

  const handleSemesterChange = (value: string) => {
    setSemester(value);
    if (idNo && hasStudent) {
      dispatch(
        getStudentDetails({
          idNo,
          semester: value || undefined,
          session: session || undefined,
        })
      );
    }
  };

  const handleClose = () => {
    dispatch(clearStudent());
    setIdNo("");
    setSession("");
    setSemester("");
    setFormError(null);
    setReceiptNo("");
    setOnAccountOf("");
    setFeeRows(buildFeeRows(null));
  };

  const handleNewEntry = () => {
    setFeeRows(buildFeeRows(feeHeads));
    setFormError(null);
    dispatch(clearSaveStatus());
  };

  const totals = useMemo(() => {
    const totalCredit = feeRows.reduce((s, r) => s + (r.credit || 0), 0);
    const totalDebit = feeRows.reduce((s, r) => s + (r.debit || 0), 0);
    const totalBalanceHeadWise = feeRows.reduce(
      (s, r) => s + (r.balanceHeadWise || 0),
      0
    );
    const totalConcession = feeRows.reduce((s, r) => s + (r.concession || 0), 0);
    return { totalCredit, totalDebit, totalBalanceHeadWise, totalConcession };
  }, [feeRows]);

  const balance = useMemo(() => {
    if (!hasStudent) return "";
    if (totals.totalCredit > 0) {
      return totals.totalBalanceHeadWise - totals.totalCredit;
    }
    return totals.totalBalanceHeadWise;
  }, [hasStudent, totals]);

  const ledgerTotals = useMemo(() => {
    const entries = ledger ?? [];
    const totalDebits = entries.reduce((s, e) => s + (e.Debit || 0), 0);
    const totalCredits = entries.reduce((s, e) => s + (e.Credit || 0), 0);
    return {
      totalDebits,
      totalCredits,
      totalBalance: totalDebits - totalCredits,
    };
  }, [ledger]);

  const updateFeeRow = (
    index: number,
    field: "credit" | "debit" | "concession",
    value: string
  ) => {
    const num = Number(value.replace(/[^0-9.-]/g, "")) || 0;
    setFeeRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: num } : r))
    );
  };

  const photoUrl = snapToDataUrl(student?.Snap ?? null);

  const validateBeforeSave = (): string | null => {
    if (!idNo) return "Please Enter ID No.";
    if (!student) return "Please Find a student first.";
    if (paymentMode === "Cheque" || paymentMode === "Draft" || paymentMode === "Other") {
      if (!bankName) return "Please Select Bank Name";
      if (!chequeDraftNo) {
        return paymentMode === "Cheque"
          ? "Please Enter Cheque No"
          : paymentMode === "Draft"
            ? "Please Enter Draft No"
            : "Please Enter Transaction No.";
      }
    }
    if (!onAccountOf) return "Please Enter OnAccountOf Value! And Try Again.";
    if (!student.CollegeName) return "Invalid College Name";
    if (!student.Course) return "Invalid Course";
    if (!student.Batch) return "Invalid Batch";
    if (!semester) return "Please Specify Semester";
    if (!student.Scheme) return "Invalid Scheme";
    if (!student.Category) return "Invalid Category";
    if (!student.Quota) return "Invalid Mode of Admission";
    if (totals.totalCredit === 0) return "Invalid Total Credit Amount";
    return null;
  };

  const handleSaveAndPrint = async () => {
    const err = validateBeforeSave();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);

    const headsPayload = feeRows
      .filter((r) => r.credit > 0)
      .map((r) => ({ head: r.head, credit: r.credit }));

    const receiptRowsSnapshot = feeRows.map((r) => ({
      head: r.head,
      credit: r.credit,
    }));
    const totalCreditSnapshot = totals.totalCredit;

    try {
      const result = await dispatch(
        saveFeeEntry({
          idNo,
          semester,
          session: session || undefined,
          onAccountOf,
          totalCredit: totals.totalCredit,
          modeOfPayment: toBackendModeOfPayment(paymentMode),
          chequeDraftDate: paymentMode !== "Cash" ? chequeDraftDate : undefined,
          chequeDraftNo: paymentMode !== "Cash" ? chequeDraftNo : undefined,
          chequeDraftBank: paymentMode !== "Cash" ? bankName : undefined,
          dateEntry: feeDate,
          feeHeads: headsPayload,
        })
      ).unwrap();

      if (student) {
        const receiptData: ReceiptData = {
          collegeName: student.CollegeName,
          collegeAddress: getCollegeAddress(student.CollegeName),
          receiptNo: result.receiptNo ?? receiptNo,
          dateEntry: feeDate,
          studentName: student.StudentName,
          fatherName: student.FatherName,
          sex: student.Sex,
          idNo: student.IDNo,
          course: student.Course,
          batch: student.Batch,
          classRollNo: student.ClassRollNo,
          uniRollNo: student.UniRollNo,
          semester,
          onAccountOf,
          rows: receiptRowsSnapshot,
          totalCredit: totalCreditSnapshot,
          paymentMode,
          lateralEntry,
          bankName: paymentMode !== "Cash" ? bankName : undefined,
          chequeDraftLabel: paymentMode !== "Cash" ? chequeDraftLabel : undefined,
          chequeDraftNo: paymentMode !== "Cash" ? chequeDraftNo : undefined,
          chequeDraftDate: paymentMode !== "Cash" ? chequeDraftDate : undefined,
        };

        printReceiptInNewWindow(receiptData);
      }
    } catch {
      // saveError from the slice already surfaces in the UI banner below
    }
  };

  return (
    <div
      className="min-h-screen p-3 text-[13px] text-gray-800"
      style={{
        background:
          "radial-gradient(ellipse at top, #cfe3f7 0%, #a9c7ea 55%, #7fa8d9 100%)",
      }}
    >
      {/* ---------- Top command bar ---------- */}
      <div className="bg-white/90 border border-gray-400 rounded-sm shadow p-2 mb-3 flex flex-wrap items-center gap-3">
        <label className="font-semibold text-[12px]">ID No</label>
        <input
          value={idNo}
          onChange={(e) => setIdNo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleShow()}
          autoFocus
          className="border-2 border-blue-600 h-8 px-2 w-32 rounded-sm text-[12px]"
        />
        <HeaderButton onClick={handleShow}>Find</HeaderButton>

        <HeaderButton onClick={() => router.push("/dashboard/FeeSingleHead")}>
          Goto Single Head
        </HeaderButton>
        <HeaderButton onClick={handleClose}>Close</HeaderButton>

        <div className="ml-auto flex items-center gap-3">
          <label className="font-semibold text-[12px]">Session</label>
          <input
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="e.g. 2026-27"
            className="border border-gray-400 h-8 px-2 w-24 rounded-sm text-[12px] bg-white"
          />
          <label className="font-semibold text-[12px]">Semester</label>
          <select
            value={semester}
            onChange={(e) => handleSemesterChange(e.target.value)}
            className="border border-gray-400 h-8 px-2 w-28 rounded-sm text-[12px] bg-white"
          >
            <option value="" />
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(loading || saving) && (
        <div className="mb-3 text-white font-semibold text-[13px]">
          {loading ? "Loading..." : "Saving..."}
        </div>
      )}

      {error && !loading && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-800 text-[12px] font-semibold px-3 py-2 rounded-sm">
          {error}
        </div>
      )}

      {formError && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-800 text-[12px] font-semibold px-3 py-2 rounded-sm">
          {formError}
        </div>
      )}

      {saveError && (
        <div className="mb-3 bg-red-100 border border-red-400 text-red-800 text-[12px] font-semibold px-3 py-2 rounded-sm">
          {saveError}
        </div>
      )}

      {saveMessage && (
        <div className="mb-3 bg-green-100 border border-green-400 text-green-800 text-[12px] font-semibold px-3 py-2 rounded-sm">
          {saveMessage}
        </div>
      )}

      {hasStudent && semester && feeRows.length === 0 && (
        <div className="mb-3 bg-yellow-100 border border-yellow-400 text-yellow-800 text-[12px] font-semibold px-3 py-2 rounded-sm">
          No fee structure found for this student's course/batch/semester/scheme/category/mode of admission.
          Check that MasterHeads and MasterAnnualFee are configured for {student?.CollegeName}.
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* =========================== LEFT COLUMN =========================== */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
          {/* --- Facility Opted --- */}
          <div className="bg-white/95 border border-gray-400 rounded-sm shadow">
            <TitleBar>Facility Opted</TitleBar>
            <div className="p-3 grid grid-cols-2 gap-3">
              <Field label="Hostel Name" value={student?.HostelName} />
              <Field label="Room-Type" value={student?.RoomType} />
              <Field label="Route" value={student?.BusRoute} />
              <Field label="Stopage" value={student?.Stopage} />
              <div>
                <label className="text-[11px] font-semibold text-gray-700">
                  Credit
                </label>
                <input
                  readOnly
                  value={
                    hasStudent
                      ? fmtNum(student?.HostelCharges ?? student?.BusFee ?? 0)
                      : ""
                  }
                  className="w-full border border-gray-400 h-7 rounded-sm px-2 bg-gray-100 text-[12px]"
                />
              </div>
            </div>
          </div>

          {/* --- Student detail --- */}
          <div className="bg-white/95 border border-gray-400 rounded-sm shadow">
            <TitleBar>Student detail</TitleBar>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-[12px] font-semibold">
                  <input type="radio" checked={studentTypeTab === "New"} disabled />
                  New
                </label>

                <label className="flex items-center gap-1 text-[12px] font-semibold">
                  <input type="radio" checked={studentTypeTab === "Old"} disabled />
                  Old
                </label>

                <label className="flex items-center gap-1 text-[12px] font-semibold ml-4">
                  <input type="checkbox" checked={lateralEntry} readOnly />
                  Lateral Entry
                </label>

                <HeaderButton onClick={handleUpdate} disabled={!hasStudent || updating}>
                  {updating ? "Updating..." : "Update"}
                </HeaderButton>
              </div>

              <div className="flex items-end gap-4">
                <div className="w-40">
                  <label className="text-[11px] font-semibold text-gray-700">Scheme</label>
                  <select
                    value={schemeVal}
                    onChange={(e) => setSchemeVal(e.target.value)}
                    className="w-full border border-gray-400 h-7 rounded-sm px-1 bg-white text-[12px]"
                  >
                    <option value=""></option>
                    {schemes.map((s: string, index: number) => (
                      <option key={index} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-gray-700 leading-tight w-14">
                    Mode of
                    <br />
                    Admission
                  </label>
                  <select
                    value={quotaVal}
                    onChange={(e) => setQuotaVal(e.target.value)}
                    className="w-32 border border-gray-400 h-7 rounded-sm px-1 bg-white text-[12px]"
                  >
                    <option value=""></option>
                    {modesOfAdmission.map((m: string, index: number) => (
                      <option key={index} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-40">
                <label className="text-[11px] font-semibold text-gray-700">Category</label>
                <select
                  value={categoryVal}
                  onChange={(e) => setCategoryVal(e.target.value)}
                  className="w-full border border-gray-400 h-7 rounded-sm px-1 bg-white text-[12px]"
                >
                  <option value=""></option>
                  {categories.map((c: string, index: number) => (
                    <option key={index} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Field label="CollegeName" value={student?.CollegeName} />

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Field label="Name" value={student?.StudentName} />
                  <Field label="Father Name" value={student?.FatherName} />
                  <Field label="Course" value={student?.Course} />
                  <Field label="Batch" value={student?.Batch} />
                </div>
                <div className="w-28 shrink-0">
                  <div className="border border-gray-400 w-28 h-32 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt="Student"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <Field label="Class" value={student?.Class} />

              <div>
                <label className="text-[11px] font-semibold text-gray-700">
                  Gender
                </label>
                <div className="flex items-center gap-3 h-7">
                  <label className="flex items-center gap-1 text-[12px]">
                    <input type="radio" checked={student?.Sex === "Male"} readOnly />
                    Male
                  </label>
                  <label className="flex items-center gap-1 text-[12px]">
                    <input
                      type="radio"
                      checked={student?.Sex === "Female"}
                      readOnly
                    />
                    Female
                  </label>
                </div>
              </div>

              <Field label="Class Roll No" value={student?.ClassRollNo} />
              <Field label="Univ Roll No." value={student?.UniRollNo} />
              <Field label="Address" value={student?.PermanentAddress} />
            </div>
          </div>

          {/* --- Ledger table --- */}
          <div className="bg-white/95 border border-gray-400 rounded-sm shadow">
            {hasStudent ? (
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left w-6"></th>
                      <th className="border border-gray-300 px-2 py-1 text-left">
                        Date Entry
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-left">
                        Particulars
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-left">
                        Ledger Name
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-left">
                        Mode of Payment
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-right">
                        Debit
                      </th>
                      <th className="border border-gray-300 px-2 py-1 text-right">
                        Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger ?? []).map((entry, i) => (
                      <tr key={i} className={i === 0 ? "bg-blue-50" : "bg-white"}>
                        <td className="border border-gray-300 px-2 text-blue-700">
                          {i === 0 ? "\u25B6" : ""}
                        </td>
                        <td className="border border-gray-300 px-2 text-blue-800">
                          {formatDate(entry.DateEntry)}
                        </td>
                        <td className="border border-gray-300 px-2">
                          {entry.Particulars}
                        </td>
                        <td className="border border-gray-300 px-2">
                          {entry.LedgerName}
                        </td>
                        <td className="border border-gray-300 px-2">
                          {entry.ModeOfPayment ?? ""}
                        </td>
                        <td className="border border-gray-300 px-2 text-right">
                          {fmtNum(entry.Debit)}
                        </td>
                        <td className="border border-gray-300 px-2 text-right">
                          {fmtNum(entry.Credit)}
                        </td>
                      </tr>
                    ))}
                    {(!ledger || ledger.length === 0) && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center text-gray-500 py-3 border border-gray-300"
                        >
                          No ledger entries
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <PlaceholderBlock className="h-40" />
            )}
          </div>

          {/* --- Ledger totals footer --- */}
          <div className="flex gap-6 px-1 text-[13px] font-semibold text-gray-800">
            <span>
              Total Debits : {hasStudent ? fmtNum(ledgerTotals.totalDebits) : ""}
            </span>
            <span>
              Total Credits : {hasStudent ? fmtNum(ledgerTotals.totalCredits) : ""}
            </span>
            <span>
              Total Balance : {hasStudent ? fmtNum(ledgerTotals.totalBalance) : ""}
            </span>
          </div>
        </div>

        {/* =========================== RIGHT COLUMN =========================== */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          {/* --- Payment --- */}
          <div className="bg-white/95 border border-gray-400 rounded-sm shadow">
            <TitleBar>Payment</TitleBar>
            <div className="p-3">
              <div className="flex gap-5">
                {PAYMENT_MODES.map((mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-1 text-[12px] font-medium"
                  >
                    <input
                      type="radio"
                      checked={paymentMode === mode}
                      onChange={() => setPaymentMode(mode)}
                    />
                    {mode}
                  </label>
                ))}
              </div>

              {showBankFields && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="relative">
                    <label className="text-[12px] font-semibold block mb-1">
                      Bank Name :
                    </label>
                    <div className="flex items-center gap-1">
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="border border-gray-400 h-8 px-2 w-40 rounded-sm text-[12px] bg-white"
                      >
                        <option value=""></option>
                        {BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="border border-gray-400 h-8 w-8 rounded-sm bg-gray-100 hover:bg-gray-200 text-[12px]"
                        title="Manage banks"
                      >
                        ...
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold block mb-1">
                      {chequeDraftLabel}
                    </label>
                    <input
                      value={chequeDraftNo}
                      onChange={(e) => setChequeDraftNo(e.target.value)}
                      className="border border-gray-400 h-8 px-2 w-32 rounded-sm text-[12px]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold block mb-1">
                      {chequeDraftDateLabel}
                    </label>
                    <input
                      value={chequeDraftDate}
                      onChange={(e) => setChequeDraftDate(e.target.value)}
                      className="border border-gray-400 h-8 px-2 w-28 rounded-sm text-[12px] text-orange-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Fee --- */}
          <div className="bg-white/95 border border-gray-400 rounded-sm shadow">
            <TitleBar>Fee</TitleBar>
            <div className="p-3">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <label className="text-[12px] font-semibold">Date</label>
                <input
                  value={feeDate}
                  onChange={(e) => setFeeDate(e.target.value)}
                  className="border border-gray-400 h-7 px-2 w-28 rounded-sm text-[12px] text-orange-600"
                />
                <label className="text-[12px] font-semibold ml-4">
                  Receipt No.
                </label>
                <input
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className={`h-7 px-2 w-16 rounded-sm text-[12px] font-semibold ${hasStudent
                      ? "border-2 border-red-500 text-red-700"
                      : "border border-gray-400"
                    }`}
                />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="text-[12px] font-semibold">On Account Of</label>
                <input
                  value={onAccountOf}
                  onChange={(e) => setOnAccountOf(e.target.value)}
                  className="border border-gray-400 h-7 px-2 flex-1 rounded-sm text-[12px]"
                />
              </div>

              {hasStudent ? (
                <div className="max-h-56 overflow-y-auto border border-gray-300">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-gray-200">
                      <tr>
                        <th className="border border-gray-300 px-2 py-1 text-left w-6"></th>
                        <th className="border border-gray-300 px-2 py-1 text-left">
                          Head
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-right">
                          Credit
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-right">
                          Debit
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-right">
                          Balance
                          <br />
                          Head-Wise
                        </th>
                        <th className="border border-gray-300 px-2 py-1 text-right">
                          Concession
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeRows.map((row, i) => (
                        <tr
                          key={row.head}
                          className={i === 0 ? "bg-blue-100" : "bg-gray-50"}
                        >
                          <td className="border border-gray-300 px-2 text-blue-700">
                            {i === 0 ? "\u25B6" : ""}
                          </td>
                          <td
                            className={`border border-gray-300 px-2 ${i === 0 ? "font-bold text-blue-900" : ""
                              }`}
                          >
                            {row.head}
                          </td>
                          <td className="border border-gray-300 p-0">
                            <input
                              value={row.credit}
                              onChange={(e) =>
                                updateFeeRow(i, "credit", e.target.value)
                              }
                              className="w-full h-6 text-right px-1 bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 p-0">
                            <input
                              value={row.debit}
                              onChange={(e) =>
                                updateFeeRow(i, "debit", e.target.value)
                              }
                              className="w-full h-6 text-right px-1 bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 text-right bg-gray-300 text-gray-600">
                            {fmtNum(row.balanceHeadWise)}
                          </td>
                          <td className="border border-gray-300 p-0 bg-gray-300">
                            <input
                              value={row.concession}
                              onChange={(e) =>
                                updateFeeRow(i, "concession", e.target.value)
                              }
                              className="w-full h-6 text-right px-1 bg-gray-300"
                            />
                          </td>
                        </tr>
                      ))}
                      {feeRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-500 py-3 border border-gray-300">
                            {semester ? "No fee structure configured" : "Select a semester"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <PlaceholderBlock className="h-64" />
              )}

              <div className="mt-3 flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[12px] font-semibold block mb-1">
                    Total Amount
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    <input
                      readOnly
                      value={hasStudent ? fmtNum(totals.totalCredit) : ""}
                      className="border border-gray-400 h-7 px-1 text-right rounded-sm text-[12px] bg-gray-100"
                    />
                    <input
                      readOnly
                      value={hasStudent ? fmtNum(totals.totalDebit) : ""}
                      className="border border-gray-400 h-7 px-1 text-right rounded-sm text-[12px] bg-gray-100"
                    />
                    <input
                      readOnly
                      value={hasStudent ? fmtNum(totals.totalBalanceHeadWise) : ""}
                      className="border border-gray-400 h-7 px-1 text-right rounded-sm text-[12px] bg-gray-100"
                    />
                    <input
                      readOnly
                      value={hasStudent ? fmtNum(totals.totalConcession) : ""}
                      className="border border-gray-400 h-7 px-1 text-right rounded-sm text-[12px] bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[12px] font-semibold block mb-1">
                  Balalnce
                </label>
                <input
                  readOnly
                  value={hasStudent ? fmtNum(Number(balance) || 0) : ""}
                  className="border border-gray-400 h-8 px-2 w-full rounded-sm text-[12px] bg-gray-100"
                />
              </div>

              <div className="mt-3 flex gap-3">
                <HeaderButton
                  disabled={!hasStudent || saving}
                  onClick={handleSaveAndPrint}
                >
                  {saving ? "Saving..." : "Save and Print"}
                </HeaderButton>
                <HeaderButton onClick={handleNewEntry}>New Entry</HeaderButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}