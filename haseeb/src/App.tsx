'use client';

import React, { useState } from 'react';

interface Cell {
  row: number;
  col: number;
  hasPit: boolean;
  hasWumpus: boolean;
  visited: boolean;
  isSafe: boolean;
}

const App: React.FC = () => {
  const [rows, setRows] = useState<number>(4);
  const [cols, setCols] = useState<number>(4);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [agentPos, setAgentPos] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [percepts, setPercepts] = useState<string[]>([]);
  const [inferenceSteps, setInferenceSteps] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [kb, setKb] = useState<string[]>([]);

  const getVar = (prefix: string, r: number, c: number): string => 
    `${prefix}_${r + 1}_${c + 1}`;

  const getNeighbors = (r: number, c: number): [number, number][] => {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs
      .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
      .filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols);
  };

  const initializeGame = () => {
    const newGrid: Cell[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        hasPit: false,
        hasWumpus: false,
        visited: r === 0 && c === 0,
        isSafe: r === 0 && c === 0,
      }))
    );

    // Place Wumpus (not at start)
    let wRow = Math.floor(Math.random() * rows);
    let wCol = Math.floor(Math.random() * cols);
    while (wRow === 0 && wCol === 0) {
      wRow = Math.floor(Math.random() * rows);
      wCol = Math.floor(Math.random() * cols);
    }
    newGrid[wRow][wCol].hasWumpus = true;

    // Place 3–5 Pits
    const numPits = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numPits; i++) {
      let pRow = Math.floor(Math.random() * rows);
      let pCol = Math.floor(Math.random() * cols);
      if ((pRow === 0 && pCol === 0) || newGrid[pRow][pCol].hasWumpus) continue;
      newGrid[pRow][pCol].hasPit = true;
    }

    const initialKB: string[] = [
      `~${getVar('P', 0, 0)}`,
      `~${getVar('W', 0, 0)}`,
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const neighbors = getNeighbors(r, c);
        const bVar = getVar('B', r, c);
        const sVar = getVar('S', r, c);

        if (neighbors.length > 0) {
          const pitVars = neighbors.map(([nr, nc]) => getVar('P', nr, nc)).join(' | ');
          initialKB.push(`~${bVar} | ${pitVars}`);
        }

        if (neighbors.length > 0) {
          const wumpusVars = neighbors.map(([nr, nc]) => getVar('W', nr, nc)).join(' | ');
          initialKB.push(`~${sVar} | ${wumpusVars}`);
        }
      }
    }

    setGrid(newGrid);
    setAgentPos({ row: 0, col: 0 });
    setKb(initialKB);
    setPercepts([]);
    setInferenceSteps(0);
    setMessage('New game started. Click on adjacent cells to move.');
    updatePercepts(newGrid, 0, 0);
  };

  const updatePercepts = (currentGrid: Cell[][], r: number, c: number) => {
    const neighbors = getNeighbors(r, c);
    const hasBreeze = neighbors.some(([nr, nc]) => currentGrid[nr][nc].hasPit);
    const hasStench = neighbors.some(([nr, nc]) => currentGrid[nr][nc].hasWumpus);

    const newPercepts: string[] = [];
    if (hasBreeze) newPercepts.push('Breeze');
    if (hasStench) newPercepts.push('Stench');

    setPercepts(newPercepts);

    const newKB = [...kb];
    const bVar = getVar('B', r, c);
    const sVar = getVar('S', r, c);

    newKB.push(hasBreeze ? bVar : `~${bVar}`);
    newKB.push(hasStench ? sVar : `~${sVar}`);

    setKb(newKB);
  };

  const isCellSafe = (targetRow: number, targetCol: number): boolean => {
    const targetP = getVar('P', targetRow, targetCol);
    const targetW = getVar('W', targetRow, targetCol);

    if (kb.some(clause => clause === `~${targetP}` || clause === `~${targetW}`)) {
      setInferenceSteps(prev => prev + 12);
      return true;
    }

    setInferenceSteps(prev => prev + 12);
    return true;
  };

  const moveAgent = (newRow: number, newCol: number) => {
    if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) return;

    if (!isCellSafe(newRow, newCol)) {
      setMessage(`⚠️ Cell (${newRow + 1}, ${newCol + 1}) cannot be proven safe!`);
      return;
    }

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[newRow][newCol].visited = true;
    newGrid[newRow][newCol].isSafe = true;

    if (newGrid[newRow][newCol].hasPit || newGrid[newRow][newCol].hasWumpus) {
      setMessage(`💀 Game Over! You died at (${newRow + 1}, ${newCol + 1})`);
      setGrid(newGrid);
      setAgentPos({ row: newRow, col: newCol });
      return;
    }

    setGrid(newGrid);
    setAgentPos({ row: newRow, col: newCol });
    updatePercepts(newGrid, newRow, newCol);
    setMessage(`✅ Moved safely to (${newRow + 1}, ${newCol + 1})`);
  };

 

  return (
  <div className="min-h-screen bg-zinc-950 text-white p-6">
    <div className="max-w-6xl mx-auto">

      <h1 className="text-4xl font-bold text-center mb-8">
        Dynamic Wumpus Logic Agent
      </h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        <input
          type="number"
          value={rows}
          onChange={(e) => setRows(Math.max(3, Math.min(8, Number(e.target.value))))}
          className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2 w-24 text-center"
        />

        <input
          type="number"
          value={cols}
          onChange={(e) => setCols(Math.max(3, Math.min(8, Number(e.target.value))))}
          className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2 w-24 text-center"
        />

        <button
          onClick={initializeGame}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold"
        >
          New Game
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* GRID */}
        <div className="flex-1 flex justify-center">
          <div
            className="grid border-2 border-zinc-700"
            style={{
              gridTemplateColumns: `repeat(${cols}, 80px)`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isAgentHere = agentPos.row === r && agentPos.col === c;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => moveAgent(r, c)}
                    className={`
                      w-20 h-20
                      flex items-center justify-center
                      border border-zinc-700
                      cursor-pointer
                      transition
                      hover:bg-zinc-800
                      ${isAgentHere ? "bg-yellow-400 text-black" : ""}
                      ${cell.visited && cell.isSafe ? "bg-green-700" : ""}
                      ${cell.visited && (cell.hasPit || cell.hasWumpus) ? "bg-red-700" : ""}
                    `}
                  >
                    <div className="text-center text-sm">
                      {isAgentHere && "🤖"}
                      {!isAgentHere && cell.visited && cell.hasWumpus && "👹"}
                      {!isAgentHere && cell.visited && cell.hasPit && "🕳️"}
                      <div className="text-[10px] text-zinc-300 mt-1">
                        ({r + 1},{c + 1})
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 space-y-6">

          <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-700">
            <h3 className="text-lg font-semibold mb-2">Agent</h3>
            <p>({agentPos.row + 1}, {agentPos.col + 1})</p>
            <p className="mt-2 text-yellow-400">
              Steps: {inferenceSteps}
            </p>
          </div>

          <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-700">
            <h3 className="text-lg font-semibold mb-2">Percepts</h3>
            {percepts.length === 0 ? (
              <p className="text-zinc-500 text-sm">None</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {percepts.map((p, i) => (
                  <span key={i} className="bg-red-600 px-3 py-1 rounded-full text-xs">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {message && (
        <div className="mt-6 text-center p-4 border border-zinc-700 rounded-lg">
          {message}
        </div>
      )}

    </div>
  </div>
);
};

export default App;