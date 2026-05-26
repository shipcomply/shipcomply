"""CLI wrapper: pnpm gen:audit <path>"""
import sys, os, argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api", "src"))


def main():
    parser = argparse.ArgumentParser(description="Generate compliance audit report")
    parser.add_argument("path", nargs="?", default="examples/sample-nextjs-app")
    parser.add_argument("--pdf", action="store_true", help="Also generate PDF")
    args = parser.parse_args()

    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.audit import AuditAgent, generate_pdf

    print(f"Scanning {args.path!r} ...")
    result = scan_repo(args.path)

    agent = AuditAgent()
    report = agent.audit(result)

    score_display = str(report.score) if report.score is not None else "N/A"
    print(f"Score: {score_display}/100  ({report.score_label})")
    print(f"Files: {report.files_scanned}  Elements: {report.elements_found}  Findings: {len(report.findings)}")
    for f in report.findings:
        print(f"  [{f.severity}] {f.element_type}: {f.affected_files[0] if f.affected_files else 'unknown'}")

    out_md = os.path.join(args.path, "audit-report.md")
    with open(out_md, "w", encoding="utf-8") as fp:
        fp.write(report.to_markdown())
    print(f"\nMarkdown report: {out_md}")

    if args.pdf:
        out_pdf = os.path.join(args.path, "audit-report.pdf")
        ok = generate_pdf(report, out_pdf)
        print(f"PDF: {out_pdf}" if ok else "PDF skipped (WeasyPrint not installed)")


if __name__ == "__main__":
    main()
