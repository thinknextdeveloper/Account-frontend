// store/slices/DebitEntrySlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

export interface StudentDetail {
  IDNo: number | string;
  StudentType?: string;
  CollegeName: string;
  Course: string;
  Batch: number | string;
  Class: string;
  ClassRollNo: string | null;
  UniRollNo: string | null;
  StudentName: string;
  FatherName: string;
  MotherName: string | null;
  Scheme: string | null;
  DOB: string | null;
  Sex: string | null;
  PermanentAddress: string | null;
  PhoneNo: string | null;
  StudentMobile: string | null;
  FatherMobile: string | null;
  MotherMobile: string | null;
  LateralEntry: boolean;
  HostelName?: string | null;
  RoomType?: string | null;
  BusRoute?: string | null;
  Stopage?: string | null;
  Category?: string | null;
  Quota?: string | null;
  Session?: string | null;
  Semester?: string | null;
}

export interface MetaOptions {
  hostelNames: string[];
  roomTypes: string[];
  routes: string[];
  stopages: string[];
  categories: string[];
  modesOfAdmission: string[];
  currentSession: string;
}

export interface FeeHead {
  head: string;
  credit: number;
}

interface DebitEntryState {
  metaOptions: MetaOptions;
  metaLoading: boolean;

  student: StudentDetail | null;
  studentLoading: boolean;
  studentError: string | null;

  feeHeads: FeeHead[];
  feeHeadsTotal: number;
  feeHeadsLoading: boolean;
  feeHeadsError: string | null;

  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
}

const initialState: DebitEntryState = {
  metaOptions: {
    hostelNames: [],
    roomTypes: [],
    routes: [],
    stopages: [],
    categories: [],
    modesOfAdmission: [],
    currentSession: "",
  },
  metaLoading: false,

  student: null,
  studentLoading: false,
  studentError: null,

  feeHeads: [],
  feeHeadsTotal: 0,
  feeHeadsLoading: false,
  feeHeadsError: null,

  saving: false,
  saveError: null,
  saveSuccess: null,
};

export const fetchMetaOptions = createAsyncThunk(
  "debitEntry/fetchMetaOptions",
  async (
    params: { collegeName: string; route?: string },
    { rejectWithValue }
  ) => {
    const res = await reduxApiClient.get("debit/meta-options", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data as MetaOptions & { success: boolean };
  }
);

export const fetchStudentByIdNo = createAsyncThunk(
  "debitEntry/fetchStudentByIdNo",
  async (idNo: string, { rejectWithValue }) => {
    const res = await reduxApiClient.get(`debit/${idNo}`);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data.student as StudentDetail;
  }
);

// Matches the real backend contract: GET /api/debit/fee-heads
// requires idNo, semester, feeCategory as query params and returns
// { success: true, feeHeads: [{ head, credit }] } — no "total" field,
// so we compute the total client-side in the reducer below.
export interface FetchFeeHeadsParams {
  idNo: string;
  semester: string;
  feeCategory: string;
}

export const fetchFeeHeads = createAsyncThunk(
  "debitEntry/fetchFeeHeads",
  async (params: FetchFeeHeadsParams, { rejectWithValue }) => {
    const res = await reduxApiClient.get("debit/fee-heads", params as any);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data as { success: boolean; feeHeads: FeeHead[] };
  }
);

export interface SaveDebitPayload {
  studentType: "New" | "Old";
  idNo: string;
  studentDetail?: Partial<StudentDetail> & {
    collegeName: string;
    course: string;
    batch: number | string;
    studentClass: string;
    classRollNo?: string;
    uniRollNo?: string;
    studentName: string;
    fatherName: string;
    motherName?: string;
    scheme?: string;
    dob?: string;
    sex: string;
    permanentAddress?: string;
    phoneNo?: string;
    studentMobile?: string;
    fatherMobile?: string;
    motherMobile?: string;
    lateralEntry?: boolean;
  };
  session: string;
  semester?: string;
  category?: string;
  modeOfAdmission?: string;
  ledgerName: "Fee" | "Hostel" | "Bus" | "Others";
  othersLedgerName?: string;
  facility?: {
    hostelName?: string;
    roomType?: string;
    route?: string;
    stopage?: string;
    amount?: string;
  };
  refundEntry: "Yes" | "No";
  concessionEntry: "Yes" | "No";
  particulars: string;
  debit: string;
  remarks?: string;
  dateEntry?: string;
}

export const saveDebitEntry = createAsyncThunk(
  "debitEntry/saveDebitEntry",
  async (payload: SaveDebitPayload, { rejectWithValue }) => {
    const res = await reduxApiClient.post(
      `debit/${payload.idNo}/save`,
      payload
    );
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data as { message: string; receiptNo: number; transactionId: number };
  }
);

const debitEntrySlice = createSlice({
  name: "debitEntry",
  initialState,
  reducers: {
    clearStudent(state) {
      state.student = null;
      state.studentError = null;
      state.feeHeads = [];
      state.feeHeadsTotal = 0;
      state.feeHeadsError = null;
    },
    clearSaveStatus(state) {
      state.saveError = null;
      state.saveSuccess = null;
    },
    resetDebitEntry() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // meta options
      .addCase(fetchMetaOptions.pending, (state) => {
        state.metaLoading = true;
      })
      .addCase(fetchMetaOptions.fulfilled, (state, action: any) => {
        state.metaLoading = false;
        state.metaOptions = {
          hostelNames: action.payload.hostelNames || [],
          roomTypes: action.payload.roomTypes || [],
          routes: action.payload.routes || [],
          stopages: action.payload.stopages || [],
          categories: action.payload.categories || [],
          modesOfAdmission: action.payload.modesOfAdmission || [],
          currentSession: action.payload.currentSession || "",
        };
      })
      .addCase(fetchMetaOptions.rejected, (state) => {
        state.metaLoading = false;
      })

      // student lookup (Student's type = Old)
      .addCase(fetchStudentByIdNo.pending, (state) => {
        state.studentLoading = true;
        state.studentError = null;
      })
      .addCase(fetchStudentByIdNo.fulfilled, (state, action: any) => {
        state.studentLoading = false;
        state.student = action.payload;
      })
      .addCase(fetchStudentByIdNo.rejected, (state, action: any) => {
        state.studentLoading = false;
        state.student = null;
        state.studentError = action.payload || "Student not found";
      })

      // fee heads (Heads / Credit grid) — triggered by the Search button
      .addCase(fetchFeeHeads.pending, (state) => {
        state.feeHeadsLoading = true;
        state.feeHeadsError = null;
      })
      .addCase(fetchFeeHeads.fulfilled, (state, action: any) => {
        state.feeHeadsLoading = false;
        const heads: FeeHead[] = action.payload.feeHeads || [];
        state.feeHeads = heads;
        state.feeHeadsTotal = heads.reduce((sum, h) => sum + (h.credit || 0), 0);
      })
      .addCase(fetchFeeHeads.rejected, (state, action: any) => {
        state.feeHeadsLoading = false;
        state.feeHeads = [];
        state.feeHeadsTotal = 0;
        state.feeHeadsError = action.payload || "Failed to load fee heads";
      })

      // save (ADD button)
      .addCase(saveDebitEntry.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = null;
      })
      .addCase(saveDebitEntry.fulfilled, (state, action: any) => {
        state.saving = false;
        state.saveSuccess = action.payload.message;
      })
      .addCase(saveDebitEntry.rejected, (state, action: any) => {
        state.saving = false;
        state.saveError = action.payload || "Failed to save entry";
      });
  },
});

export const { clearStudent, clearSaveStatus, resetDebitEntry } =
  debitEntrySlice.actions;
export default debitEntrySlice.reducer;