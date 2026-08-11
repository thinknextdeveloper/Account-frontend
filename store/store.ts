import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import menuReducer from "./slices/menuSlice";
import masterAnnualFeeReducer from "./slices/masterAnnualFeeSlice";
import masterCategoryReducer from "./slices/masterCategorySlice";
import hostelBusValidityReducer from "./slices/masterHostelBusValiditySlice";
import masterDevFundReducer from "./slices/masterDevFundSlice";
import studentDetailsReducer from "./slices/studentDetailsSlice";
import admissionFeeReducer from "./slices/admissionFeeSlice";
import dayBookReducer from "@/store/slices/dayBookSlice";
import customSubLedgersReducer from "@/store/slices/customSubLedgersSlice";
import cancelReceiptReducer from "@/store/slices/cancelReceiptSlice";
import deadDebitsReducer from "@/store/slices/deadDebitsSice"
import facilityReducer from "./slices/facilitySlice";
import receiptUpdateReducer from "./slices/receiptUpdateSlice";
import concessionSliceReducer from "./slices/concessionSlice"
import feeReportReducer from "@/store/slices/Feereportslice";
import hostelReportReducer from "./slices/HostelReportSlice";
import debitEntryReducer from "@/store/slices/DebitEntrySlice";


export const store = configureStore({
  reducer: {
    auth: authReducer,
    menu: menuReducer,
    masterAnnualFee: masterAnnualFeeReducer,
    masterCategory: masterCategoryReducer,
    hostelBusValidity: hostelBusValidityReducer,
    masterDevFund: masterDevFundReducer,
    studentDetails: studentDetailsReducer,
    admissionFee:admissionFeeReducer,
    dayBook: dayBookReducer,
    customSubLedgers: customSubLedgersReducer,
    cancelReceipt: cancelReceiptReducer,
    deadDebits : deadDebitsReducer,
    facility: facilityReducer,
    receiptUpdate: receiptUpdateReducer,
    concession:concessionSliceReducer,
    feeReport: feeReportReducer,
    hostelReport: hostelReportReducer,
      debitEntry: debitEntryReducer,


  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
