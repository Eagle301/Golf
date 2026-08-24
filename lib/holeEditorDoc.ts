import { isComplete, labelPosition, type HolePath, type HolePoint } from './holeGeometry';

export interface EditorHole {
  hole_number: number;
  path: HolePath;
  /** Where the hole number sits; null while the line is unfinished. */
  label: HolePoint | null;
}

export interface HoleEditorState {
  holes: EditorHole[];
  active: number;
}

/**
 * The document's whole view of the world, as plain JSON. Pushing one of
 * these into a live document is what keeps editing smooth: rebuilding the
 * HTML instead would reload Leaflet and every satellite tile on each tap.
 */
export function holeEditorState(
  holes: { hole_number: number; path: HolePath }[],
  activeHoleNumber: number
): HoleEditorState {
  return {
    holes: holes.map((hole) => ({
      hole_number: hole.hole_number,
      path: hole.path,
      label: isComplete(hole.path) ? labelPosition(hole.path) : null,
    })),
    active: activeHoleNumber,
  };
}
