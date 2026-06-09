export function syncSolutionVisibility(solutionBlock, includeSolution){
  solutionBlock.classList.toggle('visible', includeSolution);
  solutionBlock.classList.toggle('hidden', !includeSolution);
}
