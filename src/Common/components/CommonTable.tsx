"use client";

import type { ReactNode } from "react";

import CommonDataGrid, { type CommonDataGridProps, type DataGridColumn } from "@/components/ui/CommonDataGrid";

export type CommonTableColumn<T extends Record<string, ReactNode>> = DataGridColumn<T>;
export type CommonTableProps<T extends Record<string, ReactNode>> = CommonDataGridProps<T>;

export default function CommonTable<T extends Record<string, ReactNode>>(objProps: CommonTableProps<T>) {
  return <CommonDataGrid {...objProps} />;
}
