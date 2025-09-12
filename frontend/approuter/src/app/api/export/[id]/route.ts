//  Builds a Markdown report from stored project + latest assessment
//  Converts Markdown → HTML with inline CSS for print/export
//  Generates PDF
//  Returns file stream with correct headers for download

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** ------- Markdown builder ------- **/
function toMd(p: any, flags: any[]) {
  const fmt = (d: Date) => new Date(d).toLocaleString();
  const reds = flags.filter((f: any) => f.severity === "red").length;
  const ambers = flags.filter((f: any) => f.severity === "amber").length;
  const greens = flags.filter((f: any) => f.severity === "green").length;

  const lines = [
    `# ${p.title}`,
    `_Created_: ${fmt(p.createdAt)}  `,
    p.assessments?.[0]?.corpusVersion
      ? `_Corpus version_: ${p.assessments[0].corpusVersion}`
      : "",
    "",
    "## Description",
    (p.description || "").trim() || "_(no description)_",
    "",
    "## Summary",
    `- **Reds**: ${reds}`,
    `- **Ambers**: ${ambers}`,
    `- **Greens**: ${greens}`,
    "",
    "## Flags",
    ...(flags as any[]).map((f, i) => {
      const meta = f.meta || {};
      const title = meta.label || f.clause || "Clause";
      const link = meta.link ? `([${meta.label || "clause"}](${meta.link}))` : "";
      const phase = meta.phase ? ` — _${meta.phase}_` : "";
      return [
        `### ${i + 1}. ${title}${phase}`,
        `- **Severity**: ${f.severity}`,
        `- **Reason**: ${f.reason}`,
        f.mitigation ? `- **Mitigation**: ${f.mitigation}` : "- **Mitigation**: _n/a_",
        f.evidence ? `- **Evidence**: “${f.evidence}”` : "",
        link ? `- **Citation**: ${link}` : "",
        "",
      ].join("\n");
    }),
  ];

  return lines.filter(Boolean).join("\n");
}

/** ------- Markdown → HTML (no external assets) ------- **/
async function mdToHtml(markdown: string): Promise<string> {
  const { marked } = await import("marked");
  marked.use({ mangle: false, headerIds: false });

  const body = marked.parse(markdown) as string;

  // Minimal, inline stylesheet for decent print output
  const css = `
    :root { color-scheme: light; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, sans-serif; 
           line-height: 1.5; padding: 24px; max-width: 800px; margin: 0 auto; }
    h1,h2,h3 { line-height: 1.25; margin-top: 1.6em; }
    h1 { font-size: 1.8rem; }
    h2 { font-size: 1.35rem; }
    h3 { font-size: 1.1rem; }
    p, li { font-size: 0.98rem; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
    pre { background: #f6f8fa; padding: 12px; border-radius: 8px; overflow: auto; }
    ul { padding-left: 1.25rem; }
    hr { border: 0; height: 1px; background: #e5e7eb; margin: 24px 0; }
    a { color: #2563eb; text-decoration: underline; }
    @media print {
      a { color: black; text-decoration: none; }
      body { padding: 0; }
    }
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Export</title>
    <style>${css}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

/** ------- HTML → PDF with Puppeteer ------- **/
async function htmlToPdf(html: string): Promise<Buffer> {
  // Prefer system Chrome if provided, otherwise use Puppeteer’s bundled Chromium.
  const useCustom = !!process.env.PUPPETEER_EXECUTABLE_PATH;
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: useCustom ? process.env.PUPPETEER_EXECUTABLE_PATH! : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

/** ------- Route ------- **/
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const project = await prisma.project.findUnique({
    where: { id },
    include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!project || !project.assessments.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const flags = (project.assessments[0].flags as any[]) || [];
  const md = toMd(project, flags);

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "md").toLowerCase();

  if (format === "pdf") {
    try {
      const html = await mdToHtml(md);
      const pdf = await htmlToPdf(html);
      return new NextResponse(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${project.title
            .replace(/\W+/g, "_")
            .slice(0, 60)}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: "PDF generation failed", detail: String(e?.message || e) },
        { status: 500 }
      );
    }
  }

  // Fallback: raw markdown export
  return new NextResponse(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.title
        .replace(/\W+/g, "_")
        .slice(0, 60)}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
