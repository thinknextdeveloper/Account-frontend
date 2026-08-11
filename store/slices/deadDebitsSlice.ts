import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

export interface DeadDebitRow {
  DateEntry: string;
  CollegeName: string;
  IDNo: number;
  StudentName: string;
  Course: string;
  FatherName: string;
  Particulars: string;
  Debit: number;
  TransactionID: number;
}

interface DeadDebitsState {
  colleges: string[];
  courses: string[];
  rows: DeadDebitRow[];
  totalRecords: number;
  loading: boolean;
  deleting: boolean;
  error: string | null;
}

const initialState: DeadDebitsState = {
  colleges: [],
  courses: [],
  rows: [],
  totalRecords: 0,
  loading: false,
  deleting: false,
  error: null,
};

export const fetchDeadDebitColleges = createAsyncThunk(
  "deadDebits/fetchColleges",
  async (_, { rejectWithValue }) => {
    const res = await reduxApiClient.get("dead-debits/colleges");
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.colleges;
  }
);

export const fetchDeadDebitCourses = createAsyncThunk(
  "deadDebits/fetchCourses",
  async (collegeName: string, { rejectWithValue }) => {
    const res = await reduxApiClient.get("dead-debits/courses", { collegeName });
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.courses;
  }
);

export const fetchDeadDebits = createAsyncThunk(
  "deadDebits/fetchRows",
  async (
    params: { collegeName?: string; course?: string },
    { rejectWithValue }
  ) => {
    const query: Record<string, string> = { page: "1", pageSize: "5000" };
    if (params.collegeName) query.collegeName = params.collegeName;
    if (params.course) query.course = params.course;

    const res = await reduxApiClient.get("dead-debits", query);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data;
  }
);

export const deleteDeadDebit = createAsyncThunk(
  "deadDebits/delete",
  async (
    payload: { transactionId: number; comments: string },
    { rejectWithValue }
  ) => {
    const res = await reduxApiClient.post("dead-debits/delete", payload);
    if (!res.success) return rejectWithValue(res.error?.message);
    return payload.transactionId;
  }
);

const deadDebitsSlice = createSlice({
  name: "deadDebits",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeadDebitColleges.fulfilled, (state, action: any) => {
        state.colleges = action.payload;
      })
      .addCase(fetchDeadDebitCourses.fulfilled, (state, action: any) => {
        state.courses = action.payload;
      })
      .addCase(fetchDeadDebits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeadDebits.fulfilled, (state, action: any) => {
        state.loading = false;
        state.rows = action.payload.rows;
        state.totalRecords = action.payload.totalRecords;
      })
      .addCase(fetchDeadDebits.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteDeadDebit.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteDeadDebit.fulfilled, (state, action) => {
        state.deleting = false;
        state.rows = state.rows.filter((r) => r.TransactionID !== action.payload);
        state.totalRecords -= 1;
      })
      .addCase(deleteDeadDebit.rejected, (state, action: any) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export default deadDebitsSlice.reducer;