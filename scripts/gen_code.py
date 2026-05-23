"""CLI wrapper: pnpm gen:code <path> [--jurisdiction DPDP]"""
import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api", "src"))


def main():
    parser = argparse.ArgumentParser(description="Generate consent banner + API endpoints")
    parser.add_argument("path", nargs="?", default="examples/sample-nextjs-app")
    parser.add_argument("--dry-run", action="store_true", help="Print files without writing")
    args = parser.parse_args()

    from shipcomply_api.scanner import scan_repo
    from shipcomply_api.code_gen import CodeGenerator

    print(f"Scanning {args.path!r} ...")
    result = scan_repo(args.path)
    print(f"Found {len(result.data_elements)} data elements")

    gen = CodeGenerator()
    code_result = gen.generate(result, target_path=None if args.dry_run else args.path)

    for f in code_result.files:
        tag = " [COLLISION -> renamed]" if f.collision else ""
        print(f"  {f.path}{tag}  ({len(f.content)} chars)")

    if not args.dry_run:
        written = gen.write_to_disk(code_result, args.path)
        print(f"\nWrote {len(written)} files to {args.path!r}")
        print("Next steps:")
        print("  1. Import ConsentBanner into your app layout")
        print("  2. Review /api/consent/route.ts and add DB persistence")
        print("  3. Review /api/user/data/route.ts and add your data deletion logic")
    else:
        print("\n[dry-run] No files written")


if __name__ == "__main__":
    main()
