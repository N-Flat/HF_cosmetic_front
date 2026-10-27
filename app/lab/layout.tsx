import { LabShell } from "@/components/lab/LabShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <LabShell>{children}</LabShell>;
}
