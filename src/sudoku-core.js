(function(global){
  function mulberry32(a){
    return function(){
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function newRNG(seed){
    if (seed == null || Number.isNaN(Number(seed))) {
      if (global.crypto && global.crypto.getRandomValues){
        const buf = new Uint32Array(1);
        global.crypto.getRandomValues(buf);
        return mulberry32(buf[0] || Date.now() >>> 0);
      }
      return mulberry32((Date.now() ^ Math.random() * 1e9) >>> 0);
    }
    return mulberry32(Number(seed) >>> 0);
  }

  function shuffle(arr, rnd){
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function emptyGrid(){ return Array.from({ length: 9 }, ()=> Array(9).fill(0)); }
  function cloneGrid(g){ return g.map(row => row.slice()); }
  function basePatternValue(r, c){ return ((r % 3) * 3 + Math.floor(r / 3) + c) % 9 + 1; }

  function reorderRowBands(g, perm){
    const out = emptyGrid();
    let dst = 0;
    for (const b of perm){
      const src = b * 3;
      for (let i = 0; i < 3; i++) out[dst + i] = g[src + i].slice();
      dst += 3;
    }
    return out;
  }

  function reorderRowsInBand(g, band, perm){
    const out = g.map(r => r.slice());
    const start = band * 3;
    const rows = [g[start], g[start + 1], g[start + 2]];
    for (let i = 0; i < 3; i++) out[start + i] = rows[perm[i]].slice();
    return out;
  }

  function reorderColStacks(g, perm){
    const out = emptyGrid();
    for (let r = 0; r < 9; r++){
      let row = [];
      for (const s of perm) row = row.concat(g[r].slice(s * 3, s * 3 + 3));
      out[r] = row;
    }
    return out;
  }

  function reorderColsInStack(g, stack, perm){
    const out = g.map(r => r.slice());
    const start = stack * 3;
    for (let r = 0; r < 9; r++){
      const cols = [g[r][start], g[r][start + 1], g[r][start + 2]];
      out[r][start] = cols[perm[0]];
      out[r][start + 1] = cols[perm[1]];
      out[r][start + 2] = cols[perm[2]];
    }
    return out;
  }

  function generateSolved(rnd){
    let g = emptyGrid();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) g[r][c] = basePatternValue(r, c);

    let bands = [0, 1, 2];
    shuffle(bands, rnd);
    g = reorderRowBands(g, bands);
    for (let b = 0; b < 3; b++) g = reorderRowsInBand(g, b, shuffle([0, 1, 2], rnd));

    let stacks = [0, 1, 2];
    shuffle(stacks, rnd);
    g = reorderColStacks(g, stacks);
    for (let s = 0; s < 3; s++) g = reorderColsInStack(g, s, shuffle([0, 1, 2], rnd));

    const relabel = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) g[r][c] = relabel[g[r][c] - 1];
    return g;
  }

  function countSolutions(grid, limit){
    limit = limit ?? 2;
    const g = cloneGrid(grid);
    const rowMask = new Uint16Array(9);
    const colMask = new Uint16Array(9);
    const boxMask = new Uint16Array(9);
    const boxIndex = (r, c)=> Math.floor(r / 3) * 3 + Math.floor(c / 3);

    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++){
      const d = g[r][c];
      if (d !== 0) {
        const bit = 1 << d;
        const b = boxIndex(r, c);
        if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[b] & bit)) return 0;
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[b] |= bit;
      }
    }

    function candidatesMask(r, c){
      const used = rowMask[r] | colMask[c] | boxMask[boxIndex(r, c)];
      return (~used) & 0x3FE;
    }

    function popcount16(x){
      x = x - ((x >>> 1) & 0x5555);
      x = (x & 0x3333) + ((x >>> 2) & 0x3333);
      return (((x + (x >>> 4)) & 0x0F0F) * 0x0101) >>> 8;
    }

    function pickMRVCell(){
      let best = null;
      let bestCount = 10;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++){
        if (g[r][c] !== 0) continue;
        const cnt = popcount16(candidatesMask(r, c));
        if (cnt < bestCount){
          best = [r, c];
          bestCount = cnt;
          if (cnt === 1) break;
        }
      }
      return best;
    }

    let solutions = 0;

    function dfs(){
      if (solutions >= limit) return;
      const cell = pickMRVCell();
      if (cell === null){
        solutions++;
        return;
      }

      const [r, c] = cell;
      const mask = candidatesMask(r, c);
      if (mask === 0) return;

      for (let m = mask; m; m &= (m - 1)){
        const bit = m & -m;
        const d = Math.log2(bit) | 0;
        g[r][c] = d;
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[boxIndex(r, c)] |= bit;
        dfs();
        g[r][c] = 0;
        rowMask[r] &= ~bit;
        colMask[c] &= ~bit;
        boxMask[boxIndex(r, c)] &= ~bit;
        if (solutions >= limit) break;
      }
    }

    dfs();
    return solutions;
  }

  function removeCells(rnd, solved, percent, symmetric, maxRetries){
    percent = percent ?? 60;
    symmetric = symmetric ?? true;
    maxRetries = maxRetries ?? 5;
    const MAX_REM = 64;
    const requested = Math.floor(81 * percent / 100);
    let target = Math.min(requested, MAX_REM);
    if (symmetric && (target % 2 === 1)) target--;

    let best = cloneGrid(solved);
    let bestRemoved = 0;

    for (let attempt = 0; attempt < Math.max(1, maxRetries); attempt++){
      const puz = cloneGrid(solved);
      let removed = 0;

      if (symmetric){
        const pairs = [];
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++){
          const rr = 8 - r;
          const cc = 8 - c;
          if (r > rr || (r === rr && c > cc)) continue;
          if (r === rr && c === cc) continue;
          pairs.push([[r, c], [rr, cc]]);
        }
        shuffle(pairs, rnd);
        for (const [[r1, c1], [r2, c2]] of pairs){
          if (removed >= target) break;
          if (puz[r1][c1] === 0 || puz[r2][c2] === 0) continue;
          const sv1 = puz[r1][c1];
          const sv2 = puz[r2][c2];
          puz[r1][c1] = 0;
          puz[r2][c2] = 0;
          if (countSolutions(puz, 2) >= 2){
            puz[r1][c1] = sv1;
            puz[r2][c2] = sv2;
          } else {
            removed += 2;
          }
        }
      } else {
        const cells = [];
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
        shuffle(cells, rnd);
        for (const [r, c] of cells){
          if (removed >= target) break;
          if (puz[r][c] === 0) continue;
          const sv = puz[r][c];
          puz[r][c] = 0;
          if (countSolutions(puz, 2) >= 2) puz[r][c] = sv;
          else removed++;
        }
      }

      if (removed > bestRemoved){
        bestRemoved = removed;
        best = puz;
      }
      if (removed >= target) break;
    }

    return { puzzle: best, removed: bestRemoved, achieved: bestRemoved * 100 / 81 };
  }

  global.SudokuCore = {
    mulberry32,
    newRNG,
    shuffle,
    emptyGrid,
    cloneGrid,
    generateSolved,
    countSolutions,
    removeCells
  };
})(globalThis);
