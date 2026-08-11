import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

export interface ConcessionRow {
  RegistrationNo: number | null;
  IDNo: number;
  UniRollNo: string | null;
  StudentName: string;
  Class: string;
  LedgerName: string;
  ConcessionGiven: number;
}

interface ConcessionState {
  ledgerNames: string[];
  rows: ConcessionRow[];
  loading: boolean;
  error: string | null;
}

const initialState: ConcessionState = {
  ledgerNames: [],
  rows: [],
  loading: false,
  error: null,
};

export const fetchLedgerNames = createAsyncThunk(
  "concession/fetchLedgerNames",
  async (collegeName: string, { rejectWithValue }) => {
    const res = await reduxApiClient.get("concession/ledger-names", { collegeName });
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchConcessionReport = createAsyncThunk(
  "concession/fetchReport",
  async (
    params: { collegeName: string; ledgerName?: string },
    { rejectWithValue }
  ) => {
    const res = await reduxApiClient.get("concession/report", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

const concessionSlice = createSlice({
  name: "concession",
  initialState,
  reducers: {
    clearReport(state) {
      state.rows = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLedgerNames.fulfilled, (state, action: any) => {
        state.ledgerNames = action.payload;
      })
      .addCase(fetchConcessionReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConcessionReport.fulfilled, (state, action: any) => {
        state.loading = false;
        state.rows = action.payload;
      })
      .addCase(fetchConcessionReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
        state.rows = [];
      });
  },
});

export const { clearReport } = concessionSlice.actions;
export default concessionSlice.reducer;