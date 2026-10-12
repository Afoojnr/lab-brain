// Reports sit outside the workspace layout: no sidebar or top bar, only the paper.
export default function ReportLayout({ children }: LayoutProps<'/'>) {
  return children;
}
