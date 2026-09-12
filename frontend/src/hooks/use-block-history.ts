// Editor-level Undo/Redo for the block editor.
// Model: past[] / present / future[] with coalescing for rapid same-target text edits.
import { useCallback, useReducer } from "react";
import { Block } from "@/src/db/pages-types";

type State = {
  past: Block[][];
  present: Block[];
  future: Block[][];
  lastKey: string | null;
  lastT: number;
};

type Action =
  | { type: "RESET"; blocks: Block[] }
  | { type: "SET"; blocks: Block[]; coalesceKey?: string }
  | { type: "UNDO" }
  | { type: "REDO" };

const LIMIT = 80;
const COALESCE_MS = 900;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return { past: [], present: action.blocks, future: [], lastKey: null, lastT: 0 };
    case "SET": {
      const now = Date.now();
      const coalesce =
        !!action.coalesceKey &&
        state.lastKey === action.coalesceKey &&
        now - state.lastT < COALESCE_MS;
      if (coalesce) {
        return { ...state, present: action.blocks, lastT: now };
      }
      return {
        past: [...state.past, state.present].slice(-LIMIT),
        present: action.blocks,
        future: [],
        lastKey: action.coalesceKey ?? null,
        lastT: now,
      };
    }
    case "UNDO": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future].slice(0, LIMIT),
        lastKey: null,
        lastT: 0,
      };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-LIMIT),
        present: next,
        future: state.future.slice(1),
        lastKey: null,
        lastT: 0,
      };
    }
    default:
      return state;
  }
}

export function useBlockHistory(initial: Block[] = []) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    lastKey: null,
    lastT: 0,
  });

  const reset = useCallback((blocks: Block[]) => {
    dispatch({ type: "RESET", blocks });
  }, []);

  const set = useCallback((blocks: Block[], coalesceKey?: string) => {
    dispatch({ type: "SET", blocks, coalesceKey });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  return {
    blocks: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    reset,
    set,
    undo,
    redo,
  };
}
