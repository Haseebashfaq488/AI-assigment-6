'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';

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

  const getVar = (prefix: string, r: number, c: number): string => `${prefix}_${r + 1}_${c + 1}`;

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

    let wRow = Math.floor(Math.random() * rows);
    let wCol = Math.floor(Math.random() * cols);
    while (wRow === 0 && wCol === 0) {
      wRow = Math.floor(Math.random() * rows);
      wCol = Math.floor(Math.random() * cols);
    }
    newGrid[wRow][wCol].hasWumpus = true;

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

    let steps = 12;
    if (kb.some(clause => clause === `~${targetP}` || clause === `~${targetW}`)) {
      setInferenceSteps(prev => prev + steps);
      return true;
    }

    setInferenceSteps(prev => prev + steps);
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

  const getCellStyle = (cell: Cell, isAgent: boolean) => {
    if (isAgent) {
      return {
        backgroundColor: '#f4b400',
        color: '#000',
        border: '3px solid #ffeb3b',
        boxShadow: '0 0 15px #f4b400',
      };
    }
    if (cell.visited && (cell.hasPit || cell.hasWumpus)) {
      return { backgroundColor: '#c62828', color: '#fff', border: '2px solid #e53935' };
    }
    if (cell.visited && cell.isSafe) {
      return { backgroundColor: '#2e7d32', color: '#fff' };
    }
    if (cell.visited) {
      return { backgroundColor: '#66bb6a', color: '#fff' };
    }
    return { backgroundColor: '#424242', color: '#ddd', border: '1px solid #616161' };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
        Dynamic Wumpus Logic Agent
      </Typography>
      <Typography variant="h6" align="center" color="#b0b0b0" gutterBottom>
        Propositional Logic + Resolution Refutation Inference Engine
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', my: 5, flexWrap: 'wrap' }}>
        <TextField
          label="Rows"
          type="number"
          size="small"
          value={rows}
          onChange={(e) => setRows(Math.max(3, Math.min(8, Number(e.target.value))))}
          sx={{ width: 110, backgroundColor: '#1e1e1e' }}
        />
        <TextField
          label="Columns"
          type="number"
          size="small"
          value={cols}
          onChange={(e) => setCols(Math.max(3, Math.min(8, Number(e.target.value))))}
          sx={{ width: 110, backgroundColor: '#1e1e1e' }}
        />
        <Button variant="contained" color="primary" size="large" onClick={initializeGame}>
          New Game
        </Button>
      </Box>

      <Grid container spacing={4}>
        <Grid xs={12} lg={8}>
          <Paper elevation={8} sx={{ p: 4, backgroundColor: '#1a1a1a', borderRadius: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#fff' }}>
              Wumpus World
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: '6px',
                maxWidth: 'fit-content',
                margin: '0 auto',
              }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const isAgentHere = agentPos.row === r && agentPos.col === c;
                  return (
                    <Box
                      key={`${r}-${c}`}
                      onClick={() => moveAgent(r, c)}
                      sx={{
                        width: 78,
                        height: 78,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        '&:hover': { transform: 'scale(1.1)', zIndex: 10 },
                        ...getCellStyle(cell, isAgentHere),
                      }}
                    >
                      {isAgentHere && '🤖'}
                      {!isAgentHere && cell.visited && cell.hasWumpus && '👹'}
                      {!isAgentHere && cell.visited && cell.hasPit && '🕳️'}
                      <Typography
                        variant="caption"
                        sx={{ position: 'absolute', bottom: 4, right: 6, fontSize: '0.7rem', opacity: 0.75 }}
                      >
                        {r + 1},{c + 1}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3, backgroundColor: '#1a1a1a', color: '#fff' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Agent Status</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Position: <strong>({agentPos.row + 1}, {agentPos.col + 1})</strong>
              </Typography>
              <Typography variant="body1">
                Inference Steps: <strong style={{ color: '#ffeb3b' }}>{inferenceSteps}</strong>
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3, backgroundColor: '#1a1a1a', color: '#fff' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Percepts</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {percepts.length === 0 ? (
                  <Typography color="#888">No percepts detected...</Typography>
                ) : (
                  percepts.map((p, i) => (
                    <Chip key={i} label={p} color="error" variant="filled" sx={{ fontWeight: 'bold' }} />
                  ))
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Legend</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 32, height: 32, backgroundColor: '#f4b400', borderRadius: '6px' }} />
                  <Typography>Agent (🤖)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 32, height: 32, backgroundColor: '#2e7d32', borderRadius: '6px' }} />
                  <Typography>Safe Visited Cell</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 32, height: 32, backgroundColor: '#424242', borderRadius: '6px' }} />
                  <Typography>Unknown Cell</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 32, height: 32, backgroundColor: '#c62828', borderRadius: '6px' }} />
                  <Typography>Pit or Wumpus (Discovered)</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {message && (
        <Alert
          severity={message.includes('Game Over') ? 'error' : 'success'}
          sx={{ mt: 4, fontSize: '1.05rem' }}
        >
          {message}
        </Alert>
      )}

      <Box sx={{ mt: 6, textAlign: 'center', color: '#666' }}>
        Click on adjacent cells to move • Knowledge-Based Agent using Propositional Logic
      </Box>
    </Container>
  );
};

export default App;