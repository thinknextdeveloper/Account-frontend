// store/slices/DebitEntrySlice.ts

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

// store/slices/DebitEntrySlice.ts - Update the SaveDebitPayload interface

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
  feeHeads?: FeeHead[];
  userId?: number; // ✅ Added userId
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
  debit?: number;
  id?: number;
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

export interface FetchFeeHeadsParams {
  idNo: string;
  semester?: string;
  feeCategory: string;
  modeOfAdmission?: string;
}

export const fetchFeeHeads = createAsyncThunk(
  "debitEntry/fetchFeeHeads",
  async (params: FetchFeeHeadsParams, { rejectWithValue }) => {
    const queryParams: Record<string, string> = {
      idNo: params.idNo,
      feeCategory: params.feeCategory,
    };
    
    if (params.semester && params.semester.trim() !== "") {
      queryParams.semester = params.semester;
    }
    
    if (params.modeOfAdmission && params.modeOfAdmission.trim() !== "") {
      queryParams.modeOfAdmission = params.modeOfAdmission;
    }

    const res = await reduxApiClient.get("debit/fee-heads", queryParams);
    if (!res.success) return rejectWithValue(res.error?.message);
    return res.data as { success: boolean; feeHeads: FeeHead[]; totalCredit?: number };
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
  feeHeads?: FeeHead[];
}

// store/slices/DebitEntrySlice.ts - Update the saveDebitEntry

export const saveDebitEntry = createAsyncThunk(
  "debitEntry/saveDebitEntry",
  async (payload: SaveDebitPayload, { rejectWithValue }) => {
    try {
      // Make sure userId is included in the payload
      const finalPayload = {
        ...payload,
        // If userId is not set, use default 1
        userId: payload.userId || 1,
      };

      const res = await reduxApiClient.post(
        `debit/${payload.idNo}/save`,
        finalPayload
      );
      if (!res.success) return rejectWithValue(res.error?.message);
      return res.data as { message: string; receiptNo: number; transactionId: number };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to save entry");
    }
  }
);

const debitEntrySlice = createSlice({
  name: "debitEntry",
  initialState,
  reducers: {
    clearStudent(state) {
      state.student = null;
      state.studentError = null;
    },
    clearSaveStatus(state) {
      state.saveError = null;
      state.saveSuccess = null;
    },
    resetDebitEntry() {
      return initialState;
    },
    // Update a specific fee head amount
    updateFeeHeadAmount(state, action: { payload: { index: number; amount: number } }) {
      const { index, amount } = action.payload;
      if (state.feeHeads[index]) {
        state.feeHeads[index].credit = amount;
        // Recalculate total
        state.feeHeadsTotal = state.feeHeads.reduce((sum, h) => sum + (h.credit || 0), 0);
      }
    },
    // Clear all fee head amounts (set to 0) - like VB.NET Button1_Click
    clearFeeHeads(state) {
      state.feeHeads = state.feeHeads.map(fh => ({
        ...fh,
        credit: 0
      }));
      state.feeHeadsTotal = 0;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(fetchFeeHeads.pending, (state) => {
        state.feeHeadsLoading = true;
        state.feeHeadsError = null;
      })
      .addCase(fetchFeeHeads.fulfilled, (state, action: any) => {
        state.feeHeadsLoading = false;
        const heads: FeeHead[] = action.payload.feeHeads || [];
        state.feeHeads = heads;
        state.feeHeadsTotal = action.payload.totalCredit || heads.reduce((sum, h) => sum + (h.credit || 0), 0);
      })
      .addCase(fetchFeeHeads.rejected, (state, action: any) => {
        state.feeHeadsLoading = false;
        state.feeHeads = [];
        state.feeHeadsTotal = 0;
        state.feeHeadsError = action.payload || "Failed to load fee heads";
      })
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

export const { 
  clearStudent, 
  clearSaveStatus, 
  resetDebitEntry,
  updateFeeHeadAmount,
  clearFeeHeads
} = debitEntrySlice.actions;
export default debitEntrySlice.reducer;