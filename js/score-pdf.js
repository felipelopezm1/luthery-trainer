/* ScorePdf — render practice PDFs with PDF.js */
const ScorePdf = (() => {
  let pdf = null;
  let page = 1;
  let host = null;
  let rendering = false;

  function lib() {
    return window.pdfjsLib || null;
  }

  function setupWorker() {
    const L = lib();
    if (!L) return false;
    if (!L.GlobalWorkerOptions.workerSrc) {
      L.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }
    return true;
  }

  function syncBar() {
    const bar = document.getElementById('cello-pdf-bar');
    const info = document.getElementById('cello-pdf-info');
    const prev = document.getElementById('cello-pdf-prev');
    const next = document.getElementById('cello-pdf-next');
    const n = pdf ? pdf.numPages : 0;
    if (bar) bar.hidden = !pdf;
    if (info) info.textContent = pdf ? `${page} / ${n}` : '';
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = !pdf || page >= n;
  }

  async function draw() {
    if (!pdf || !host || rendering) return;
    rendering = true;
    try {
      const pg = await pdf.getPage(page);
      const wrapW = Math.max(280, host.clientWidth || 560);
      const unscaled = pg.getViewport({ scale: 1 });
      const scale = Math.min(1.6, wrapW / unscaled.width);
      const viewport = pg.getViewport({ scale });
      host.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.className = 'cello-pdf-canvas';
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      host.appendChild(canvas);
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      syncBar();
    } catch (e) {
      console.warn('[ScorePdf] render', e);
    }
    rendering = false;
  }

  async function loadData(data) {
    if (!setupWorker()) throw new Error('pdf.js missing');
    pdf = await lib().getDocument({ data, verbosity: 0 }).promise;
    page = 1;
    return pdf.numPages;
  }

  async function loadUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch');
    return loadData(new Uint8Array(await res.arrayBuffer()));
  }

  async function loadFile(file) {
    return loadData(new Uint8Array(await file.arrayBuffer()));
  }

  async function render(el) {
    if (el) host = el;
    if (!host || !pdf) return;
    await draw();
  }

  async function go(delta) {
    if (!pdf) return;
    const next = Math.max(1, Math.min(pdf.numPages, page + delta));
    if (next === page) return;
    page = next;
    await draw();
  }

  function hasPdf() { return !!pdf; }
  function pageInfo() { return pdf ? { page, pages: pdf.numPages } : null; }

  function destroy() {
    pdf = null;
    page = 1;
    if (host) host.innerHTML = '';
    syncBar();
  }

  return { loadUrl, loadFile, render, go, hasPdf, pageInfo, destroy, syncBar };
})();

window.ScorePdf = ScorePdf;
