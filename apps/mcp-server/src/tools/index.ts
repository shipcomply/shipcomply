import { scan_repo } from "./scan_repo.js";
import { get_status } from "./get_status.js";
import { list_findings } from "./list_findings.js";
import { generate_policy } from "./generate_policy.js";
import { get_audit_md } from "./get_audit_md.js";
import { get_audit_pdf } from "./get_audit_pdf.js";
import { check_file } from "./check_file.js";

export const TOOLS = [
  scan_repo,
  get_status,
  list_findings,
  generate_policy,
  get_audit_md,
  get_audit_pdf,
  check_file,
];
