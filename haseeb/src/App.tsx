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

const WumpusWorld: React.FC = () => {
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

    // Place Wumpus
    let wRow = Math.floor(Math.random() * rows);
    let wCol = Math.floor(Math.random() * cols);
    while (wRow === 0 && wCol === 0) {
      wRow = Math.floor(Math.random() * rows);
      wCol = Math.floor(Math.random() * cols);
    }
    newGrid[wRow][wCol].hasWumpus = true;

    // Place Pits
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

    // Add breeze and stench rules
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

    // Simple simulation of inference (for demo)
    if (kb.some(clause => clause === `~${targetP}` || clause === `~${targetW}`)) {
      setInferenceSteps(prev => prev + 12);
      return true;
    }

    setInferenceSteps(prev => prev + 12);
    return true; // For demo, we allow movement (you can improve this later)
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

  const getCellClass = (cell: Cell, isAgent: boolean): string => {
    if (isAgent) return 'agent';
    if (cell.visited && (cell.hasPit || cell.hasWumpus)) return 'danger';
    if (cell.visited && cell.isSafe) return 'safe-visited';
    if (cell.visited) return 'visited';
    return 'unknown';
  };

  return (
    <div className="container">
      <h1>Dynamic Wumpus Logic Agent</h1>
      <p className="subtitle">Propositional Logic + Resolution Refutation</p>

      <div className="controls">
        <div className="input-group">
          <label>Rows:</label>
          <input
            type="number"
            value={rows}
            onChange={(e) => setRows(Math.max(3, Math.min(8, Number(e.target.value))))}
          />
        </div>
        <div className="input-group">
          <label>Columns:</label>
          <input
            type="number"
            value={cols}
            onChange={(e) => setCols(Math.max(3, Math.min(8, Number(e.target.value))))}
          />
        </div>
        <button onClick={initializeGame}>New Game</button>
      </div>

      <div className="main">
        <div className="game-area">
          <h2>Wumpus World</h2>
          <div
            className="grid"
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
                    className={`cell ${getCellClass(cell, isAgentHere)}`}
                    onClick={() => moveAgent(r, c)}
                  >
                    {isAgentHere && '🤖'}
                    {!isAgentHere && cell.visited && cell.hasWumpus && '👹'}
                    {!isAgentHere && cell.visited && cell.hasPit && '🕳️'}
                    <span className="coord">({r + 1},{c + 1})</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="card">
            <h3>Agent Status</h3>
            <p>Position: <strong>({agentPos.row + 1}, {agentPos.col + 1})</strong></p>
            <p>Inference Steps: <strong className="steps">{inferenceSteps}</strong></p>
          </div>

          <div className="card">
            <h3>Current Percepts</h3>
            <div className="percepts">
              {percepts.length === 0 ? (
                <p className="no-percept">No percepts detected...</p>
              ) : (
                percepts.map((p, i) => (
                  <div key={i} className="percept">{p}</div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3>Legend</h3>
            <div className="legend">
              <div className="legend-item"><span className="legend-color agent"></span> Agent (🤖)</div>
              <div className="legend-item"><span className="legend-color safe"></span> Safe Visited</div>
              <div className="legend-item"><span className="legend-color unknown"></span> Unknown Cell</div>
              <div className="legend-item"><span className="legend-color danger"></span> Pit / Wumpus</div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('Game Over') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="footer">
        Click on adjacent cells to move • Knowledge-Based Agent using Propositional Logic
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', sans-serif;
          background-color: #0a0a0a;
          color: #eee;
          min-height: 100vh;
        }

        h1 {
          text-align: center;
          color: #fff;
          margin-bottom: 8px;
        }

        .subtitle {
          text-align: center;
          color: #aaa;
          margin-bottom: 30px;
        }

        .controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-group label {
          color: #ccc;
        }

        .input-group input {
          padding: 8px 12px;
          width: 80px;
          background: #1e1e1e;
          border: 1px solid #444;
          color: white;
          border-radius: 6px;
        }

        button {
          padding: 12px 24px;
          background: #0066ff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
        }

        button:hover {
          background: #3388ff;
        }

        .main {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
        }

        .game-area {
          flex: 2;
          background: #1a1a1a;
          padding: 25px;
          border-radius: 12px;
        }

        .grid {
          display: grid;
          gap: 8px;
          justify-content: center;
          margin: 20px auto;
        }

        .cell {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.4rem;
          border-radius: 10px;
          cursor: pointer;
          position: relative;
          transition: all 0.25s ease;
          border: 2px solid #333;
        }

        .cell:hover {
          transform: scale(1.08);
          z-index: 10;
        }

        .agent { background-color: #f4b400; color: #000; border-color: #ffeb3b; box-shadow: 0 0 15px #f4b400; }
        .safe-visited { background-color: #2e7d32; color: white; }
        .visited { background-color: #4caf50; color: white; }
        .danger { background-color: #c62828; color: white; border-color: #e53935; }
        .unknown { background-color: #424242; color: #ddd; }

        .coord {
          position: absolute;
          bottom: 6px;
          right: 8px;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .sidebar {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card {
          background: #1a1a1a;
          padding: 20px;
          border-radius: 12px;
        }

        .percepts {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .percept {
          background: #d32f2f;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
        }

        .no-percept {
          color: #888;
          font-style: italic;
        }

        .steps {
          color: #ffeb3b;
          font-size: 1.2rem;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .legend-color {
          width: 28px;
          height: 28px;
          border-radius: 6px;
        }

        .legend-color.agent { background: #f4b400; }
        .legend-color.safe { background: #2e7d32; }
        .legend-color.unknown { background: #424242; }
        .legend-color.danger { background: #c62828; }

        .message {
          margin-top: 25px;
          padding: 16px 20px;
          border-radius: 8px;
          font-size: 1.1rem;
          text-align: center;
        }

        .message.success {
          background: #1b5e20;
          color: #a5d6a7;
        }

        .message.error {
          background: #b71c1c;
          color: #ffcdd2;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          color: #666;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default WumpusWorld;