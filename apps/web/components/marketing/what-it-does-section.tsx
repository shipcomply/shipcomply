import { Check } from "lucide-react";

const DIFFERENTIATORS = [
  {
    title: "No survey forms",
    desc: "Detection comes from AST analysis of your actual code, not self-reported questionnaires.",
  },
  {
    title: "File:line citations",
    desc: "Every paragraph in your policy traces back to the exact code that collects the data.",
  },
  {
    title: "Working code, not advice",
    desc: "Consent banner ships as a copy-pasteable React component, not a checklist.",
  },
];

export function WhatItDoesSection() {
  return (
    <section className="py-20 px-6 border-t border-bg-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-bg-11 mb-4">What ShipComply actually does</h2>
            <p className="text-bg-8 leading-relaxed mb-4">
              Most compliance tools ask you to fill out a form describing what your app does.
              ShipComply reads your source code and figures it out, then generates the legal
              artifacts automatically.
            </p>
            <p className="text-bg-8 leading-relaxed">
              The output is a privacy policy that cites real files, a working consent banner,
              deletion and export API routes, a compliance score, and a downloadable audit PDF.
              All in under 5 minutes.
            </p>
          </div>
          <div className="space-y-4">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="flex gap-3 p-4 rounded-xl bg-bg-2 border border-bg-4">
                <div className="w-5 h-5 rounded-full bg-mint-9/15 border border-mint-9/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} className="text-mint-9" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-bg-11 mb-0.5">{d.title}</p>
                  <p className="text-sm text-bg-7 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
