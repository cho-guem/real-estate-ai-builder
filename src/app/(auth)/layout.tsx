export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">AI</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">AI 부동산 빌더</span>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
