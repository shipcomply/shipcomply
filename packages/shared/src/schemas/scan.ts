import { z } from "zod";

export const DataElementSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  sources: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    pattern: z.string().optional(),
  })),
  sinks: z.array(z.object({
    file: z.string(),
    line: z.number().optional(),
    type: z.string().optional(),
  })),
  compliance_flags: z.array(z.string()),
});

export const ScanRequestSchema = z.object({
  repo_url: z.string(),
  org_id: z.string(),
  branch: z.string().default("main"),
  offline: z.boolean().default(false),
});

export const ScanResponseSchema = z.object({
  scan_id: z.string(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  message: z.string().optional(),
});

export const ScanResultSchema = z.object({
  scan_id: z.string().uuid(),
  status: z.string(),
  compliance_score: z.number().nullable(),
  scanned_files: z.number(),
  excluded_files: z.number(),
  data_elements: z.array(DataElementSchema),
  artifacts: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    content: z.string().nullable(),
    storage_url: z.string().nullable(),
  })),
  findings: z.array(z.object({
    id: z.string().uuid(),
    rule: z.string(),
    severity: z.string(),
    description: z.string(),
    file_path: z.string().nullable(),
    line_number: z.number().nullable(),
  })),
});

export type DataElement = z.infer<typeof DataElementSchema>;
export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
