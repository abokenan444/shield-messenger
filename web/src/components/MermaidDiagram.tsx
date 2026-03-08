import { useEffect, useRef, useState } from 'react';

let idCounter = 0;
let initialized = false;

export function MermaidDiagram({ chart, title }: { chart: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return;

      if (!initialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#7c3aed',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#6d28d9',
            lineColor: '#a78bfa',
            secondaryColor: '#1e1b4b',
            tertiaryColor: '#0f172a',
            noteBkgColor: '#1e1b4b',
            noteTextColor: '#c4b5fd',
            noteBorderColor: '#6d28d9',
            actorBkg: '#7c3aed',
            actorTextColor: '#fff',
            actorBorder: '#6d28d9',
            actorLineColor: '#a78bfa',
            signalColor: '#e2e8f0',
            signalTextColor: '#e2e8f0',
            labelBoxBkgColor: '#1e1b4b',
            labelTextColor: '#c4b5fd',
            loopTextColor: '#c4b5fd',
            activationBkgColor: '#4c1d95',
            activationBorderColor: '#7c3aed',
            sequenceNumberColor: '#fff',
            background: '#0f172a',
            mainBkg: '#1e1b4b',
            nodeBorder: '#6d28d9',
            clusterBkg: '#1e1b4b',
            clusterBorder: '#6d28d9',
            titleColor: '#e2e8f0',
            edgeLabelBackground: '#1e1b4b',
          },
          flowchart: { curve: 'basis', padding: 20 },
          sequence: { mirrorActors: false, bottomMarginAdj: 2 },
        });
        initialized = true;
      }

      const id = `mermaid-${++idCounter}`;
      el.innerHTML = '';

      mermaid.render(id, chart).then(({ svg }) => {
        if (cancelled) return;
        el.innerHTML = svg;
        const svgEl = el.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
      }).catch(() => { if (!cancelled) setError(true); });
    }).catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div className="my-8 bg-dark-900/60 border border-dark-800 rounded-2xl p-6 sm:p-8 overflow-x-auto">
      {title && (
        <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      <div ref={containerRef} className="flex justify-center" />
      {error && <p className="text-dark-500 text-sm text-center">Diagram failed to load</p>}
    </div>
  );
}
