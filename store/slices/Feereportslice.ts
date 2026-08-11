import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

export interface FeeReportRow {
  TransactionID: number;
  DateEntry: string;
  DayBookDateEntry: string;
  ReceiptNo: number | null;
  IDNo: number;
  ClassRollNo: string | null;
  UniRollNo: string | null;
  StudentName: string;
  FatherName: string;
  Total: number;
  [ledgerColumn: string]: string | number | null;
}

export interface Semester {
  semester: string;
  semesterId: number;
}

interface FeeReportFilters {
  collegeName: string;
  course?: string;
  batch?: string;
  semester?: string;
  session?: string;
  ledgerName?: string;
  allSubLedgers: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface FeeReportState {
  colleges: string[];
  courses: string[];
  batches: string[];
  semesters: Semester[];
  sessions: string[];
  ledgerNames: string[];
  rows: FeeReportRow[];
  ledgerColumns: string[];
  totalRecords: number;
  loading: boolean;
  error: string | null;
}

const initialState: FeeReportState = {
  colleges: [],
  courses: [],
  batches: [],
  semesters: [],
  sessions: [],
  ledgerNames: [],
  rows: [],
  ledgerColumns: [],
  totalRecords: 0,
  loading: false,
  error: null,
};

export const fetchColleges = createAsyncThunk(
  "feeReport/fetchColleges",
  async (_: void, { rejectWithValue }) => {
    const res = await reduxApiClient.get("master-course/colleges");
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchCourses = createAsyncThunk(
  "feeReport/fetchCourses",
  async (collegeName: string, { rejectWithValue }) => {
    const res = await reduxApiClient.get("master-course/courses", { collegeName });
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchBatches = createAsyncThunk(
  "feeReport/fetchBatches",
  async (params: { collegeName: string; course?: string }, { rejectWithValue }) => {
    const res = await reduxApiClient.get("master-course/batches", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchSemesters = createAsyncThunk(
  "feeReport/fetchSemesters",
  async (
    params: { collegeName: string; batch: string; course?: string },
    { rejectWithValue }
  ) => {
    const res = await reduxApiClient.get("master-course/semesters", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchSessions = createAsyncThunk(
  "feeReport/fetchSessions",
  async (_: void, { rejectWithValue }) => {
    const res = await reduxApiClient.get("fee-report/sessions");
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

// Points at the fee-report module's own ledger-names endpoint (backed by
// SubLedgers.Subhead, scoped by college), not the `concession` feature's
// endpoint — the two are not guaranteed to return the same values.
export const fetchLedgerNames = createAsyncThunk(
  "feeReport/fetchLedgerNames",
  async (collegeName: string, { rejectWithValue }) => {
    const res = await reduxApiClient.get("fee-report/ledger-names", { collegeName });
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchFeeReport = createAsyncThunk(
  "feeReport/fetchReport",
  async (filters: FeeReportFilters, { rejectWithValue }) => {
    // Build the query params object with ONLY defined, non-empty values —
    // never spread `filters` directly, since optional fields come through
    // as real `undefined`, and whatever reduxApiClient uses to serialize
    // params stringifies that as the literal text "undefined" rather than
    // omitting the key.
    const params: Record<string, string> = {
      collegeName: filters.collegeName,
      allSubLedgers: String(filters.allSubLedgers),
    };
    if (filters.course) params.course = filters.course;
    if (filters.batch) params.batch = filters.batch;
    if (filters.semester) params.semester = filters.semester;
    if (filters.session) params.session = filters.session;
    if (filters.ledgerName) params.ledgerName = filters.ledgerName;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    const res = await reduxApiClient.get("fee-report/report", params);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data;
  }
);

const feeReportSlice = createSlice({
  name: "feeReport",
  initialState,
  reducers: {
    clearReport(state) {
      state.rows = [];
      state.ledgerColumns = [];
      state.totalRecords = 0;
      state.error = null;
    },
    resetCascade(state, action: { payload: "college" | "course" | "batch" }) {
      if (action.payload === "college") {
        state.courses = [];
        state.batches = [];
        state.semesters = [];
        state.ledgerNames = [];
      }
      if (action.payload === "course") {
        state.batches = [];
        state.semesters = [];
      }
      if (action.payload === "batch") {
        state.semesters = [];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchColleges.fulfilled, (state, action: any) => {
        state.colleges = action.payload;
      })
      .addCase(fetchCourses.fulfilled, (state, action: any) => {
        state.courses = action.payload;
      })
      .addCase(fetchBatches.fulfilled, (state, action: any) => {
        state.batches = action.payload;
      })
      .addCase(fetchSemesters.fulfilled, (state, action: any) => {
        state.semesters = action.payload;
      })
      .addCase(fetchSessions.fulfilled, (state, action: any) => {
        state.sessions = action.payload;
      })
      .addCase(fetchLedgerNames.fulfilled, (state, action: any) => {
        state.ledgerNames = action.payload;
      })
      .addCase(fetchFeeReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeReport.fulfilled, (state, action: any) => {
        state.loading = false;
        state.rows = action.payload.data;
        state.ledgerColumns = action.payload.ledgerColumns;
        state.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchFeeReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
        state.rows = [];
        state.ledgerColumns = [];
        state.totalRecords = 0;
      });
  },
});

export const { clearReport, resetCascade } = feeReportSlice.actions;
export default feeReportSlice.reducer;