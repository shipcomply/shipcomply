"""CLI wrapper: pnpm gen:policy <path> [--jurisdiction DPDP|GDPR|CCPA]"""
import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api", "src"))


def main():
    parser = argparse.ArgumentParser(description="Generate a privacy policy from a repo path")
    parser.add_argument("path", nargs="?", default="examples/sample-nextjs-app")
    parser.add_argument("--jurisdiction", default="DPDP", choices=["DPDP", "GDPR", "CCPA"])
    parser.add_argument("--out", default=None, help="Output file path (default: <path>/PRIVACY.md)")
    args = parser.parse_args()

    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.legal_writer import PolicyGenerator

    print(f"Scanning {args.path!r} ...")
    result = scan_repo(args.path)
    print(f"Found {len(result.data_elements)} data elements across {result.files_scanned} files")

    generator = PolicyGenerator()
    policy = generator.generate(result, jurisdiction=args.jurisdiction)

    total_citations = sum(len(s.citations) for s in policy.sections)
    print(f"Generated {len(policy.sections)} sections, {total_citations} citations")

    out_path = args.out or os.path.join(args.path, "PRIVACY.md")
    os.makedirs(os.path.dirname(out_path) if os.path.dirname(out_path) else ".", exist_ok=True)

    markdown = policy.to_markdown()
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"\nPolicy written to: {out_path}")
    print(f"Sections and confidence:")
    for s in policy.sections:
        bar = "#" * (s.confidence // 10)
        print(f"  [{bar:<10}] {s.confidence:3d}%  {s.title}  ({len(s.citations)} citations)")

    if total_citations < 3:
        print("\nWARNING: fewer than 3 citations generated — scan may have found fewer PII elements.", file=sys.stderr)


if __name__ == "__main__":
    main()
