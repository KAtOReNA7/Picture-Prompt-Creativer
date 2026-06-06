import Link from "next/link";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/analyze", label: "图片逆向分析" },
  { href: "/library", label: "Prompt 库" },
  { href: "/collections", label: "合集" },
  { href: "/import", label: "导入 Prompt" },
  { href: "/fusion", label: "风格迁移" },
  { href: "/generated-images", label: "生成图" },
  { href: "/maintenance", label: "运维" },
  { href: "/settings", label: "系统设置" },
  { href: "/diagnostics", label: "环境诊断" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-600 text-base font-semibold text-white">
            图
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-950">图像 Prompt 创作器</span>
            <span className="block text-xs text-slate-500">逆向分析、Prompt 拆解与风格迁移工作台</span>
          </span>
        </Link>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
