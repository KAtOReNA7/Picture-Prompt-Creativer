type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({ title = "正在加载", description = "请稍候，系统正在准备内容。" }: LoadingStateProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white px-6 py-8">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </section>
  );
}
