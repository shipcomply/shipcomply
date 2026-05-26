import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
  .name("shipcomply")
  .description("Codebase-aware DPDP/GDPR compliance engine")
  .version("0.0.0");

program.addCommand(scanCommand);

export function run() {
  program.parse();
}
