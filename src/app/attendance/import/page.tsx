import { redirect } from "next/navigation";

// Import and "Run Folder Import Now" now live on the Daily Attendance screen.
export default function AttendanceImportPage() {
  redirect("/attendance/daily");
}
