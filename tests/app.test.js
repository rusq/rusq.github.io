import test from 'node:test';
import assert from 'node:assert/strict';

import { syncSolutionVisibility } from '../src/ui.js';

function makeClassList(initial = []){
  const set = new Set(initial);
  return {
    add(name){ set.add(name); },
    remove(name){ set.delete(name); },
    toggle(name, force){
      if (force === undefined) {
        if (set.has(name)) set.delete(name);
        else set.add(name);
        return set.has(name);
      }
      if (force) set.add(name);
      else set.delete(name);
      return force;
    },
    contains(name){ return set.has(name); }
  };
}

test('solution visibility starts hidden when unchecked', () => {
  const el = { classList: makeClassList(['solution', 'hidden']) };
  syncSolutionVisibility(el, false);
  assert.equal(el.classList.contains('visible'), false);
  assert.equal(el.classList.contains('hidden'), true);
});

test('solution visibility becomes visible when enabled', () => {
  const el = { classList: makeClassList(['solution', 'hidden']) };
  syncSolutionVisibility(el, true);
  assert.equal(el.classList.contains('visible'), true);
  assert.equal(el.classList.contains('hidden'), false);
});
