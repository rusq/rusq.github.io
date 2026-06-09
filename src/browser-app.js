(function(){
  const { generateSolved, newRNG, removeCells } = globalThis.SudokuCore;

  function renderGrid(container, grid){
    const tbl = document.createElement('table');
    for (let r = 0; r < 9; r++){
      const tr = document.createElement('tr');
      for (let c = 0; c < 9; c++){
        const td = document.createElement('td');
        td.textContent = grid[r][c] ? String(grid[r][c]) : '\u00A0';
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    }
    container.innerHTML = '';
    container.appendChild(tbl);
  }

  const elPercent = document.getElementById('percent');
  const elPercentLabel = document.getElementById('percentLabel');
  const elSym = document.getElementById('sym');
  const elSeed = document.getElementById('seed');
  const elBtnSeed = document.getElementById('btnSeed');
  const elBtnGen = document.getElementById('btnGenerate');
  const elBtnPrint = document.getElementById('btnPrint');
  const elStatus = document.getElementById('status');
  const elMeta = document.getElementById('meta');
  const elPuzzle = document.getElementById('puzzle');
  const elSolution = document.getElementById('solution');
  const elInclSol = document.getElementById('inclSol');
  const elSolBlock = document.getElementById('solutionBlock');

  function applySolutionVisibility(){
    elSolBlock.classList.toggle('visible', elInclSol.checked);
    elSolBlock.classList.toggle('hidden', !elInclSol.checked);
  }

  function generate(){
    const t0 = performance.now();
    const seedVal = elSeed.value === '' ? null : Number(elSeed.value);
    const rnd = newRNG(seedVal);
    const solved = generateSolved(rnd);
    const res = removeCells(rnd, solved, Number(elPercent.value), elSym.checked, 5);

    renderGrid(elPuzzle, res.puzzle);
    renderGrid(elSolution, solved);
    applySolutionVisibility();

    const t1 = performance.now();
    elMeta.textContent = `Removed: ${res.removed} cells (${res.achieved.toFixed(1)}%). Seed: ${seedVal ?? 'random'}. Symmetry: ${elSym.checked ? 'on' : 'off'}.`;
    elStatus.textContent = `Generated in ${(t1 - t0).toFixed(0)} ms. Unique-solution ensured.`;
  }

  elPercent.addEventListener('input', ()=> {
    elPercentLabel.textContent = elPercent.value + '%';
  });
  elBtnSeed.addEventListener('click', ()=> {
    elSeed.value = Math.floor(Math.random() * 1e9);
  });
  elBtnPrint.addEventListener('click', ()=> {
    window.print();
  });
  elInclSol.addEventListener('change', applySolutionVisibility);
  elBtnGen.addEventListener('click', generate);

  applySolutionVisibility();
  generate();
})();
