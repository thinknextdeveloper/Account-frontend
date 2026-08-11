import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

export interface HostelReportRow {
  IDNo: number;
  RegistrationNo: number | null;
  UniRollNo: string | null;
  StudentName: string;
  Class: string;
  CollegeName: string;
  HostelName: string;
  RoomType: string | null;
  RoomNo: string | null;
}

interface HostelReportState {
  hostelNames: string[];
  rows: HostelReportRow[];
  loading: boolean;
  error: string | null;
}

const initialState: HostelReportState = {
  hostelNames: [],
  rows: [],
  loading: false,
  error: null,
};

export const fetchHostelNames = createAsyncThunk(
  "hostelReport/fetchHostelNames",
  async (_, { rejectWithValue }) => {
    const res = await reduxApiClient.get("hostel-report/hostel-names");
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

export const fetchHostelReport = createAsyncThunk(
  "hostelReport/fetchReport",
  async (
    params: { collegeName?: string; hostelName: string },
    { rejectWithValue }
  ) => {
    const res = await reduxApiClient.get("hostel-report/report", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.data;
  }
);

const hostelReportSlice = createSlice({
  name: "hostelReport",
  initialState,
  reducers: {
    clearReport(state) {
      state.rows = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHostelNames.fulfilled, (state, action: any) => {
        state.hostelNames = action.payload;
      })
      .addCase(fetchHostelReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHostelReport.fulfilled, (state, action: any) => {
        state.loading = false;
        state.rows = action.payload;
      })
      .addCase(fetchHostelReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
        state.rows = [];
      });
  },
});

export const { clearReport } = hostelReportSlice.actions;
export default hostelReportSlice.reducer;