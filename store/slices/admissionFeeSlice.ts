import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reduxApiClient } from "@/services/reduxservices";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LedgerEntry {
  DateEntry: string;
  Particulars: string;
  LedgerName: string;
  Debit: number | null;
  Credit: number | null;
  Semester?: string;
  ReceiptType?: string;
  ModeOfPayment?: string | null;
}

// Matches getFeeStructureWithBalances' output shape exactly — Head is the
// real fee-head name (Academic Fee, Bus Fee, ...), Debit is the amount
// owed per MasterAnnualFee config, Credit/BalanceHeadWise is what's been
// paid so far from SubLedgers.
export interface FeeHeadEntry {
  Head: string;
  Debit: number;
  Credit: number;
  BalanceHeadWise: number;
  Concession: number;
}

export interface Student {
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
  Sex: string;
  LateralEntry: string;
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
  Snap?: { type: "Buffer"; data: number[] } | string | null;
}

interface GetStudentArgs {
  idNo: string;
  semester?: string;
  session?: string;
  scheme?: string;
  category?: string;
  modeOfAdmission?: string;
}

interface SaveFeeArgs {
  idNo: string;
  semester: string;
  session?: string;
  onAccountOf: string;
  totalCredit: number;
  modeOfPayment: string;
  chequeDraftDate?: string;
  chequeDraftNo?: string;
  chequeDraftBank?: string;
  dateEntry?: string;
  feeHeads: { head: string; credit: number }[];
}

interface UpdateAdmissionMetaArgs {
  idNo: string;
  scheme: string;
  category: string;
  quota: string;
  semester?: string;
  session?: string;
}

interface AdmissionFeeState {
  student: Student | null;
  ledger: LedgerEntry[];
  feeHeads: FeeHeadEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  saveMessage: string | null;
  lastReceiptNo: number | null;

  schemes: string[];
  categories: string[];
  modesOfAdmission: string[];
  currentSession: string | null;
  metaLoading: boolean;
  metaError: string | null;

  updating: boolean;
  updateError: string | null;
}

const initialState: AdmissionFeeState = {
  student: null,
  ledger: [],
  feeHeads: [],
  loading: false,
  saving: false,
  error: null,
  saveError: null,
  saveMessage: null,
  lastReceiptNo: null,
  currentSession: null,

  schemes: [],
  categories: [],
  modesOfAdmission: [],
  metaLoading: false,
  metaError: null,

  updating: false,
  updateError: null,
};

/* ------------------------------------------------------------------ */
/*  Thunks                                                              */
/* ------------------------------------------------------------------ */

export const getStudentDetails = createAsyncThunk(
  "admissionFee/getStudentDetails",
  async (
    { idNo, semester, session, scheme, category, modeOfAdmission }: GetStudentArgs,
    { rejectWithValue }
  ) => {
    try {
      const params: Record<string, string> = {};
      if (semester) params.semester = semester;
      if (session) params.session = session;
      if (scheme) params.scheme = scheme;
      if (category) params.category = category;
      if (modeOfAdmission) params.modeOfAdmission = modeOfAdmission;

      const response = await reduxApiClient.get(`admission-fee/${idNo}`, params);

      if (!response.success) {
        return rejectWithValue(
          response.error?.message || "Failed to fetch student"
        );
      }

      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const saveFeeEntry = createAsyncThunk(
  "admissionFee/saveFeeEntry",
  async (params: SaveFeeArgs, { rejectWithValue }) => {
    try {
      const response = await reduxApiClient.post(
        `admission-fee/${params.idNo}/save`,
        params
      );

      if (!response.success) {
        return rejectWithValue(
          response.error?.message || response.message || "Failed to save fee entry"
        );
      }

      return response.data ?? response;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const getAdmissionMetaOptions = createAsyncThunk(
  "admissionFee/getAdmissionMetaOptions",
  async (collegeName: string, { rejectWithValue }) => {
    try {
      const response = await reduxApiClient.get(`admission-fee/meta-options`, {
        collegeName,
      });
      if (!response.success) {
        return rejectWithValue(response.error?.message || "Failed to load options");
      }
      return response.data ?? response;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const updateAdmissionMeta = createAsyncThunk(
  "admissionFee/updateAdmissionMeta",
  async (params: UpdateAdmissionMetaArgs, { rejectWithValue }) => {
    try {
      const response = await reduxApiClient.put(
        `admission-fee/${params.idNo}/update`,
        params
      );
      if (!response.success) {
        return rejectWithValue(
          response.error?.message || response.data || "Failed to update"
        );
      }
      return response.data ?? response;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

/* ------------------------------------------------------------------ */
/*  Slice                                                               */
/* ------------------------------------------------------------------ */

const admissionFeeSlice = createSlice({
  name: "admissionFee",
  initialState,
  reducers: {
    clearStudent(state) {
      state.student = null;
      state.ledger = [];
      state.feeHeads = [];
      state.error = null;
      state.saveError = null;
      state.saveMessage = null;
      state.lastReceiptNo = null;
      state.schemes = [];
      state.categories = [];
      state.modesOfAdmission = [];
      state.metaError = null;
      state.updateError = null;
    },
    clearSaveStatus(state) {
      state.saveError = null;
      state.saveMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // -------- getStudentDetails --------
      .addCase(getStudentDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStudentDetails.fulfilled, (state, action: any) => {
        state.loading = false;

        const payload = action.payload ?? {};

        state.student = payload.student ?? null;
        state.ledger = payload.ledger ?? [];
        state.lastReceiptNo = payload.receiptNo ?? null;
        if (payload.currentSession) {
          state.currentSession = payload.currentSession;
        }

        // Backend already returns the exact shape we need
        // ({Head, Debit, Credit, BalanceHeadWise, Concession}) — no
        // remapping needed, just coerce numbers defensively.
        const rawHeads: any[] = payload.feeHeads ?? [];
        state.feeHeads = rawHeads.map((row) => ({
          Head: row.Head,
          Debit: typeof row.Debit === "number" ? row.Debit : Number(row.Debit) || 0,
          Credit: typeof row.Credit === "number" ? row.Credit : Number(row.Credit) || 0,
          BalanceHeadWise:
            typeof row.BalanceHeadWise === "number"
              ? row.BalanceHeadWise
              : Number(row.BalanceHeadWise) || 0,
          Concession:
            typeof row.Concession === "number" ? row.Concession : Number(row.Concession) || 0,
        }));
      })
      .addCase(getStudentDetails.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
        state.student = null;
        state.ledger = [];
        state.feeHeads = [];
      })

      // -------- saveFeeEntry --------
      .addCase(saveFeeEntry.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveMessage = null;
      })
      .addCase(saveFeeEntry.fulfilled, (state, action: any) => {
        state.saving = false;

        const payload = action.payload ?? {};

        if (payload.ledger) {
          state.ledger = payload.ledger;
        }
        if (payload.feeHeads) {
          state.feeHeads = payload.feeHeads.map((row: any) => ({
            Head: row.Head,
            Debit: typeof row.Debit === "number" ? row.Debit : Number(row.Debit) || 0,
            Credit: typeof row.Credit === "number" ? row.Credit : Number(row.Credit) || 0,
            BalanceHeadWise:
              typeof row.BalanceHeadWise === "number"
                ? row.BalanceHeadWise
                : Number(row.BalanceHeadWise) || 0,
            Concession:
              typeof row.Concession === "number" ? row.Concession : Number(row.Concession) || 0,
          }));
        }

        state.lastReceiptNo = payload.receiptNo ?? null;
        state.saveMessage = payload.message || "Record has been Saved Successfully";
      })
      .addCase(saveFeeEntry.rejected, (state, action: any) => {
        state.saving = false;
        state.saveError = action.payload || "Failed to save fee entry";
      })

      // -------- getAdmissionMetaOptions --------
      .addCase(getAdmissionMetaOptions.pending, (state) => {
        state.metaLoading = true;
        state.metaError = null;
      })
      .addCase(getAdmissionMetaOptions.fulfilled, (state, action: any) => {
        state.metaLoading = false;

        const payload = action.payload ?? {};
        state.schemes = payload.schemes ?? [];
        state.categories = payload.categories ?? [];
        state.modesOfAdmission = payload.modesOfAdmission ?? [];
        if (payload.currentSession) {
          state.currentSession = payload.currentSession;
        }
      })
      .addCase(getAdmissionMetaOptions.rejected, (state, action: any) => {
        state.metaLoading = false;
        state.metaError = action.payload || "Failed to load options";
        state.schemes = [];
        state.categories = [];
        state.modesOfAdmission = [];
      })

      // -------- updateAdmissionMeta --------
      .addCase(updateAdmissionMeta.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateAdmissionMeta.fulfilled, (state, action: any) => {
        state.updating = false;

        const payload = action.payload ?? {};
        if (state.student) {
          state.student.Scheme = payload.scheme ?? state.student.Scheme;
          state.student.Category = payload.category ?? state.student.Category;
          state.student.Quota = payload.quota ?? state.student.Quota;
        }
        if (payload.ledger) {
          state.ledger = payload.ledger;
        }
        if (payload.feeHeads) {
          state.feeHeads = payload.feeHeads.map((row: any) => ({
            Head: row.Head,
            Debit: typeof row.Debit === "number" ? row.Debit : Number(row.Debit) || 0,
            Credit: typeof row.Credit === "number" ? row.Credit : Number(row.Credit) || 0,
            BalanceHeadWise:
              typeof row.BalanceHeadWise === "number"
                ? row.BalanceHeadWise
                : Number(row.BalanceHeadWise) || 0,
            Concession:
              typeof row.Concession === "number" ? row.Concession : Number(row.Concession) || 0,
          }));
        }
      })
      .addCase(updateAdmissionMeta.rejected, (state, action: any) => {
        state.updating = false;
        state.updateError = action.payload || "Failed to update";
      });
  },
});

export const { clearStudent, clearSaveStatus } = admissionFeeSlice.actions;
export default admissionFeeSlice.reducer;